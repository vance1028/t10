const pool = require('../database/connection');

const logOperation = async (userId, action, module, detail, ip) => {
  try {
    await pool.execute(
      'INSERT INTO operation_logs (user_id, action, module, detail, ip_address) VALUES (?, ?, ?, ?, ?)',
      [userId, action, module, detail, ip || '']
    );
  } catch (error) {
    console.error('操作日志记录失败:', error);
  }
};

module.exports = { logOperation };
