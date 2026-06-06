const express = require('express');
const pool = require('../database/connection');
const { auth, requireRoles } = require('../middlewares/auth');

const router = express.Router();

router.use(auth);

router.get('/', requireRoles('admin'), async (req, res) => {
  try {
    const [users] = await pool.execute(
      'SELECT id, username, real_name, role, email, phone, status, created_at FROM users ORDER BY created_at DESC'
    );
    res.json(users);
  } catch (error) {
    console.error('获取用户列表错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

router.get('/project-managers', async (req, res) => {
  try {
    const [users] = await pool.execute(
      "SELECT id, username, real_name FROM users WHERE role = 'project_manager' AND status = 'active'"
    );
    res.json(users);
  } catch (error) {
    console.error('获取项目负责人列表错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

module.exports = router;
