const express = require('express');
const pool = require('../database/connection');
const { auth, requireRoles } = require('../middlewares/auth');
const { createPoolIfNotExists, getPoolBalance, getGeneralPoolId, getProjectPoolId, updatePoolBalance, recordFlow } = require('../utils/fundPool');

const router = express.Router();

router.use(auth);

router.get('/', async (req, res) => {
  try {
    const { status, category } = req.query;
    let sql = `
      SELECT p.*, u.real_name as manager_name,
             (SELECT COALESCE(SUM(amount), 0) FROM donations WHERE project_id = p.id AND status = 'received' AND donation_type = 'designated') as designated_fund
      FROM projects p
      LEFT JOIN users u ON p.project_manager_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (status) { sql += ' AND p.status = ?'; params.push(status); }
    if (category) { sql += ' AND p.category = ?'; params.push(category); }

    if (req.user.role === 'project_manager') {
      sql += ' AND p.project_manager_id = ?';
      params.push(req.user.id);
    }

    sql += ' ORDER BY p.created_at DESC';

    const [projects] = await pool.execute(sql, params);
    res.json(projects);
  } catch (error) {
    console.error('获取项目列表错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const [projects] = await pool.execute(
      `SELECT p.*, u.real_name as manager_name
       FROM projects p
       LEFT JOIN users u ON p.project_manager_id = u.id
       WHERE p.id = ?`,
      [id]
    );

    if (projects.length === 0) {
      return res.status(404).json({ message: '项目不存在' });
    }

    const project = projects[0];

    if (req.user.role === 'project_manager' && project.project_manager_id !== req.user.id) {
      return res.status(403).json({ message: '无权限查看该项目' });
    }

    res.json(project);
  } catch (error) {
    console.error('获取项目详情错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

router.post('/', requireRoles('admin'), async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const { name, description, category, total_budget, project_manager_id, start_date, end_date } = req.body;

    if (!name || !category || !total_budget) {
      await conn.rollback();
      return res.status(400).json({ message: '缺少必要参数' });
    }

    const [result] = await conn.execute(
      `INSERT INTO projects (name, description, category, total_budget, project_manager_id, start_date, end_date, remaining_budget)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [name, description || null, category, total_budget, project_manager_id || null, start_date || null, end_date || null, total_budget]
    );

    const projectId = result.insertId;

    await createPoolIfNotExists('project', projectId, `${name}专项池`, conn);

    await conn.commit();
    res.json({ id: projectId, message: '项目创建成功' });
  } catch (error) {
    await conn.rollback();
    console.error('创建项目错误:', error);
    res.status(500).json({ message: '服务器错误' });
  } finally {
    conn.release();
  }
});

router.put('/:id', requireRoles('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, category, total_budget, project_manager_id, status, start_date, end_date } = req.body;

    await pool.execute(
      `UPDATE projects SET name = ?, description = ?, category = ?, total_budget = ?, 
                          project_manager_id = ?, status = ?, start_date = ?, end_date = ?
       WHERE id = ?`,
      [name, description || null, category, total_budget, project_manager_id || null, status || 'active', start_date || null, end_date || null, id]
    );

    res.json({ message: '项目更新成功' });
  } catch (error) {
    console.error('更新项目错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

router.get('/:id/allocations', async (req, res) => {
  try {
    const { id } = req.params;
    const [allocations] = await pool.execute(
      `SELECT fa.*, u.real_name as creator_name
       FROM fund_allocations fa
       LEFT JOIN users u ON fa.created_by = u.id
       WHERE fa.project_id = ?
       ORDER BY fa.created_at DESC`,
      [id]
    );
    res.json(allocations);
  } catch (error) {
    console.error('获取项目拨付记录错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

router.post('/allocations/apply', requireRoles('admin', 'project_manager'), async (req, res) => {
  try {
    const { project_id, amount, source_pool, purpose } = req.body;

    if (!project_id || !amount || !source_pool) {
      return res.status(400).json({ message: '缺少必要参数' });
    }

    if (req.user.role === 'project_manager') {
      const [projects] = await pool.execute(
        'SELECT id FROM projects WHERE id = ? AND project_manager_id = ?',
        [project_id, req.user.id]
      );
      if (projects.length === 0) {
        return res.status(403).json({ message: '无权限申请该项目的拨付' });
      }
    }

    let availableAmount = 0;
    if (source_pool === 'general') {
      const generalPoolId = await getGeneralPoolId();
      if (generalPoolId) {
        availableAmount = await getPoolBalance(generalPoolId);
      }
    } else {
      const projectPoolId = await getProjectPoolId(project_id);
      if (projectPoolId) {
        availableAmount = await getPoolBalance(projectPoolId);
      }
    }

    if (parseFloat(amount) > availableAmount) {
      return res.status(400).json({ message: `可用余额不足，当前可用: ${availableAmount.toFixed(2)}元` });
    }

    const [result] = await pool.execute(
      `INSERT INTO allocation_applications (project_id, amount, source_pool, purpose, applicant_id, status)
       VALUES (?, ?, ?, ?, ?, 'pending_finance')`,
      [project_id, amount, source_pool, purpose || null, req.user.id]
    );

    res.json({ id: result.insertId, message: '拨付申请已提交' });
  } catch (error) {
    console.error('提交拨付申请错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

router.get('/allocations/applications', async (req, res) => {
  try {
    const { status, project_id } = req.query;
    let sql = `
      SELECT aa.*, p.name as project_name, 
             u1.real_name as applicant_name,
             u2.real_name as finance_reviewer_name,
             u3.real_name as admin_approver_name
      FROM allocation_applications aa
      LEFT JOIN projects p ON aa.project_id = p.id
      LEFT JOIN users u1 ON aa.applicant_id = u1.id
      LEFT JOIN users u2 ON aa.finance_reviewed_by = u2.id
      LEFT JOIN users u3 ON aa.admin_approved_by = u3.id
      WHERE 1=1
    `;
    const params = [];

    if (status) { sql += ' AND aa.status = ?'; params.push(status); }
    if (project_id) { sql += ' AND aa.project_id = ?'; params.push(project_id); }

    if (req.user.role === 'project_manager') {
      sql += ' AND aa.applicant_id = ?';
      params.push(req.user.id);
    }

    sql += ' ORDER BY aa.created_at DESC';

    const [applications] = await pool.execute(sql, params);
    res.json(applications);
  } catch (error) {
    console.error('获取拨付申请列表错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

router.post('/allocations/applications/:id/finance-review', requireRoles('finance', 'admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { approved, comment } = req.body;

    const [applications] = await pool.execute(
      "SELECT * FROM allocation_applications WHERE id = ? AND status = 'pending_finance'",
      [id]
    );

    if (applications.length === 0) {
      return res.status(400).json({ message: '申请不存在或状态不正确' });
    }

    const newStatus = approved ? 'pending_admin' : 'rejected';

    await pool.execute(
      `UPDATE allocation_applications 
       SET status = ?, finance_reviewed_by = ?, finance_review_comment = ?, finance_reviewed_at = NOW()
       WHERE id = ?`,
      [newStatus, req.user.id, comment || null, id]
    );

    res.json({ message: approved ? '财务复核通过' : '财务复核已驳回' });
  } catch (error) {
    console.error('财务复核错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

router.post('/allocations/applications/:id/admin-approve', requireRoles('admin'), async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const { id } = req.params;
    const { approved, comment } = req.body;

    const [applications] = await conn.execute(
      "SELECT * FROM allocation_applications WHERE id = ? AND status = 'pending_admin' FOR UPDATE",
      [id]
    );

    if (applications.length === 0) {
      await conn.rollback();
      return res.status(400).json({ message: '申请不存在或状态不正确' });
    }

    const application = applications[0];

    if (!approved) {
      await conn.execute(
        `UPDATE allocation_applications 
         SET status = 'rejected', admin_approved_by = ?, admin_approval_comment = ?, admin_approved_at = NOW()
         WHERE id = ?`,
        [req.user.id, comment || null, id]
      );
      await conn.commit();
      return res.json({ message: '申请已驳回' });
    }

    let sourcePoolId;
    if (application.source_pool === 'general') {
      sourcePoolId = await getGeneralPoolId(conn);
    } else {
      sourcePoolId = await getProjectPoolId(application.project_id, conn);
    }

    if (!sourcePoolId) {
      await conn.rollback();
      return res.status(400).json({ message: '资金池不存在' });
    }

    const sourceBalance = await getPoolBalance(sourcePoolId, conn);
    if (sourceBalance < parseFloat(application.amount)) {
      await conn.rollback();
      return res.status(400).json({ message: '资金池余额不足' });
    }

    const newSourceBalance = await updatePoolBalance(sourcePoolId, -parseFloat(application.amount), conn);
    await recordFlow(
      'allocation_out', application.amount, 'out', sourcePoolId,
      'allocation_application', application.id, newSourceBalance,
      `拨付至项目`,
      conn
    );

    const projectPoolId = await getProjectPoolId(application.project_id, conn);
    if (!projectPoolId) {
      await conn.rollback();
      return res.status(400).json({ message: '项目资金池不存在' });
    }

    const newProjectBalance = await updatePoolBalance(projectPoolId, parseFloat(application.amount), conn);
    await recordFlow(
      'allocation_in', application.amount, 'in', projectPoolId,
      'allocation_application', application.id, newProjectBalance,
      `项目拨款入账`,
      conn
    );

    const [allocResult] = await conn.execute(
      `INSERT INTO fund_allocations (application_id, project_id, amount, source_pool, remark, created_by)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [application.id, application.project_id, application.amount, application.source_pool, comment || null, req.user.id]
    );

    await conn.execute(
      `UPDATE projects 
       SET allocated_amount = allocated_amount + ?, remaining_budget = remaining_budget - ?
       WHERE id = ?`,
      [application.amount, application.amount, application.project_id]
    );

    await conn.execute(
      `UPDATE allocation_applications 
       SET status = 'approved', admin_approved_by = ?, admin_approval_comment = ?, admin_approved_at = NOW()
       WHERE id = ?`,
      [req.user.id, comment || null, id]
    );

    await conn.commit();
    res.json({ message: '拨付已批准，资金已划转' });
  } catch (error) {
    await conn.rollback();
    console.error('审批拨付错误:', error);
    res.status(500).json({ message: '服务器错误' });
  } finally {
    conn.release();
  }
});

module.exports = router;
