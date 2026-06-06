const pool = require('../database/connection');

const getPoolBalance = async (poolId, connection) => {
  const conn = connection || pool;
  const [rows] = await conn.execute(
    'SELECT balance FROM fund_pools WHERE id = ? FOR UPDATE',
    [poolId]
  );
  return rows[0] ? parseFloat(rows[0].balance) : 0;
};

const getGeneralPoolId = async (connection) => {
  const conn = connection || pool;
  const [rows] = await conn.execute(
    "SELECT id FROM fund_pools WHERE pool_type = 'general' LIMIT 1"
  );
  return rows[0] ? rows[0].id : null;
};

const getProjectPoolId = async (projectId, connection) => {
  const conn = connection || pool;
  const [rows] = await conn.execute(
    'SELECT id FROM fund_pools WHERE pool_type = ? AND project_id = ? LIMIT 1',
    ['project', projectId]
  );
  return rows[0] ? rows[0].id : null;
};

const createPoolIfNotExists = async (poolType, projectId, name, connection) => {
  const conn = connection || pool;
  const [rows] = await conn.execute(
    'SELECT id FROM fund_pools WHERE pool_type = ? AND project_id <=> ?',
    [poolType, projectId]
  );
  if (rows.length > 0) return rows[0].id;

  const [result] = await conn.execute(
    'INSERT INTO fund_pools (pool_type, project_id, name) VALUES (?, ?, ?)',
    [poolType, projectId, name]
  );
  return result.insertId;
};

const recordFlow = async (flowType, amount, direction, poolId, relatedType, relatedId, balanceAfter, remark, connection) => {
  const conn = connection || pool;
  await conn.execute(
    'INSERT INTO fund_flows (flow_type, amount, direction, pool_id, related_type, related_id, balance_after, remark) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [flowType, amount, direction, poolId, relatedType, relatedId, balanceAfter, remark]
  );
};

const updatePoolBalance = async (poolId, amountChange, connection) => {
  const conn = connection || pool;
  await conn.execute(
    'UPDATE fund_pools SET balance = balance + ?, total_in = CASE WHEN ? > 0 THEN total_in + ? ELSE total_in END, total_out = CASE WHEN ? < 0 THEN total_out + ABS(?) ELSE total_out END WHERE id = ?',
    [amountChange, amountChange, amountChange, amountChange, amountChange, poolId]
  );
  const [rows] = await conn.execute('SELECT balance FROM fund_pools WHERE id = ?', [poolId]);
  return parseFloat(rows[0].balance);
};

module.exports = {
  getPoolBalance,
  getGeneralPoolId,
  getProjectPoolId,
  createPoolIfNotExists,
  recordFlow,
  updatePoolBalance
};
