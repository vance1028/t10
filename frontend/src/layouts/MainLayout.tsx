import React, { useState } from 'react';
import { Layout, Menu, Avatar, Dropdown, theme } from 'antd';
import {
  DashboardOutlined,
  HeartOutlined,
  ProjectOutlined,
  SwapOutlined,
  FundOutlined,
  FileTextOutlined,
  AuditOutlined,
  UserOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined
} from '@ant-design/icons';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { getUser, removeToken, removeUser, isAdmin, isFinance, isProjectManager } from '../utils/auth';

const { Header, Sider, Content } = Layout;

const MainLayout: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const user = getUser();
  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();

  const handleLogout = () => {
    removeToken();
    removeUser();
    navigate('/login');
  };

  const userMenuItems = [
    {
      key: '1',
      icon: <UserOutlined />,
      label: `${user?.realName} (${user?.role === 'admin' ? '管理员' : user?.role === 'finance' ? '财务' : '项目负责人'})`,
      disabled: true
    },
    { type: 'divider' as const },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录',
      onClick: handleLogout
    }
  ];

  const menuItems = [
    { key: '/dashboard', icon: <DashboardOutlined />, label: '数据概览' },
    { key: '/donations', icon: <HeartOutlined />, label: '捐赠管理' },
    { key: '/projects', icon: <ProjectOutlined />, label: '项目管理' },
    { key: '/allocations', icon: <SwapOutlined />, label: '拨付审批' },
    { key: '/fund-pools', icon: <FundOutlined />, label: '资金池' },
    { key: '/expenditures', icon: <FileTextOutlined />, label: '支出登记' },
    { key: '/trail', icon: <AuditOutlined />, label: '资金追溯' },
    ...(isAdmin() || isFinance() ? [{ key: '/fund-flows', icon: <AuditOutlined />, label: '流水审计' }] : [])
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider trigger={null} collapsible collapsed={collapsed} theme="dark">
        <div style={{
          height: 64,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontSize: collapsed ? 12 : 16,
          fontWeight: 'bold',
          borderBottom: '1px solid rgba(255,255,255,0.1)'
        }}>
          {collapsed ? '慈善' : '慈善基金会'}
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
        />
      </Sider>
      <Layout>
        <Header style={{
          padding: '0 24px',
          background: colorBgContainer,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          {collapsed ? (
            <MenuUnfoldOutlined onClick={() => setCollapsed(!collapsed)} style={{ fontSize: 18 }} />
          ) : (
            <MenuFoldOutlined onClick={() => setCollapsed(!collapsed)} style={{ fontSize: 18 }} />
          )}
          <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
            <div style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Avatar icon={<UserOutlined />} />
              <span>{user?.realName}</span>
            </div>
          </Dropdown>
        </Header>
        <Content style={{
          margin: '24px',
          padding: 24,
          minHeight: 280,
          background: colorBgContainer,
          borderRadius: borderRadiusLG,
        }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
};

export default MainLayout;
