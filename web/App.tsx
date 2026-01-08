
import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import AppShell from './components/AppShell';
import AdminLayout from './components/AdminLayout';
import ProtectedRoute from './components/ProtectedRoute';
import ProspectingPage from './pages/ProspectingPage';
import LeadDetailPage from './pages/LeadDetailPage';
import CompanyDetailPage from './pages/CompanyDetailPage';
import LeadsManagementPage from './pages/LeadsManagementPage';
import ListsPage from './pages/ListsPage';
import ListDetailPage from './pages/ListDetailPage';
import DashboardPage from './pages/DashboardPage';
import WhatsAppMessagesPage from './pages/WhatsAppMessagesPage';
import SettingsPage from './pages/SettingsPage';
import TeamPage from './pages/TeamPage';
import IntegrationsPage from './pages/IntegrationsPage';
import AuditLogsPage from './pages/AuditLogsPage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ExtensionSidePanel from './pages/ExtensionSidePanel';
import NewLeadPage from './pages/NewLeadPage';
import LeadImportPage from './pages/LeadImportPage';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminTenants from './pages/admin/AdminTenants';
import AdminUsers from './pages/admin/AdminUsers';
import AdminPlans from './pages/admin/AdminPlans';
import AdminSubscriptions from './pages/admin/AdminSubscriptions';
import AdminSettings from './pages/admin/AdminSettings';

const App = () => {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/extension-preview" element={<ExtensionSidePanel />} />
        
        <Route path="/" element={<Navigate to="/app/dashboard" replace />} />
        
        {/* Admin Panel Routes */}
        <Route path="/admin" element={
          <ProtectedRoute>
            <AdminLayout />
          </ProtectedRoute>
        }>
          <Route index element={<AdminDashboard />} />
          <Route path="tenants" element={<AdminTenants />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="plans" element={<AdminPlans />} />
          <Route path="subscriptions" element={<AdminSubscriptions />} />
          <Route path="settings" element={<AdminSettings />} />
        </Route>

        <Route path="/app/*" element={
          <ProtectedRoute>
            <AppShell>
              <Routes>
                <Route path="dashboard" element={<DashboardPage />} />
                <Route path="prospecting" element={<ProspectingPage />} />
                <Route path="leads" element={<LeadsManagementPage />} />
                <Route path="leads/new" element={<NewLeadPage />} />
                <Route path="leads/import" element={<LeadImportPage />} />
                <Route path="leads/:id" element={<LeadDetailPage />} />
                <Route path="companies/:id" element={<CompanyDetailPage />} />
                <Route path="lists" element={<ListsPage />} />
                <Route path="lists/:id" element={<ListDetailPage />} />
                <Route path="whatsapp" element={<WhatsAppMessagesPage />} />
                <Route path="team" element={<TeamPage />} />
                <Route path="integrations" element={<IntegrationsPage />} />
                <Route path="settings" element={<SettingsPage />} />
                <Route path="audit-logs" element={<AuditLogsPage />} />
              </Routes>
            </AppShell>
          </ProtectedRoute>
        } />
      </Routes>
    </Router>
  );
};

export default App;
