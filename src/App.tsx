/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AdminPanel } from './components/AdminPanel';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { Layout } from './components/Layout';
import { Auth } from './components/Auth';
import { LandingPage } from './components/LandingPage';
import { About } from './components/About';
import { Onboarding } from './components/Onboarding';
import { Privacy } from './components/Privacy';
import { Terms } from './components/Terms';
import { Dashboard } from './components/Dashboard';
import { Inventory } from './components/Inventory';
import { Orders } from './components/Orders';
import { Finance } from './components/Finance';
import { Transfers } from './components/Transfers';
import { Settings } from './components/Settings';
import { Pricelist } from './components/Pricelist';
import { LogisticsOptimizer } from './components/LogisticsOptimizer';
import { DelegationPanel } from './components/DelegationPanel';
import { ThemeProvider } from './components/ThemeProvider';
import { Toaster } from 'sonner';
import { useEffect } from 'react';
import { supabase } from './lib/supabase';
import { handleSupabaseError, OperationType } from './lib/supabaseErrorHandler';

function ProtectedRoute({ children, allowedRoles, fallbackPath = "/inventory" }: { children: React.ReactNode, allowedRoles?: string[], fallbackPath?: string }) {
  const { user, profile, loading } = useAuth();
  
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950">
      <div className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin" />
    </div>
  );
  
  if (!user) return <Navigate to="/login" replace />;
  
  if (allowedRoles && profile && !allowedRoles.includes(profile.role)) {
    return <Navigate to={fallbackPath} replace />;
  }

  return <Layout>{children}</Layout>;
}

function AppContent() {
  const { user, profile } = useAuth();

  // Seed initial warehouses if empty
  useEffect(() => {
    const seedWarehouses = async () => {
      if (profile?.role !== 'admin') return; 
      try {
        const { data: snap, error } = await supabase.from('warehouses').select('*');
        if (error) throw error;
        if (!snap || snap.length === 0) {
          await supabase.from('warehouses').insert({ name: 'Valenzuela A (Main)', location: 'Hub 1' });
          await supabase.from('warehouses').insert({ name: 'Valenzuela B (Sub)', location: 'Hub 2' });
        }
      } catch (e) {
        handleSupabaseError(e, OperationType.WRITE, 'warehouses');
      }
    };
    if (user && profile) seedWarehouses();
  }, [user, profile]);

  const defaultPath = profile?.role === 'admin' ? '/admin' : '/inventory';

  return (
    <Routes>
      {/* Root: always redirect — never show the landing page on open */}
      <Route path="/" element={<Navigate to={user ? defaultPath : "/login"} replace />} />

      {/* Auth routes — redirect to dashboard if already logged in */}
      <Route path="/login" element={user ? <Navigate to={defaultPath} replace /> : <Auth />} />
      <Route path="/signup" element={user ? <Navigate to={defaultPath} replace /> : <Auth />} />

      {/* Public informational pages — kept accessible without login */}
      <Route path="/about" element={<About />} />
      <Route path="/privacy" element={<Privacy />} />
      <Route path="/terms" element={<Terms />} />

      {/* Onboarding — only for unauthenticated users */}
      <Route path="/onboarding" element={user ? <Navigate to={defaultPath} replace /> : <Onboarding />} />
      
      <Route path="/dashboard" element={
        <ProtectedRoute allowedRoles={['admin']}>
          <Dashboard />
        </ProtectedRoute>
      } />
      
      <Route path="/inventory" element={
        <ProtectedRoute allowedRoles={['admin', 'secretary', 'agent', 'staff']}>
          <Inventory />
        </ProtectedRoute>
      } />
      
      <Route path="/orders" element={
        <ProtectedRoute allowedRoles={['admin', 'secretary', 'agent', 'staff']}>
          <Orders />
        </ProtectedRoute>
      } />
      
      <Route path="/transfers" element={
        <ProtectedRoute allowedRoles={['admin', 'secretary']}>
          <Transfers />
        </ProtectedRoute>
      } />
      
      <Route path="/finance" element={
        <ProtectedRoute allowedRoles={['admin']}>
          <Finance />
        </ProtectedRoute>
      } />

      <Route path="/settings" element={
        <ProtectedRoute allowedRoles={['admin', 'secretary', 'agent', 'staff']}>
          <Settings />
        </ProtectedRoute>
      } />

      <Route path="/logistics" element={
        <ProtectedRoute allowedRoles={['admin', 'secretary']}>
          <LogisticsOptimizer />
        </ProtectedRoute>
      } />

      <Route path="/pricelist" element={
        <ProtectedRoute allowedRoles={['admin', 'secretary', 'agent', 'staff']}>
          <Pricelist />
        </ProtectedRoute>
      } />

      <Route path="/admin" element={
        <ProtectedRoute allowedRoles={['admin']}>
          <AdminPanel />
        </ProtectedRoute>
      } />

      <Route path="/delegation" element={
        <ProtectedRoute allowedRoles={['admin', 'agent']}>
          <DelegationPanel />
        </ProtectedRoute>
      } />

      {/* Catch-all: send unauthenticated users to login, authenticated to defaultPath */}
      <Route path="*" element={<Navigate to={user ? defaultPath : "/login"} replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider defaultTheme="light">
        <AuthProvider>
          <AppContent />
          <Toaster position="top-right" richColors closeButton />
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
