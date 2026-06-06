const express = require('express');
const pool = require('../database/connection');
const { auth, requireRoles } = require('../middlewares/auth');
const ExcelJS = require('exceljs');

const router = express.Router();

router.use(auth);

router.get('/trail/donation/:donationId', async (req, res) => {
  try {
    const { donationId } = req.params;

    const [donations] = await pool.execute(
      `SELECT d.*, do.name as donor_name, do.type as donor_type, p.name as project_name
       FROM donations d
       LEFT JOIN donors do ON d.donor_id = do.id
       LEFT JOIN projects p ON d.project_id = p.id
       WHERE d.id = ?`,
      [donationId]
    );

    if (donations.length === 0) {
      return res.status(404).json({ message: '捐赠记录不存在' });
    }

    const donation = donations[0];

    let projectId = donation.project_id;
    let allocations = [];
    let expenditures = [];

    if (donation.status === 'received') {
      if (projectId) {
        const [allocs] = await pool.execute(
          `SELECT fa.*, p.name as project_name, u.real_name as creator_name
           FROM fund_allocations fa
           LEFT JOIN projects p ON fa.project_id = p.id
           LEFT JOIN users u ON fa.created_by = u.id
           WHERE fa.project_id = ? AND fa.source_pool = 'designated'
           ORDER BY fa.created_at ASC`,
          [projectId]
        );
        allocations = allocs;

        const [exps] = await pool.execute(
          `SELECT e.*, p.name as project_name, b.name as beneficiary_name, u.real_name as creator_name
           FROM expenditures e
           LEFT JOIN projects p ON e.project_id = p.id
           LEFT JOIN beneficiaries b ON e.beneficiary_id = b.id
           LEFT JOIN users u ON e.created_by = u.id
           WHERE e.project_id = ?
           ORDER BY e.expenditure_date ASC`,
          [projectId]
        );
        expenditures = exps;
      } else {
        const [allocs] = await pool.execute(
          `SELECT fa.*, p.name as project_name, u.real_name as creator_name
           FROM fund_allocations fa
           LEFT JOIN projects p ON fa.project_id = p.id
           LEFT JOIN users u ON fa.created_by = u.id
           WHERE fa.source_pool = 'general'
           ORDER BY fa.created_at ASC`
        );
        allocations = allocs;

        const projectIds = [...new Set(allocs.map(a => a.project_id))];
        if (projectIds.length > 0) {
          const placeholders = projectIds.map(() => '?').join(',');
          const [exps] = await pool.execute(
            `SELECT e.*, p.name as project_name, b.name as beneficiary_name, u.real_name as creator_name
             FROM expenditures e
             LEFT JOIN projects p ON e.project_id = p.id
             LEFT JOIN beneficiaries b ON e.beneficiary_id = b.id
             LEFT JOIN users u ON e.created_by = u.id
             WHERE e.project_id IN (${placeholders})
             ORDER BY e.expenditure_date ASC`,
            projectIds
          );
          expenditures = exps;
        }
      }
    }

    res.json({
      donation,
      allocations,
      expenditures
    });
  } catch (error) {
    console.error('追溯捐赠流向错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

router.get('/trail/beneficiary/:beneficiaryId', async (req, res) => {
  try {
    const { beneficiaryId } = req.params;

    const [beneficiaries] = await pool.execute(
      'SELECT * FROM beneficiaries WHERE id = ?',
      [beneficiaryId]
    );

    if (beneficiaries.length === 0) {
      return res.status(404).json({ message: '受助人不存在' });
    }

    const beneficiary = beneficiaries[0];

    const [expenditures] = await pool.execute(
      `SELECT e.*, p.name as project_name, u.real_name as creator_name
       FROM expenditures e
       LEFT JOIN projects p ON e.project_id = p.id
       LEFT JOIN users u ON e.created_by = u.id
       WHERE e.beneficiary_id = ?
       ORDER BY e.expenditure_date DESC`,
      [beneficiaryId]
    );

    const projectIds = [...new Set(expenditures.map(e => e.project_id))];

    let relatedDonations = [];
    if (projectIds.length > 0) {
      const placeholders = projectIds.map(() => '?').join(',');
      const [donations] = await pool.execute(
        `SELECT DISTINCT d.*, do.name as donor_name, p.name as project_name
         FROM donations d
         LEFT JOIN donors do ON d.donor_id = do.id
         LEFT JOIN projects p ON d.project_id = p.id
         WHERE d.status = 'received' AND (d.project_id IN (${placeholders}) OR d.donation_type = 'undesignated')
         ORDER BY d.donation_date DESC`,
        projectIds
      );
      relatedDonations = donations;
    }

    res.json({
      beneficiary,
      expenditures,
      relatedDonations
    });
  } catch (error) {
    console.error('追溯受助人资金来源错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

router.get('/flows/all', requireRoles('admin', 'finance'), async (req, res) => {
  try {
    const { startDate, endDate, poolId, flowType, direction } = req.query;

    let sql = `
      SELECT ff.*, fp.name as pool_name, fp.pool_type, p.name as project_name
      FROM fund_flows ff
      LEFT JOIN fund_pools fp ON ff.pool_id = fp.id
      LEFT JOIN projects p ON fp.project_id = p.id
      WHERE 1=1
    `;
    const params = [];

    if (startDate) { sql += ' AND ff.created_at >= ?'; params.push(startDate); }
    if (endDate) { sql += ' AND ff.created_at <= ?'; params.push(endDate); }
    if (poolId) { sql += ' AND ff.pool_id = ?'; params.push(poolId); }
    if (flowType) { sql += ' AND ff.flow_type = ?'; params.push(flowType); }
    if (direction) { sql += ' AND ff.direction = ?'; params.push(direction); }

    sql += ' ORDER BY ff.created_at DESC';

    const [flows] = await pool.execute(sql, params);
    res.json(flows);
  } catch (error) {
    console.error('获取所有资金流水错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

router.get('/operation-logs', requireRoles('admin'), async (req, res) => {
  try {
    const { startDate, endDate, userId, module } = req.query;

    let sql = `
      SELECT ol.*, u.real_name as user_name, u.username
      FROM operation_logs ol
      LEFT JOIN users u ON ol.user_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (startDate) { sql += ' AND ol.created_at >= ?'; params.push(startDate); }
    if (endDate) { sql += ' AND ol.created_at <= ?'; params.push(endDate); }
    if (userId) { sql += ' AND ol.user_id = ?'; params.push(userId); }
    if (module) { sql += ' AND ol.module = ?'; params.push(module); }

    sql += ' ORDER BY ol.created_at DESC LIMIT 500';

    const [logs] = await pool.execute(sql, params);
    res.json(logs);
  } catch (error) {
    console.error('获取操作日志错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

router.get('/reports/project/:projectId/export', requireRoles('admin', 'finance'), async (req, res) => {
  try {
    const { projectId } = req.params;

    const [projects] = await pool.execute(
      'SELECT * FROM projects WHERE id = ?',
      [projectId]
    );

    if (projects.length === 0) {
      return res.status(404).json({ message: '项目不存在' });
    }

    const project = projects[0];

    const [allocations] = await pool.execute(
      `SELECT fa.*, u.real_name as creator_name
       FROM fund_allocations fa
       LEFT JOIN users u ON fa.created_by = u.id
       WHERE fa.project_id = ?
       ORDER BY fa.created_at ASC`,
      [projectId]
    );

    const [expenditures] = await pool.execute(
      `SELECT e.*, b.name as beneficiary_name, u.real_name as creator_name
       FROM expenditures e
       LEFT JOIN beneficiaries b ON e.beneficiary_id = b.id
       LEFT JOIN users u ON e.created_by = u.id
       WHERE e.project_id = ?
       ORDER BY e.expenditure_date ASC`,
      [projectId]
    );

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('项目财务报告');

    worksheet.columns = [
      { header: '项目名称', key: 'project_name', width: 30 },
      { header: project.name, key: 'value', width: 40 }
    ];

    worksheet.addRow({ project_name: '项目类别', value: project.category });
    worksheet.addRow({ project_name: '总预算', value: project.total_budget });
    worksheet.addRow({ project_name: '已拨付', value: project.allocated_amount });
    worksheet.addRow({ project_name: '已使用', value: project.spent_amount });
    worksheet.addRow({ project_name: '剩余预算', value: project.remaining_budget });
    worksheet.addRow({ project_name: '项目状态', value: project.status });
    worksheet.addRow({});
    worksheet.addRow({ project_name: '=== 拨付明细 ===', value: '' });
    worksheet.addRow({ project_name: '日期', value: '金额 / 来源' });

    allocations.forEach(alloc => {
      const dateStr = alloc.created_at ? String(alloc.created_at).split('T')[0] : '';
      worksheet.addRow({
        project_name: dateStr,
        value: `${alloc.amount}元 (${alloc.source_pool === 'general' ? '总池' : '定向'})`
      });
    });

    worksheet.addRow({});
    worksheet.addRow({ project_name: '=== 支出明细 ===', value: '' });
    worksheet.addRow({ project_name: '日期 / 受助人', value: '金额 / 用途' });

    expenditures.forEach(exp => {
      worksheet.addRow({
        project_name: `${exp.expenditure_date || ''} ${exp.beneficiary_name || ''}`,
        value: `${exp.amount}元 - ${exp.purpose || ''}`
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=project_${projectId}_report.xlsx`);
    res.send(buffer);
  } catch (error) {
    console.error('导出项目报告错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

router.get('/statistics/summary', async (req, res) => {
  try {
    const [[donationStats]] = await pool.execute(`
      SELECT 
        COUNT(*) as total_donations,
        COALESCE(SUM(CASE WHEN status = 'received' THEN amount ELSE 0 END), 0) as total_received,
        COALESCE(SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END), 0) as total_pending
      FROM donations
    `);

    const [[projectStats]] = await pool.execute(`
      SELECT 
        COUNT(*) as total_projects,
        COALESCE(SUM(allocated_amount), 0) as total_allocated,
        COALESCE(SUM(spent_amount), 0) as total_spent
      FROM projects
    `);

    const [[poolStats]] = await pool.execute(`
      SELECT COALESCE(SUM(balance), 0) as total_balance
      FROM fund_pools
    `);

    const [recentFlows] = await pool.execute(`
      SELECT ff.*, fp.name as pool_name
      FROM fund_flows ff
      LEFT JOIN fund_pools fp ON ff.pool_id = fp.id
      ORDER BY ff.created_at DESC LIMIT 10
    `);

    res.json({
      donationStats,
      projectStats,
      poolStats,
      recentFlows
    });
  } catch (error) {
    console.error('获取统计数据错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

module.exports = router;
