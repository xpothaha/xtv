import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate, Navigate } from 'react-router-dom';
import './App.css';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Dashboard, VMs, System, ISO, GPU, Settings, Login, Installation, AuditLog } from './pages';
import { useInstallationStatus } from './hooks/useInstallation';
import { initializeAuth } from './hooks/useAuth';

const queryClient = new QueryClient();

type MenuItemType = { path: string; name: string; icon: React.ReactNode };

const menuData: MenuItemType[] = [
  { path: '/dashboard', name: 'Dashboard', icon: '📊' },
  { path: '/vms', name: 'VMs', icon: '💾' },
  { path: '/system', name: 'System', icon: '🖧' },
  { path: '/iso', name: 'ISO', icon: '🗄️' },
  { path: '/gpu', name: 'GPU', icon: '💻' },
  { path: '/settings', name: 'Settings', icon: '⚙️' },
  { path: '/audit', name: 'Audit Log', icon: '⚙️' },
];

// Protected Route Component
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const token = localStorage.getItem('xtv_token');
  return token ? <>{children}</> : <Navigate to="/login" replace />;
};

const AppLayout: React.FC = () => {
  const [pathname, setPathname] = useState('/dashboard');
  const navigate = useNavigate();
  const { data: installStatus, isLoading: installLoading } = useInstallationStatus();

  // Check if system is installed
  if (installLoading) {
    return <div>Loading...</div>;
  }

  if (!installStatus?.installed) {
    return <Installation />;
  }

  return (
    <ProLayout
      title="XTV"
      logo={null}
      fixSiderbar
      layout="mix"
      navTheme="light"
      menuDataRender={() => menuData}
      location={{ pathname }}
      onMenuHeaderClick={() => navigate('/dashboard')}
      menuItemRender={(item, dom) => (
        <span
          style={{ cursor: 'pointer' }}
          onClick={() => {
            setPathname(item.path as string);
            navigate(item.path as string);
          }}
        >
          {dom}
        </span>
      )}
      headerContentRender={() => <span style={{ fontWeight: 600, fontSize: 18 }}>XTV Virtualization Platform</span>}
      contentStyle={{ minHeight: 'calc(100vh - 64px)', background: '#f5f6fa' }}
    >
      <Routes>
        <Route path="/dashboard" element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        } />
        <Route path="/vms" element={
          <ProtectedRoute>
            <VMs />
          </ProtectedRoute>
        } />
        <Route path="/system" element={
          <ProtectedRoute>
            <System />
          </ProtectedRoute>
        } />
        <Route path="/iso" element={
          <ProtectedRoute>
            <ISO />
          </ProtectedRoute>
        } />
        <Route path="/gpu" element={
          <ProtectedRoute>
            <GPU />
          </ProtectedRoute>
        } />
        <Route path="/settings" element={
          <ProtectedRoute>
            <Settings />
          </ProtectedRoute>
        } />
        <Route path="/audit" element={
          <ProtectedRoute>
            <AuditLog />
          </ProtectedRoute>
        } />
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </ProLayout>
  );
};

const App: React.FC = () => {
  useEffect(() => {
    // Initialize auth token on app start
    initializeAuth();
  }, []);

  return (
    <>
      <QueryClientProvider client={queryClient}>
        <Router>
          <AppLayout />
        </Router>
      </QueryClientProvider>
    </>
  );
};

export default App;
