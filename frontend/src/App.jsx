// c:\Users\Rahil hassan\OneDrive\Desktop\Major project\MediChain\frontend\src\App.jsx
import React, { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import NetworkGuard from './components/NetworkGuard';

// ── Eagerly loaded (critical path) ───────────────────────────────────────────
import Login          from './pages/Login';
import Register       from './pages/Register';
import PatientDashboard from './pages/PatientDashboard';
import DoctorDashboard  from './pages/DoctorDashboard';

// ── Lazily loaded (non-critical) ──────────────────────────────────────────────
const HospitalDashboard   = lazy(() => import('./pages/HospitalDashboard'));
const QRHealthIDPage      = lazy(() => import('./pages/QRHealthID'));
const MedicalRecords      = lazy(() => import('./pages/MedicalRecords'));
const ManageAccess        = lazy(() => import('./pages/ManageAccess'));
const Profile             = lazy(() => import('./pages/Profile'));
const UploadPrescription  = lazy(() => import('./pages/UploadPrescription'));
const UploadReport        = lazy(() => import('./pages/UploadReport'));
const QRScannerPage       = lazy(() => import('./pages/QRScannerPage'));
const PatientRegistry     = lazy(() => import('./pages/PatientRegistry'));
const CDSSPage            = lazy(() => import('./pages/CDSSPage'));

// ── Full-screen spinner (Suspense fallback) ───────────────────────────────────
const PageLoader = () => (
  <div className="min-h-screen bg-gray-900 flex items-center justify-center">
    <div className="flex flex-col items-center gap-4">
      <div className="w-12 h-12 border-4 border-t-transparent border-cyan-500 rounded-full animate-spin" />
      <p className="text-xs text-gray-400 uppercase tracking-widest animate-pulse">Loading MediChain…</p>
    </div>
  </div>
);

// ── Role-aware redirect helper ────────────────────────────────────────────────
const RoleRedirect = ({ user }) => {
  if (user?.role === 'patient')             return <Navigate to="/patient-dashboard" replace />;
  if (user?.role === 'doctor')              return <Navigate to="/doctor-dashboard"  replace />;
  if (user?.role === 'hospital')            return <Navigate to="/hospital-dashboard" replace />;
  return <Navigate to="/login" replace />;
};

// ── Protected Route Wrapper ───────────────────────────────────────────────────
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { isAuthenticated, user, loading } = useAuth();

  if (loading) return <PageLoader />;

  if (!isAuthenticated || !user) return <Navigate to="/login" replace />;

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <RoleRedirect user={user} />;
  }

  return children;
};

// ── App ───────────────────────────────────────────────────────────────────────
function App() {
  return (
    <AuthProvider>
      <NetworkGuard>
        <Router>
          <Suspense fallback={<PageLoader />}>
            <Routes>
            {/* ── Public Routes ──────────────────────────────────────── */}
            <Route path="/"         element={<Navigate to="/login" replace />} />
            <Route path="/login"    element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* ── Patient Routes ─────────────────────────────────────── */}
            <Route path="/patient-dashboard" element={
              <ProtectedRoute allowedRoles={['patient']}>
                <PatientDashboard />
              </ProtectedRoute>
            } />
            <Route path="/qr-id" element={
              <ProtectedRoute allowedRoles={['patient']}>
                <QRHealthIDPage />
              </ProtectedRoute>
            } />
            <Route path="/records" element={
              <ProtectedRoute allowedRoles={['patient']}>
                <MedicalRecords />
              </ProtectedRoute>
            } />
            <Route path="/access" element={
              <ProtectedRoute allowedRoles={['patient']}>
                <ManageAccess />
              </ProtectedRoute>
            } />
            <Route path="/profile" element={
              <ProtectedRoute allowedRoles={['patient', 'doctor', 'hospital']}>
                <Profile />
              </ProtectedRoute>
            } />
            <Route path="/ai-dashboard" element={
              <ProtectedRoute allowedRoles={['patient', 'doctor', 'hospital']}>
                <CDSSPage />
              </ProtectedRoute>
            } />

            {/* ── Doctor Routes ──────────────────────────────────────── */}
            <Route path="/doctor-dashboard" element={
              <ProtectedRoute allowedRoles={['doctor', 'hospital']}>
                <DoctorDashboard />
              </ProtectedRoute>
            } />
            <Route path="/upload-prescription" element={
              <ProtectedRoute allowedRoles={['doctor', 'hospital']}>
                <UploadPrescription />
              </ProtectedRoute>
            } />
            <Route path="/scan" element={
              <ProtectedRoute allowedRoles={['doctor', 'hospital']}>
                <QRScannerPage />
              </ProtectedRoute>
            } />
            <Route path="/registry" element={
              <ProtectedRoute allowedRoles={['doctor', 'hospital']}>
                <PatientRegistry />
              </ProtectedRoute>
            } />

            {/* ── Hospital Routes ────────────────────────────────────── */}
            <Route path="/hospital-dashboard" element={
              <ProtectedRoute allowedRoles={['hospital']}>
                <HospitalDashboard />
              </ProtectedRoute>
            } />
            <Route path="/upload-report" element={
              <ProtectedRoute allowedRoles={['doctor', 'hospital']}>
                <UploadReport />
              </ProtectedRoute>
            } />

            {/* ── Catch-all ──────────────────────────────────────────── */}
            <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
          </Suspense>
        </Router>
      </NetworkGuard>
    </AuthProvider>
  );
}

export default App;
