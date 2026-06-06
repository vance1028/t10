const express = require('express');
const pool = require('../database/connection');
const { auth, requireRoles } = require('../middlewares/auth');
const { createPoolIfNotExists, getPoolBalance, updatePoolBalance, recordFlow, getGeneralPoolId, getProjectPoolId } = require('../utils/fundPool');

const router = express.Router();

router.use(auth);

router.get('/', async (req, res) => {
  try {
    const { donorId, projectId, status, type, startDate, endDate } = req.query;
    
    let sql = `
      SELECT d.*, do.name as donor_name, do.type as donor_type, 
             p.name as project_name, u.real_name as creator_name
      FROM donations d
      LEFT JOIN donors do ON d.donor_id = do.id
      LEFT JOIN projects p ON d.project_id = p.id
      LEFT JOIN users u ON d.created_by = u.id
      WHERE 1=1
    `;
    const params = [];

    if (donorId) { sql += ' AND d.donor_id = ?'; params.push(donorId); }
    if (projectId) { sql += ' AND d.project_id = ?'; params.push(projectId); }
    if (status) { sql += ' AND d.status = ?'; params.push(status); }
    if (type) { sql += ' AND d.donation_type = ?'; params.push(type); }
    if (startDate) { sql += ' AND d.donation_date >= ?'; params.push(startDate); }
    if (endDate) { sql += ' AND d.donation_date <= ?'; params.push(endDate); }

    if (req.user.role === 'project_manager') {
      sql += ' AND (d.project_id IN (SELECT id FROM projects WHERE project_manager_id = ?) OR d.project_id IS NULL)';
      params.push(req.user.id);
    }

    sql += ' ORDER BY d.created_at DESC';

    const [donations] = await pool.execute(sql, params);
    res.json(donations);
  } catch (error) {
    console.error('获取捐赠列表错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const [donations] = await pool.execute(
      `SELECT d.*, do.name as donor_name, do.type as donor_type, do.contact_person, do.phone as donor_phone,
              p.name as project_name, u.real_name as creator_name
       FROM donations d
       LEFT JOIN donors do ON d.donor_id = do.id
       LEFT JOIN projects p ON d.project_id = p.id
       LEFT JOIN users u ON d.created_by = u.id
       WHERE d.id = ?`,
      [id]
    );

    if (donations.length === 0) {
      return res.status(404).json({ message: '捐赠记录不存在' });
    }

    res.json(donations[0]);
  } catch (error) {
    console.error('获取捐赠详情错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

router.post('/', requireRoles('admin', 'finance'), async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const {
      donor_id, amount, donation_date, donation_type, project_id,
      payment_method, receipt_no, remark
    } = req.body;

    if (!donor_id || !amount || !donation_date || !donation_type) {
      await conn.rollback();
      return res.status(400).json({ message: '缺少必要参数' });
    }

    if (donation_type === 'designated' && !project_id) {
      await conn.rollback();
      return res.status(400).json({ message: '定向捐赠必须指定项目' });
    }

    const [result] = await conn.execute(
      `INSERT INTO donations (donor_id, amount, donation_date, donation_type, project_id, payment_method, receipt_no, status, created_by, remark)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)`,
      [donor_id, amount, donation_date, donation_type, project_id || null, payment_method || null, receipt_no || null, req.user.id, remark || null]
    );

    await conn.commit();
    res.json({ id: result.insertId, message: '捐赠记录创建成功' });
  } catch (error) {
    await conn.rollback();
    console.error('创建捐赠记录错误:', error);
    res.status(500).json({ message: '服务器错误' });
  } finally {
    conn.release();
  }
});

router.post('/:id/confirm', requireRoles('admin', 'finance'), async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const { id } = req.params;
    const { received_date } = req.body;

    const [donations] = await conn.execute(
      'SELECT * FROM donations WHERE id = ? FOR UPDATE',
      [id]
    );

    if (donations.length === 0) {
      await conn.rollback();
      return res.status(404).json({ message: '捐赠记录不存在' });
    }

    const donation = donations[0];
    if (donation.status === 'received') {
      await conn.rollback();
      return res.status(400).json({ message: '该捐赠已确认到账' });
    }

    let poolId;
    let poolName;

    if (donation.donation_type === 'designated') {
      poolId = await createPoolIfNotExists('project', donation.project_id, `项目专项池-${donation.project_id}`, conn);
      const [projects] = await conn.execute('SELECT name FROM projects WHERE id = ?', [donation.project_id]);
      poolName = projects[0] ? `${projects[0].name}专项池` : '项目专项池';
    } else {
      poolId = await createPoolIfNotExists('general', null, '基金会总池', conn);
      poolName = '基金会总池';
    }

    const currentBalance = await getPoolBalance(poolId, conn);
    const newBalance = await updatePoolBalance(poolId, parseFloat(donation.amount), conn);

    await recordFlow(
      'donation_in', donation.amount, 'in', poolId,
      'donation', donation.id, newBalance,
      `${donation.donation_type === 'designated' ? '定向' : '非定向'}捐赠入账`,
      conn
    );

    await conn.execute(
      "UPDATE donations SET status = 'received', received_date = ? WHERE id = ?",
      [received_date || new Date(), id]
    );

    await conn.commit();
    res.json({ message: '捐赠确认到账成功' });
  } catch (error) {
    await conn.rollback();
    console.error('确认捐赠到账错误:', error);
    res.status(500).json({ message: '服务器错误' });
  } finally {
    conn.release();
  }
});

router.get('/donors/list', async (req, res) => {
  try {
    const { keyword } = req.query;
    let sql = 'SELECT * FROM donors WHERE 1=1';
    const params = [];

    if (keyword) {
      sql += ' AND name LIKE ?';
      params.push(`%${keyword}%`);
    }

    sql += ' ORDER BY created_at DESC';

    const [donors] = await pool.execute(sql, params);
    res.json(donors);
  } catch (error) {
    console.error('获取捐赠人列表错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

router.post('/donors', requireRoles('admin', 'finance'), async (req, res) => {
  try {
    const { name, type, contact_person, phone, email, address } = req.body;

    if (!name || !type) {
      return res.status(400).json({ message: '缺少必要参数' });
    }

    const [result] = await pool.execute(
      'INSERT INTO donors (name, type, contact_person, phone, email, address) VALUES (?, ?, ?, ?, ?, ?)',
      [name, type, contact_person || null, phone || null, email || null, address || null]
    );

    res.json({ id: result.insertId, message: '捐赠人创建成功' });
  } catch (error) {
    console.error('创建捐赠人错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

module.exports = router;
