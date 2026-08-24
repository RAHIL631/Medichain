// c:\Users\Rahil hassan\OneDrive\Desktop\Major project\MediChain\frontend\src\App.jsx
import React, { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { WalletProvider } from './context/WalletContext';
import { ToastProvider } from './components/ui/Toast';

// ── Eagerly loaded (critical path) ───────────────────────────────────────────
import LandingPage     from './pages/LandingPage';
import Login           from './pages/Login';
import Register        from './pages/Register';
import PatientDashboard from './pages/PatientDashboard';
import DoctorDashboard  from './pages/DoctorDashboard';

// ── Lazily loaded (non-critical) ──────────────────────────────────────────────
const HospitalDashboard    = lazy(() => import('./pages/HospitalDashboard'));
const AdminDashboard       = lazy(() => import('./pages/AdminDashboard'));
const QRHealthIDPage       = lazy(() => import('./pages/QRHealthID'));
const MedicalRecords       = lazy(() => import('./pages/MedicalRecords'));
const ManageAccess         = lazy(() => import('./pages/ManageAccess'));
const Profile              = lazy(() => import('./pages/Profile'));
const UploadPrescription   = lazy(() => import('./pages/UploadPrescription'));
const UploadReport         = lazy(() => import('./pages/UploadReport'));
const QRScannerPage        = lazy(() => import('./pages/QRScannerPage'));
const PatientRegistry      = lazy(() => import('./pages/PatientRegistry'));
const CDSSPage             = lazy(() => import('./pages/CDSSPage'));
const PrescriptionValidator = lazy(() => import('./pages/PrescriptionValidator'));
const HealthRiskDashboard  = lazy(() => import('./pages/HealthRiskDashboard'));
const EnsemblePredictorDashboard = lazy(() => import('./pages/EnsemblePredictorDashboard'));
const AdherenceDashboard   = lazy(() => import('./pages/AdherenceDashboard'));
const DigitalTwinDashboard = lazy(() => import('./pages/DigitalTwinDashboard'));
const AnalyticsDashboard   = lazy(() => import('./pages/AnalyticsDashboard'));
const NotFoundPage         = lazy(() => import('./pages/NotFoundPage'));

// ── Enterprise AI Platform (Phase 2–11) — Lazily loaded ───────────────────────
const HospitalRecommendationPage  = lazy(() => import('./pages/HospitalRecommendationPage'));
const AIEnterpriseDashboard       = lazy(() => import('./pages/AIEnterpriseDashboard'));
const AIHealthAssistantPage       = lazy(() => import('./pages/AIHealthAssistantPage'));
const PredictiveAnalyticsPage     = lazy(() => import('./pages/PredictiveAnalyticsPage'));
const HealthTimelinePage          = lazy(() => import('./pages/HealthTimelinePage'));

// ── Full-screen spinner (Suspense fallback) ───────────────────────────────────
const PageLoader = () => (
  <div className="min-h-screen bg-hc-bg flex items-center justify-center">
    <div className="flex flex-col items-center gap-4">
      <div className="relative">
        <div className="w-12 h-12 border-4 border-hc-border-light rounded-full" />
        <div className="absolute inset-0 w-12 h-12 border-4 border-t-hc-blue border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin" />
      </div>
      <div className="flex flex-col items-center gap-1">
        <p className="text-sm font-bold text-hc-text">MediChain</p>
        <p className="text-[10px] text-hc-text-muted uppercase tracking-widest animate-pulse">Loading platform…</p>
      </div>
    </div>
  </div>
);

// ── Role-aware redirect helper ────────────────────────────────────────────────
const RoleRedirect = ({ user }) => {
  if (user?.role === 'patient')  return <Navigate to="/patient-dashboard"  replace />;
  if (user?.role === 'doctor')   return <Navigate to="/doctor-dashboard"   replace />;
  if (user?.role === 'hospital') return <Navigate to="/hospital-dashboard" replace />;
  if (user?.role === 'admin')    return <Navigate to="/admin-dashboard"    replace />;
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

// ── Public Route — redirects authenticated users to their dashboard ────────────
const PublicRoute = ({ children }) => {
  const { isAuthenticated, user, loading } = useAuth();
  if (loading) return <PageLoader />;
  if (isAuthenticated && user) return <RoleRedirect user={user} />;
  return children;
};

// ── App ───────────────────────────────────────────────────────────────────────
//
// Architecture: Two complementary authentication layers
//   Layer 1 (Primary):  Email + Password → JWT/Session  [always required]
//   Layer 2 (Optional): MetaMask → Sepolia → SmartContract [only for blockchain ops]
//
// NetworkGuard is intentionally removed as a global wrapper.
// Network checks now happen only inside WalletConnectionModal when a
// blockchain operation is explicitly triggered by the user.
//
function App() {
  return (
    <AuthProvider>
      {/* WalletProvider: shared optional wallet state across the app.
          Does NOT block rendering. Silent reconnect uses eth_accounts (no popup). */}
      <WalletProvider>
        <ToastProvider>
          <Router>
            <Suspense fallback={<PageLoader />}>
              <Routes>
                {/* ── Public / Marketing Routes ─────────────────────────── */}
                <Route path="/" element={<LandingPage />} />
                <Route path="/login"    element={<PublicRoute><Login /></PublicRoute>} />
                <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />

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
                  <ProtectedRoute allowedRoles={['patient', 'doctor', 'hospital', 'admin']}>
                    <Profile />
                  </ProtectedRoute>
                } />
                <Route path="/ai-dashboard" element={
                  <ProtectedRoute allowedRoles={['patient', 'doctor', 'hospital', 'admin']}>
                    <CDSSPage />
                  </ProtectedRoute>
                } />
                <Route path="/health-risk" element={
                  <ProtectedRoute allowedRoles={['patient', 'doctor', 'hospital', 'admin']}>
                    <HealthRiskDashboard />
                  </ProtectedRoute>
                } />
                <Route path="/ensemble-predict" element={
                  <ProtectedRoute allowedRoles={['patient', 'doctor', 'hospital', 'admin']}>
                    <EnsemblePredictorDashboard />
                  </ProtectedRoute>
                } />
                <Route path="/adherence-prediction" element={
                  <ProtectedRoute allowedRoles={['patient', 'doctor', 'hospital', 'admin']}>
                    <AdherenceDashboard />
                  </ProtectedRoute>
                } />
                <Route path="/digital-twin" element={
                  <ProtectedRoute allowedRoles={['patient', 'doctor', 'hospital', 'admin']}>
                    <DigitalTwinDashboard />
                  </ProtectedRoute>
                } />
                <Route path="/analytics" element={
                  <ProtectedRoute allowedRoles={['patient', 'doctor', 'hospital', 'admin']}>
                    <AnalyticsDashboard />
                  </ProtectedRoute>
                } />

                {/* ── Doctor Routes ──────────────────────────────────────── */}
                <Route path="/doctor-dashboard" element={
                  <ProtectedRoute allowedRoles={['doctor', 'hospital']}>
                    <DoctorDashboard />
                  </ProtectedRoute>
                } />
                <Route path="/upload-prescription" element={
                  <ProtectedRoute allowedRoles={['patient', 'doctor', 'hospital']}>
                    <UploadPrescription />
                  </ProtectedRoute>
                } />
                <Route path="/prescription-validator" element={
                  <ProtectedRoute allowedRoles={['doctor', 'hospital']}>
                    <PrescriptionValidator />
                  </ProtectedRoute>
                } />
                <Route path="/scan" element={
                  <ProtectedRoute allowedRoles={['doctor', 'hospital']}>
                    <QRScannerPage />
                  </ProtectedRoute>
                } />
                <Route path="/scan-qr" element={
                  <ProtectedRoute allowedRoles={['doctor', 'hospital']}>
                    <QRScannerPage />
                  </ProtectedRoute>
                } />
                <Route path="/registry" element={
                  <ProtectedRoute allowedRoles={['doctor', 'hospital']}>
                    <PatientRegistry />
                  </ProtectedRoute>
                } />
                <Route path="/patients" element={
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
                  <ProtectedRoute allowedRoles={['patient', 'doctor', 'hospital']}>
                    <UploadReport />
                  </ProtectedRoute>
                } />

                {/* ── Admin Routes ───────────────────────────────────────── */}
                <Route path="/admin-dashboard" element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <AdminDashboard />
                  </ProtectedRoute>
                } />

                {/* ── Enterprise AI Platform Routes (Phase 2–11) ─────────── */}
                <Route path="/hospital-recommendation" element={
                  <ProtectedRoute allowedRoles={['patient', 'doctor', 'hospital', 'admin']}>
                    <HospitalRecommendationPage />
                  </ProtectedRoute>
                } />
                <Route path="/enterprise-dashboard" element={
                  <ProtectedRoute allowedRoles={['patient', 'doctor', 'hospital', 'admin']}>
                    <AIEnterpriseDashboard />
                  </ProtectedRoute>
                } />
                <Route path="/ai-assistant" element={
                  <ProtectedRoute allowedRoles={['patient', 'doctor', 'hospital', 'admin']}>
                    <AIHealthAssistantPage />
                  </ProtectedRoute>
                } />
                <Route path="/predictive-analytics" element={
                  <ProtectedRoute allowedRoles={['patient', 'doctor', 'hospital', 'admin']}>
                    <PredictiveAnalyticsPage />
                  </ProtectedRoute>
                } />
                <Route path="/health-timeline" element={
                  <ProtectedRoute allowedRoles={['patient', 'doctor', 'hospital', 'admin']}>
                    <HealthTimelinePage />
                  </ProtectedRoute>
                } />

                {/* ── Catch-all 404 ─────────────────────────────────────── */}
                <Route path="*" element={<NotFoundPage />} />
              </Routes>
            </Suspense>
          </Router>
        </ToastProvider>
      </WalletProvider>
    </AuthProvider>
  );
}

export default App;
