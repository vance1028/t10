const bcrypt = require('bcryptjs');
const pool = require('../database/connection');

const seed = async () => {
  try {
    console.log('开始填充种子数据...');

    const hashedPassword = await bcrypt.hash('123456', 10);

    await pool.execute('DELETE FROM operation_logs');
    await pool.execute('DELETE FROM fund_flows');
    await pool.execute('DELETE FROM donation_trails');
    await pool.execute('DELETE FROM expenditures');
    await pool.execute('DELETE FROM beneficiaries');
    await pool.execute('DELETE FROM fund_allocations');
    await pool.execute('DELETE FROM allocation_applications');
    await pool.execute('DELETE FROM fund_pools');
    await pool.execute('DELETE FROM donations');
    await pool.execute('DELETE FROM donors');
    await pool.execute('DELETE FROM projects');
    await pool.execute('DELETE FROM users');

    console.log('清空旧数据完成');

    const [userResult] = await pool.execute(
      `INSERT INTO users (username, password, real_name, role, email, phone) VALUES 
       (?, ?, '系统管理员', 'admin', 'admin@charity.org', '13800000001'),
       (?, ?, '李助学', 'project_manager', 'lixue@charity.org', '13800000002'),
       (?, ?, '王大病', 'project_manager', 'wangdb@charity.org', '13800000003'),
       (?, ?, '张财务', 'finance', 'zhangcw@charity.org', '13800000004')`,
      ['admin', hashedPassword, 'lixue', hashedPassword, 'wangdb', hashedPassword, 'zhangcw', hashedPassword]
    );

    const adminId = userResult.insertId;
    const lixueId = userResult.insertId + 1;
    const wangdbId = userResult.insertId + 2;
    const zhangcwId = userResult.insertId + 3;
    console.log('用户数据填充完成');

    const [projectResult] = await pool.execute(
      `INSERT INTO projects (name, description, category, total_budget, allocated_amount, spent_amount, remaining_budget, project_manager_id, status, start_date) VALUES 
       ('山区助学计划', '为偏远山区儿童提供学费、书本费和生活补助，帮助他们完成学业', 'education', 500000.00, 158000.00, 125000.00, 342000.00, ?, 'active', '2024-01-01'),
       ('大病儿童救助', '为贫困家庭的大病儿童提供医疗费用援助', 'medical', 800000.00, 302000.00, 210000.00, 498000.00, ?, 'active', '2024-02-01'),
       ('社区养老服务', '为社区独居老人提供日间照料、送餐、健康检查等服务', 'elderly', 300000.00, 0.00, 0.00, 300000.00, ?, 'active', '2024-03-01')`,
      [lixueId, wangdbId, lixueId]
    );

    const project1Id = projectResult.insertId;
    const project2Id = projectResult.insertId + 1;
    const project3Id = projectResult.insertId + 2;
    console.log('项目数据填充完成');

    const [donorResult] = await pool.execute(
      `INSERT INTO donors (name, type, contact_person, phone, email, address) VALUES 
       ('张三', 'individual', '张三', '13900000001', 'zhangsan@example.com', '北京市朝阳区'),
       ('爱心企业A有限公司', 'enterprise', '李经理', '13900000002', 'contact@companya.com', '上海市浦东新区'),
       ('李四', 'individual', '李四', '13900000003', 'lisi@example.com', '广州市天河区'),
       ('王五', 'individual', '王五', '13900000004', 'wangwu@example.com', '深圳市南山区'),
       ('阳光公益基金会', 'enterprise', '赵秘书长', '13900000005', 'contact@sunfoundation.org', '杭州市西湖区')`
    );

    const donor1Id = donorResult.insertId;
    const donor2Id = donorResult.insertId + 1;
    const donor3Id = donorResult.insertId + 2;
    const donor4Id = donorResult.insertId + 3;
    const donor5Id = donorResult.insertId + 4;
    console.log('捐赠人数据填充完成');

    const [generalPoolResult] = await pool.execute(
      "INSERT INTO fund_pools (pool_type, project_id, name, balance, total_in, total_out) VALUES ('general', NULL, '基金会总池', 0, 0, 0)"
    );
    const generalPoolId = generalPoolResult.insertId;

    await pool.execute(
      `INSERT INTO fund_pools (pool_type, project_id, name, balance, total_in, total_out) VALUES 
       ('project', ?, '山区助学计划专项池', 0, 0, 0),
       ('project', ?, '大病儿童救助专项池', 0, 0, 0),
       ('project', ?, '社区养老服务专项池', 0, 0, 0)`,
      [project1Id, project2Id, project3Id]
    );
    console.log('资金池创建完成');

    const donations = [
      { donor_id: donor1Id, amount: 5000.00, date: '2024-01-15', type: 'designated', project_id: project1Id, status: 'received', received: '2024-01-15', receipt: 'RCP20240115001' },
      { donor_id: donor2Id, amount: 200000.00, date: '2024-01-20', type: 'undesignated', project_id: null, status: 'received', received: '2024-01-21', receipt: 'RCP20240120001' },
      { donor_id: donor3Id, amount: 2000.00, date: '2024-02-05', type: 'designated', project_id: project2Id, status: 'received', received: '2024-02-05', receipt: 'RCP20240205001' },
      { donor_id: donor4Id, amount: 20000.00, date: '2024-02-10', type: 'undesignated', project_id: null, status: 'received', received: '2024-02-11', receipt: 'RCP20240210001' },
      { donor_id: donor5Id, amount: 150000.00, date: '2024-02-15', type: 'designated', project_id: project2Id, status: 'received', received: '2024-02-16', receipt: 'RCP20240215001' },
      { donor_id: donor1Id, amount: 3000.00, date: '2024-03-01', type: 'designated', project_id: project1Id, status: 'received', received: '2024-03-01', receipt: 'RCP20240301001' },
      { donor_id: donor2Id, amount: 50000.00, date: '2024-03-05', type: 'undesignated', project_id: null, status: 'received', received: '2024-03-06', receipt: 'RCP20240305001' },
      { donor_id: donor3Id, amount: 500.00, date: '2024-03-10', type: 'designated', project_id: project3Id, status: 'received', received: '2024-03-10', receipt: 'RCP20240310001' },
      { donor_id: donor4Id, amount: 5000.00, date: '2024-03-15', type: 'undesignated', project_id: null, status: 'pending', received: null, receipt: 'RCP20240315001' },
      { donor_id: donor5Id, amount: 30000.00, date: '2024-03-20', type: 'designated', project_id: project1Id, status: 'pending', received: null, receipt: 'RCP20240320001' },
      { donor_id: donor1Id, amount: 1000.00, date: '2024-04-01', type: 'undesignated', project_id: null, status: 'received', received: '2024-04-01', receipt: 'RCP20240401001' },
      { donor_id: donor2Id, amount: 80000.00, date: '2024-04-05', type: 'designated', project_id: project2Id, status: 'received', received: '2024-04-06', receipt: 'RCP20240405001' },
    ];

    let donationIds = [];
    for (const d of donations) {
      const [result] = await pool.execute(
        `INSERT INTO donations (donor_id, amount, donation_date, donation_type, project_id, payment_method, receipt_no, status, received_date, created_by, remark)
         VALUES (?, ?, ?, ?, ?, '银行转账', ?, ?, ?, ?, ?)`,
        [d.donor_id, d.amount, d.date, d.type, d.project_id, d.receipt, d.status, d.received, adminId, '种子数据']
      );
      donationIds.push(result.insertId);
    }
    console.log('捐赠数据填充完成');

    const [pools] = await pool.execute('SELECT id, pool_type, project_id FROM fund_pools ORDER BY id');
    const poolMap = {};
    pools.forEach(p => {
      if (p.pool_type === 'general') poolMap.general = p.id;
      else poolMap[p.project_id] = p.id;
    });

    const receivedDesignatedP1 = 5000 + 3000;
    const receivedDesignatedP2 = 2000 + 150000 + 80000;
    const receivedDesignatedP3 = 500;
    const receivedUndesignated = 200000 + 20000 + 50000 + 1000;

    const allocP1FromGeneral = 150000;
    const allocP2FromGeneral = 70000;

    await pool.execute('UPDATE fund_pools SET balance = ?, total_in = ? WHERE id = ?', [receivedUndesignated - allocP1FromGeneral - allocP2FromGeneral, receivedUndesignated, poolMap.general]);
    await pool.execute('UPDATE fund_pools SET balance = ?, total_in = ? WHERE id = ?', [receivedDesignatedP1 + allocP1FromGeneral - 125000, receivedDesignatedP1 + allocP1FromGeneral, poolMap[project1Id]]);
    await pool.execute('UPDATE fund_pools SET balance = ?, total_in = ? WHERE id = ?', [receivedDesignatedP2 + allocP2FromGeneral - 210000, receivedDesignatedP2 + allocP2FromGeneral, poolMap[project2Id]]);
    await pool.execute('UPDATE fund_pools SET balance = ?, total_in = ? WHERE id = ?', [receivedDesignatedP3, receivedDesignatedP3, poolMap[project3Id]]);
    console.log('资金池余额初始化完成');

    await pool.execute(
      `INSERT INTO fund_flows (flow_type, amount, direction, pool_id, related_type, related_id, balance_after, remark) VALUES 
       ('donation_in', 5000, 'in', ?, 'donation', ?, 5000, '定向捐赠入账'),
       ('donation_in', 200000, 'in', ?, 'donation', ?, 200000, '非定向捐赠入账'),
       ('donation_in', 2000, 'in', ?, 'donation', ?, 2000, '定向捐赠入账'),
       ('donation_in', 20000, 'in', ?, 'donation', ?, 220000, '非定向捐赠入账'),
       ('donation_in', 150000, 'in', ?, 'donation', ?, 152000, '定向捐赠入账'),
       ('donation_in', 3000, 'in', ?, 'donation', ?, 8000, '定向捐赠入账'),
       ('donation_in', 50000, 'in', ?, 'donation', ?, 270000, '非定向捐赠入账'),
       ('donation_in', 500, 'in', ?, 'donation', ?, 500, '定向捐赠入账'),
       ('donation_in', 1000, 'in', ?, 'donation', ?, 271000, '非定向捐赠入账'),
       ('donation_in', 80000, 'in', ?, 'donation', ?, 232000, '定向捐赠入账')`,
      [
        poolMap[project1Id], donationIds[0],
        poolMap.general, donationIds[1],
        poolMap[project2Id], donationIds[2],
        poolMap.general, donationIds[3],
        poolMap[project2Id], donationIds[4],
        poolMap[project1Id], donationIds[5],
        poolMap.general, donationIds[6],
        poolMap[project3Id], donationIds[7],
        poolMap.general, donationIds[10],
        poolMap[project2Id], donationIds[11],
      ]
    );

    const [allocAppResult] = await pool.execute(
      `INSERT INTO allocation_applications (project_id, amount, source_pool, purpose, applicant_id, status, finance_reviewed_by, finance_review_comment, finance_reviewed_at, admin_approved_by, admin_approval_comment, admin_approved_at) VALUES 
       (?, 80000.00, 'general', '第一学期学费拨付', ?, 'approved', ?, '财务复核通过，金额正确', '2024-02-01 10:00:00', ?, '批准拨付', '2024-02-01 11:00:00'),
       (?, 100000.00, 'general', '首批医疗费用拨付', ?, 'approved', ?, '资料齐全，同意复核', '2024-03-01 14:00:00', ?, '批准', '2024-03-01 15:00:00'),
       (?, 50000.00, 'designated', '教学物资采购', ?, 'pending_finance', NULL, NULL, NULL, NULL, NULL, NULL),
       (?, 30000.00, 'general', '活动经费申请', ?, 'rejected', ?, '预算不合理，项目经费充足', '2024-03-10 09:00:00', NULL, NULL, NULL)`,
      [
        project1Id, lixueId, zhangcwId, adminId,
        project2Id, wangdbId, zhangcwId, adminId,
        project1Id, lixueId,
        project3Id, lixueId, zhangcwId
      ]
    );
    console.log('拨付申请数据填充完成');

    const [allocResult] = await pool.execute(
      `INSERT INTO fund_allocations (application_id, project_id, amount, source_pool, remark, created_by) VALUES 
       (?, ?, 80000.00, 'general', '2024春季学期学费拨款', ?),
       (?, ?, 100000.00, 'general', '首批医疗救助款', ?)`,
      [allocAppResult.insertId, project1Id, adminId, allocAppResult.insertId + 1, project2Id, adminId]
    );

    await pool.execute(
      `INSERT INTO fund_flows (flow_type, amount, direction, pool_id, related_type, related_id, balance_after, remark) VALUES 
       ('allocation_out', 80000, 'out', ?, 'allocation', ?, 191000, '拨付至山区助学计划'),
       ('allocation_in', 80000, 'in', ?, 'allocation', ?, 88000, '项目拨款入账'),
       ('allocation_out', 100000, 'out', ?, 'allocation', ?, 91000, '拨付至大病儿童救助'),
       ('allocation_in', 100000, 'in', ?, 'allocation', ?, 252000, '项目拨款入账')`,
      [
        poolMap.general, allocResult.insertId,
        poolMap[project1Id], allocResult.insertId,
        poolMap.general, allocResult.insertId + 1,
        poolMap[project2Id], allocResult.insertId + 1
      ]
    );
    console.log('拨付记录和流水填充完成');

    const [benefResult] = await pool.execute(
      `INSERT INTO beneficiaries (name, id_card, phone, address, category, description) VALUES 
       ('小明', '420101201001011234', '13700000001', '云南省昭通市某山村', '学生', '家庭贫困，父亲残疾，母亲务农'),
       ('小红', '420101201102022345', '13700000002', '贵州省毕节市某村', '学生', '单亲家庭，靠母亲打零工维持'),
       ('小华', '420101200903033456', '13700000003', '四川省凉山州某乡', '学生', '孤儿，由爷爷奶奶抚养'),
       ('小李', '420101201504044567', '13700000004', '河南省周口市某县', '大病患者', '白血病患儿，家庭因病致贫'),
       ('小张', '420101201605055678', '13700000005', '安徽省阜阳市某村', '大病患者', '先天性心脏病，急需手术'),
       ('王奶奶', '420101194506066789', '13700000006', '北京市某社区', '老人', '独居老人，子女在外地工作')`
    );
    console.log('受助人数据填充完成');

    await pool.execute(
      `INSERT INTO expenditures (project_id, beneficiary_id, amount, purpose, voucher_no, expenditure_date, created_by) VALUES 
       (?, ?, 20000.00, '2024春季学费-小明', 'EXP20240215001', '2024-02-15', ?),
       (?, ?, 18000.00, '2024春季学费-小红', 'EXP20240215002', '2024-02-15', ?),
       (?, ?, 25000.00, '2024春季学费-小华', 'EXP20240220001', '2024-02-20', ?),
       (?, ?, 62000.00, '教学用品和校服采购', 'EXP20240301001', '2024-03-01', ?),
       (?, ?, 120000.00, '小李白血病治疗费首期', 'EXP20240305001', '2024-03-05', ?),
       (?, ?, 90000.00, '小张心脏病手术费', 'EXP20240320001', '2024-03-20', ?)`,
      [
        project1Id, benefResult.insertId, lixueId,
        project1Id, benefResult.insertId + 1, lixueId,
        project1Id, benefResult.insertId + 2, lixueId,
        project1Id, null, lixueId,
        project2Id, benefResult.insertId + 3, wangdbId,
        project2Id, benefResult.insertId + 4, wangdbId,
      ]
    );
    console.log('支出数据填充完成');

    await pool.execute(
      `INSERT INTO fund_flows (flow_type, amount, direction, pool_id, related_type, related_id, balance_after, remark) VALUES 
       ('expenditure', 20000, 'out', ?, 'expenditure', ?, 68000, '学费支出-小明'),
       ('expenditure', 18000, 'out', ?, 'expenditure', ?, 50000, '学费支出-小红'),
       ('expenditure', 25000, 'out', ?, 'expenditure', ?, 25000, '学费支出-小华'),
       ('expenditure', 62000, 'out', ?, 'expenditure', ?, 26000, '教学物资采购'),
       ('expenditure', 120000, 'out', ?, 'expenditure', ?, 132000, '小李治疗费'),
       ('expenditure', 90000, 'out', ?, 'expenditure', ?, 42000, '小张手术费')`,
      [
        poolMap[project1Id], 1,
        poolMap[project1Id], 2,
        poolMap[project1Id], 3,
        poolMap[project1Id], 4,
        poolMap[project2Id], 5,
        poolMap[project2Id], 6,
      ]
    );

    console.log('所有种子数据填充完成！');
    console.log('默认账号:');
    console.log('  管理员: admin / 123456');
    console.log('  项目负责人(李助学): lixue / 123456');
    console.log('  项目负责人(王大病): wangdb / 123456');
    console.log('  财务专员: zhangcw / 123456');

    process.exit(0);
  } catch (error) {
    console.error('种子数据填充失败:', error);
    process.exit(1);
  }
};

seed();
