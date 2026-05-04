/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

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
import { Toaster } from 'sonner';
import { useEffect } from 'react';
import { collection, getDocs, addDoc } from 'firebase/firestore';
import { db } from './lib/firebase';
import { handleFirestoreError, OperationType } from './lib/firestoreErrorHandler';

function ProtectedRoute({ children, allowedRoles, fallbackPath = "/orders" }: { children: React.ReactNode, allowedRoles?: string[], fallbackPath?: string }) {
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
        const snap = await getDocs(collection(db, 'warehouses'));
        if (snap.empty) {
          await addDoc(collection(db, 'warehouses'), { name: 'Valenzuela A (Main)', location: 'Hub 1' });
          await addDoc(collection(db, 'warehouses'), { name: 'Valenzuela B (Sub)', location: 'Hub 2' });
        }
      } catch (e) {
        handleFirestoreError(e, OperationType.WRITE, 'warehouses');
      }
    };
    if (user && profile) seedWarehouses();
  }, [user, profile]);

  return (
    <Routes>
      <Route path="/" element={user ? <Navigate to="/dashboard" replace /> : <LandingPage />} />
      <Route path="/about" element={<About />} />
      <Route path="/privacy" element={<Privacy />} />
      <Route path="/terms" element={<Terms />} />
      <Route path="/onboarding" element={user ? <Navigate to="/dashboard" replace /> : <Onboarding />} />
      <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <Auth />} />
      <Route path="/signup" element={user ? <Navigate to="/dashboard" replace /> : <Auth />} />
      
      <Route path="/dashboard" element={
        <ProtectedRoute allowedRoles={['admin', 'secretary', 'agent']}>
          <Dashboard />
        </ProtectedRoute>
      } />
      
      <Route path="/inventory" element={
        <ProtectedRoute allowedRoles={['admin', 'secretary', 'agent']}>
          <Inventory />
        </ProtectedRoute>
      } />
      
      <Route path="/orders" element={
        <ProtectedRoute allowedRoles={['admin', 'secretary', 'agent']}>
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
        <ProtectedRoute allowedRoles={['admin', 'secretary', 'agent']}>
          <Settings />
        </ProtectedRoute>
      } />

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppContent />
        <Toaster position="top-right" richColors closeButton />
      </AuthProvider>
    </BrowserRouter>
  );
}
