
import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import AppShell from './components/AppShell';
import AdminLayout from './components/AdminLayout';
import SuperAdminRoute from './components/SuperAdminRoute';
import UserRoute from './components/UserRoute';
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
import AdminTenantDetail from './pages/admin/AdminTenantDetail';
import AdminDataBank from './pages/admin/AdminDataBank';
import AISettingsPage from './pages/admin/AISettingsPage';
import ExtensionSettingsPage from './pages/ExtensionSettingsPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import AcceptInvitePage from './pages/AcceptInvitePage';

const App = () => {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/invite/:token" element={<AcceptInvitePage />} />
        <Route path="/extension-preview" element={<ExtensionSidePanel />} />
        
        <Route path="/" element={<Navigate to="/app/dashboard" replace />} />
        
        {/* Admin Panel Routes - Super Admin Only */}
        <Route path="/admin" element={
          <SuperAdminRoute>
            <AdminLayout />
          </SuperAdminRoute>
        }>
          <Route index element={<AdminDashboard />} />
          <Route path="tenants" element={<AdminTenants />} />
          <Route path="tenants/:id" element={<AdminTenantDetail />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="data-bank" element={<AdminDataBank />} />
          <Route path="plans" element={<AdminPlans />} />
          <Route path="subscriptions" element={<AdminSubscriptions />} />
          <Route path="settings" element={<AdminSettings />} />
          <Route path="ai-settings" element={<AISettingsPage />} />
        </Route>

        {/* User Panel Routes - Regular Users Only */}
        <Route path="/app/*" element={
          <UserRoute>
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
                <Route path="extension-settings" element={<ExtensionSettingsPage />} />
                <Route path="audit-logs" element={<AuditLogsPage />} />
              </Routes>
            </AppShell>
          </UserRoute>
        } />
      </Routes>
    </Router>
  );
};

export default App;
