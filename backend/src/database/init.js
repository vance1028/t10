const mysql = require('mysql2/promise');
require('dotenv').config();

const initDatabase = async () => {
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || 'root123456',
    });

    await connection.execute(`CREATE DATABASE IF NOT EXISTS \`${process.env.DB_NAME || 'charity_foundation'}\` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    console.log('数据库创建成功');

    await connection.end();

    const pool = require('./connection');

    await pool.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id INT PRIMARY KEY AUTO_INCREMENT,
        username VARCHAR(50) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        real_name VARCHAR(50) NOT NULL,
        role ENUM('admin', 'project_manager', 'finance') NOT NULL,
        email VARCHAR(100),
        phone VARCHAR(20),
        status ENUM('active', 'disabled') DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    console.log('users 表创建成功');

    await pool.execute(`
      CREATE TABLE IF NOT EXISTS projects (
        id INT PRIMARY KEY AUTO_INCREMENT,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        category VARCHAR(50) NOT NULL,
        total_budget DECIMAL(15,2) NOT NULL DEFAULT 0,
        allocated_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
        spent_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
        remaining_budget DECIMAL(15,2) NOT NULL DEFAULT 0,
        project_manager_id INT,
        status ENUM('draft', 'active', 'completed', 'suspended') DEFAULT 'active',
        start_date DATE,
        end_date DATE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (project_manager_id) REFERENCES users(id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    console.log('projects 表创建成功');

    await pool.execute(`
      CREATE TABLE IF NOT EXISTS donors (
        id INT PRIMARY KEY AUTO_INCREMENT,
        name VARCHAR(100) NOT NULL,
        type ENUM('individual', 'enterprise') NOT NULL,
        contact_person VARCHAR(50),
        phone VARCHAR(20),
        email VARCHAR(100),
        address TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    console.log('donors 表创建成功');

    await pool.execute(`
      CREATE TABLE IF NOT EXISTS donations (
        id INT PRIMARY KEY AUTO_INCREMENT,
        donor_id INT NOT NULL,
        amount DECIMAL(15,2) NOT NULL,
        donation_date DATE NOT NULL,
        donation_type ENUM('designated', 'undesignated') NOT NULL,
        project_id INT NULL,
        payment_method VARCHAR(50),
        receipt_no VARCHAR(50),
        status ENUM('pending', 'received', 'refunded') DEFAULT 'pending',
        received_date DATE,
        remark TEXT,
        created_by INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (donor_id) REFERENCES donors(id),
        FOREIGN KEY (project_id) REFERENCES projects(id),
        FOREIGN KEY (created_by) REFERENCES users(id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    console.log('donations 表创建成功');

    await pool.execute(`
      CREATE TABLE IF NOT EXISTS fund_pools (
        id INT PRIMARY KEY AUTO_INCREMENT,
        pool_type ENUM('general', 'project') NOT NULL,
        project_id INT NULL,
        name VARCHAR(100) NOT NULL,
        balance DECIMAL(15,2) NOT NULL DEFAULT 0,
        total_in DECIMAL(15,2) NOT NULL DEFAULT 0,
        total_out DECIMAL(15,2) NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (project_id) REFERENCES projects(id),
        UNIQUE KEY unique_project_pool (pool_type, project_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    console.log('fund_pools 表创建成功');

    await pool.execute(`
      CREATE TABLE IF NOT EXISTS allocation_applications (
        id INT PRIMARY KEY AUTO_INCREMENT,
        project_id INT NOT NULL,
        amount DECIMAL(15,2) NOT NULL,
        source_pool ENUM('general', 'designated') NOT NULL,
        purpose TEXT,
        applicant_id INT NOT NULL,
        status ENUM('pending_finance', 'pending_admin', 'approved', 'rejected') DEFAULT 'pending_finance',
        finance_reviewed_by INT,
        finance_review_comment TEXT,
        finance_reviewed_at TIMESTAMP NULL,
        admin_approved_by INT,
        admin_approval_comment TEXT,
        admin_approved_at TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (project_id) REFERENCES projects(id),
        FOREIGN KEY (applicant_id) REFERENCES users(id),
        FOREIGN KEY (finance_reviewed_by) REFERENCES users(id),
        FOREIGN KEY (admin_approved_by) REFERENCES users(id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    console.log('allocation_applications 表创建成功');

    await pool.execute(`
      CREATE TABLE IF NOT EXISTS fund_allocations (
        id INT PRIMARY KEY AUTO_INCREMENT,
        application_id INT NULL,
        project_id INT NOT NULL,
        amount DECIMAL(15,2) NOT NULL,
        source_pool ENUM('general', 'designated') NOT NULL,
        source_donation_ids TEXT,
        remark TEXT,
        created_by INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (application_id) REFERENCES allocation_applications(id),
        FOREIGN KEY (project_id) REFERENCES projects(id),
        FOREIGN KEY (created_by) REFERENCES users(id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    console.log('fund_allocations 表创建成功');

    await pool.execute(`
      CREATE TABLE IF NOT EXISTS beneficiaries (
        id INT PRIMARY KEY AUTO_INCREMENT,
        name VARCHAR(50) NOT NULL,
        id_card VARCHAR(18),
        phone VARCHAR(20),
        address TEXT,
        category VARCHAR(50),
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    console.log('beneficiaries 表创建成功');

    await pool.execute(`
      CREATE TABLE IF NOT EXISTS expenditures (
        id INT PRIMARY KEY AUTO_INCREMENT,
        project_id INT NOT NULL,
        beneficiary_id INT NULL,
        amount DECIMAL(15,2) NOT NULL,
        purpose TEXT NOT NULL,
        voucher_no VARCHAR(100),
        voucher_url VARCHAR(255),
        expenditure_date DATE NOT NULL,
        created_by INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (project_id) REFERENCES projects(id),
        FOREIGN KEY (beneficiary_id) REFERENCES beneficiaries(id),
        FOREIGN KEY (created_by) REFERENCES users(id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    console.log('expenditures 表创建成功');

    await pool.execute(`
      CREATE TABLE IF NOT EXISTS fund_flows (
        id INT PRIMARY KEY AUTO_INCREMENT,
        flow_type ENUM('donation_in', 'allocation_in', 'allocation_out', 'expenditure') NOT NULL,
        amount DECIMAL(15,2) NOT NULL,
        direction ENUM('in', 'out') NOT NULL,
        pool_id INT NOT NULL,
        related_type VARCHAR(50),
        related_id INT,
        balance_after DECIMAL(15,2) NOT NULL,
        remark TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (pool_id) REFERENCES fund_pools(id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    console.log('fund_flows 表创建成功');

    await pool.execute(`
      CREATE TABLE IF NOT EXISTS donation_trails (
        id INT PRIMARY KEY AUTO_INCREMENT,
        donation_id INT NOT NULL,
        allocation_id INT NULL,
        expenditure_id INT NULL,
        amount DECIMAL(15,2) NOT NULL,
        flow_order INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (donation_id) REFERENCES donations(id),
        FOREIGN KEY (allocation_id) REFERENCES fund_allocations(id),
        FOREIGN KEY (expenditure_id) REFERENCES expenditures(id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    console.log('donation_trails 表创建成功');

    await pool.execute(`
      CREATE TABLE IF NOT EXISTS operation_logs (
        id INT PRIMARY KEY AUTO_INCREMENT,
        user_id INT,
        action VARCHAR(100) NOT NULL,
        module VARCHAR(50) NOT NULL,
        detail TEXT,
        ip_address VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    console.log('operation_logs 表创建成功');

    console.log('所有表创建完成！');
    process.exit(0);
  } catch (error) {
    console.error('数据库初始化失败:', error);
    process.exit(1);
  }
};

initDatabase();
