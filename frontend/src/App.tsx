import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import MainLayout from './layouts/MainLayout';
import Dashboard from './pages/Dashboard';
import DonationList from './pages/donations/List';
import ProjectList from './pages/projects/List';
import ProjectDetail from './pages/projects/Detail';
import AllocationApplications from './pages/projects/AllocationApplications';
import FundPools from './pages/funds/Pools';
import ExpenditureList from './pages/funds/Expenditures';
import Trail from './pages/audit/Trail';
import FundFlows from './pages/audit/FundFlows';
import ProtectedRoute from './components/ProtectedRoute';

const App: React.FC = () => {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="donations" element={<DonationList />} />
        <Route path="projects" element={<ProjectList />} />
        <Route path="projects/:id" element={<ProjectDetail />} />
        <Route path="allocations" element={<AllocationApplications />} />
        <Route path="fund-pools" element={<FundPools />} />
        <Route path="expenditures" element={<ExpenditureList />} />
        <Route path="trail" element={<Trail />} />
        <Route path="fund-flows" element={<FundFlows />} />
      </Route>
    </Routes>
  );
};

export default App;
