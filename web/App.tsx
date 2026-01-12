
import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import AppShell from './components/AppShell';
import AdminLayout from './components/AdminLayout';
import SuperAdminRoute from './components/SuperAdminRoute';
import UserRoute from './components/UserRoute';
import DashboardPage from './pages/DashboardPage';
import SettingsPage from './pages/SettingsPage';
import TeamPage from './pages/TeamPage';
import IntegrationsPage from './pages/IntegrationsPage';
import AuditLogsPage from './pages/AuditLogsPage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
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
import ClientsPage from './pages/ClientsPage';
import ClientDetailPage from './pages/ClientDetailPage';
import ClientFormPage from './pages/ClientFormPage';
import CalendarPage from './pages/CalendarPage';
import PostEditorPage from './pages/PostEditorPage';
import PublishingPage from './pages/PublishingPage';
import DevicesPage from './pages/DevicesPage';
import WhatsAppSettingsPage from './pages/WhatsAppSettingsPage';

const App = () => {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/invite/:token" element={<AcceptInvitePage />} />
                
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
                <Route path="team" element={<TeamPage />} />
                <Route path="integrations" element={<IntegrationsPage />} />
                <Route path="settings" element={<SettingsPage />} />
                <Route path="extension-settings" element={<ExtensionSettingsPage />} />
                <Route path="audit-logs" element={<AuditLogsPage />} />
                {/* Social Ops Routes */}
                <Route path="clients" element={<ClientsPage />} />
                <Route path="clients/new" element={<ClientFormPage />} />
                <Route path="clients/:clientId" element={<ClientDetailPage />} />
                <Route path="clients/:clientId/edit" element={<ClientFormPage />} />
                <Route path="posts" element={<CalendarPage />} />
                <Route path="posts/new" element={<PostEditorPage />} />
                <Route path="posts/:postId" element={<PostEditorPage />} />
                <Route path="posts/:postId/edit" element={<PostEditorPage />} />
                <Route path="publishing" element={<PublishingPage />} />
                <Route path="devices" element={<DevicesPage />} />
                <Route path="whatsapp-settings" element={<WhatsAppSettingsPage />} />
              </Routes>
            </AppShell>
          </UserRoute>
        } />
      </Routes>
    </Router>
  );
};

export default App;
