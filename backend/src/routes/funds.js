const express = require('express');
const pool = require('../database/connection');
const { auth, requireRoles } = require('../middlewares/auth');
const { getProjectPoolId, getPoolBalance, updatePoolBalance, recordFlow } = require('../utils/fundPool');

const router = express.Router();

router.use(auth);

router.get('/pools', async (req, res) => {
  try {
    const [pools] = await pool.execute(`
      SELECT fp.*, p.name as project_name
      FROM fund_pools fp
      LEFT JOIN projects p ON fp.project_id = p.id
      ORDER BY fp.pool_type, fp.id
    `);
    res.json(pools);
  } catch (error) {
    console.error('获取资金池列表错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

router.get('/pools/:id/flows', async (req, res) => {
  try {
    const { id } = req.params;
    const { startDate, endDate, flowType } = req.query;

    let sql = 'SELECT * FROM fund_flows WHERE pool_id = ?';
    const params = [id];

    if (startDate) { sql += ' AND created_at >= ?'; params.push(startDate); }
    if (endDate) { sql += ' AND created_at <= ?'; params.push(endDate); }
    if (flowType) { sql += ' AND flow_type = ?'; params.push(flowType); }

    sql += ' ORDER BY created_at DESC';

    const [flows] = await pool.execute(sql, params);
    res.json(flows);
  } catch (error) {
    console.error('获取资金流水错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

router.get('/beneficiaries', async (req, res) => {
  try {
    const { keyword } = req.query;
    let sql = 'SELECT * FROM beneficiaries WHERE 1=1';
    const params = [];

    if (keyword) {
      sql += ' AND (name LIKE ? OR id_card LIKE ? OR phone LIKE ?)';
      params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
    }

    sql += ' ORDER BY created_at DESC';

    const [beneficiaries] = await pool.execute(sql, params);
    res.json(beneficiaries);
  } catch (error) {
    console.error('获取受助人列表错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

router.post('/beneficiaries', requireRoles('admin', 'project_manager', 'finance'), async (req, res) => {
  try {
    const { name, id_card, phone, address, category, description } = req.body;

    if (!name) {
      return res.status(400).json({ message: '缺少必要参数' });
    }

    const [result] = await pool.execute(
      'INSERT INTO beneficiaries (name, id_card, phone, address, category, description) VALUES (?, ?, ?, ?, ?, ?)',
      [name, id_card || null, phone || null, address || null, category || null, description || null]
    );

    res.json({ id: result.insertId, message: '受助人创建成功' });
  } catch (error) {
    console.error('创建受助人错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

router.get('/expenditures', async (req, res) => {
  try {
    const { projectId, beneficiaryId, startDate, endDate } = req.query;

    let sql = `
      SELECT e.*, p.name as project_name, b.name as beneficiary_name,
             u.real_name as creator_name
      FROM expenditures e
      LEFT JOIN projects p ON e.project_id = p.id
      LEFT JOIN beneficiaries b ON e.beneficiary_id = b.id
      LEFT JOIN users u ON e.created_by = u.id
      WHERE 1=1
    `;
    const params = [];

    if (projectId) { sql += ' AND e.project_id = ?'; params.push(projectId); }
    if (beneficiaryId) { sql += ' AND e.beneficiary_id = ?'; params.push(beneficiaryId); }
    if (startDate) { sql += ' AND e.expenditure_date >= ?'; params.push(startDate); }
    if (endDate) { sql += ' AND e.expenditure_date <= ?'; params.push(endDate); }

    if (req.user.role === 'project_manager') {
      sql += ' AND e.project_id IN (SELECT id FROM projects WHERE project_manager_id = ?)';
      params.push(req.user.id);
    }

    sql += ' ORDER BY e.created_at DESC';

    const [expenditures] = await pool.execute(sql, params);
    res.json(expenditures);
  } catch (error) {
    console.error('获取支出列表错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

router.post('/expenditures', requireRoles('admin', 'project_manager', 'finance'), async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const { project_id, beneficiary_id, amount, purpose, voucher_no, expenditure_date } = req.body;

    if (!project_id || !amount || !purpose || !expenditure_date) {
      await conn.rollback();
      return res.status(400).json({ message: '缺少必要参数' });
    }

    if (req.user.role === 'project_manager') {
      const [projects] = await conn.execute(
        'SELECT id FROM projects WHERE id = ? AND project_manager_id = ?',
        [project_id, req.user.id]
      );
      if (projects.length === 0) {
        await conn.rollback();
        return res.status(403).json({ message: '无权限登记该项目的支出' });
      }
    }

    const [projects] = await conn.execute(
      'SELECT allocated_amount, spent_amount FROM projects WHERE id = ? FOR UPDATE',
      [project_id]
    );

    if (projects.length === 0) {
      await conn.rollback();
      return res.status(404).json({ message: '项目不存在' });
    }

    const project = projects[0];
    const available = parseFloat(project.allocated_amount) - parseFloat(project.spent_amount);

    if (parseFloat(amount) > available) {
      await conn.rollback();
      return res.status(400).json({ message: `项目可用额度不足，当前可用: ${available.toFixed(2)}元` });
    }

    const projectPoolId = await getProjectPoolId(project_id, conn);
    if (!projectPoolId) {
      await conn.rollback();
      return res.status(400).json({ message: '项目资金池不存在' });
    }

    const poolBalance = await getPoolBalance(projectPoolId, conn);
    if (poolBalance < parseFloat(amount)) {
      await conn.rollback();
      return res.status(400).json({ message: '项目资金池余额不足' });
    }

    const newPoolBalance = await updatePoolBalance(projectPoolId, -parseFloat(amount), conn);
    await recordFlow(
      'expenditure', amount, 'out', projectPoolId,
      'expenditure', null, newPoolBalance,
      purpose,
      conn
    );

    const [result] = await conn.execute(
      `INSERT INTO expenditures (project_id, beneficiary_id, amount, purpose, voucher_no, expenditure_date, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [project_id, beneficiary_id || null, amount, purpose, voucher_no || null, expenditure_date, req.user.id]
    );

    const expenditureId = result.insertId;

    await conn.execute(
      'UPDATE fund_flows SET related_id = ? WHERE flow_type = ? AND related_type = ? ORDER BY id DESC LIMIT 1',
      [expenditureId, 'expenditure', 'expenditure']
    );

    await conn.execute(
      'UPDATE projects SET spent_amount = spent_amount + ? WHERE id = ?',
      [amount, project_id]
    );

    await conn.commit();
    res.json({ id: expenditureId, message: '支出登记成功' });
  } catch (error) {
    await conn.rollback();
    console.error('登记支出错误:', error);
    res.status(500).json({ message: '服务器错误' });
  } finally {
    conn.release();
  }
});

module.exports = router;
