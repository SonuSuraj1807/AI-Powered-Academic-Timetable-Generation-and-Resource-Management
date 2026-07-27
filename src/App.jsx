/**
 * App — Root component with React Router route definitions.
 * 
 * Route structure:
 * /                → LandingPage (triple-portal auth gateway)
 * /admin           → DashboardLayout > AdminDashboard
 * /admin/generate  → DashboardLayout > TimetableGenerator
 * /admin/exam-scheduler → DashboardLayout > ExamSchedulerPage
 * /faculty         → DashboardLayout > FacultyDashboard
 * /student         → DashboardLayout > StudentDashboard
 */
import { useEffect, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import useAuthStore from './stores/authStore';
import ErrorBoundary from './components/ui/ErrorBoundary';
import { ToastProvider } from './components/ui/Toast';

// Lazy load pages for code splitting
const LandingPage = lazy(() => import('./pages/LandingPage'));
const DashboardLayout = lazy(() => import('./layouts/DashboardLayout'));
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const TimetableGenerator = lazy(() => import('./pages/admin/TimetableGenerator'));
const ExamSchedulerPage = lazy(() => import('./pages/admin/ExamSchedulerPage'));
const FacultyDashboard = lazy(() => import('./pages/faculty/FacultyDashboard'));
const StudentDashboard = lazy(() => import('./pages/student/StudentDashboard'));

// Real-time admin views
const ViewSchedules = lazy(() => import('./pages/admin/ViewSchedules'));
const FacultyManagement = lazy(() => import('./pages/admin/FacultyManagement'));
const CurriculumRegistryPage = lazy(() => import('./pages/admin/CurriculumRegistryPage'));
const TrainingOverridesPage = lazy(() => import('./pages/admin/TrainingOverridesPage'));
const ReportsAnalytics = lazy(() => import('./pages/admin/ReportsAnalytics'));

const SubstitutionEnginePage = lazy(() => import('./pages/admin/SubstitutionEnginePage'));
const SubstitutionListPage = lazy(() => import('./pages/faculty/SubstitutionListPage'));

// Examination Branch Seating Plan
const ExamSeatingController = lazy(() => import('./pages/admin/ExamSeatingController'));
const ExamRoomManagement = lazy(() => import('./pages/admin/ExamRoomManagement'));

// Super Admin Console Pages (Hidden URL Access)
const SuperAdminLogin = lazy(() => import('./pages/superadmin/SuperAdminLogin'));
const SuperAdminDashboard = lazy(() => import('./pages/superadmin/SuperAdminDashboard'));

// Loading fallback
function LoadingScreen() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg-primary)',
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{
          width: '48px', height: '48px',
          border: '3px solid var(--border-primary)',
          borderTopColor: 'var(--accent-primary)',
          borderRadius: '50%',
          margin: '0 auto 16px',
          animation: 'spin 0.8s linear infinite',
        }} />
        <p style={{ color: 'var(--text-tertiary)', fontSize: '0.875rem' }}>Loading...</p>
      </div>
    </div>
  );
}

// Protected route wrapper
function ProtectedRoute({ children, requiredRole }) {
  const { user, role, loading, initialized } = useAuthStore();

  if (!initialized || loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/" replace />;
  if (requiredRole && role !== requiredRole) {
    const roleRoutes = { admin: '/admin', faculty: '/faculty', student: '/student' };
    return <Navigate to={roleRoutes[role] || '/'} replace />;
  }

  return children;
}

export default function App() {
  const initializeAuth = useAuthStore((s) => s.initializeAuth);

  useEffect(() => {
    const unsubscribe = initializeAuth();
    return () => unsubscribe && unsubscribe();
  }, [initializeAuth]);

  return (
    <ErrorBoundary>
      <ToastProvider>
        <BrowserRouter>
          <Suspense fallback={<LoadingScreen />}>
            <Routes>
              {/* Landing / Auth */}
              <Route path="/" element={<LandingPage />} />

              {/* Admin Panel */}
              <Route path="/admin" element={
                <ProtectedRoute requiredRole="admin">
                  <DashboardLayout />
                </ProtectedRoute>
              }>
                <Route index element={<AdminDashboard />} />
                <Route path="generate" element={<TimetableGenerator />} />
                <Route path="exam-scheduler" element={<ExamSchedulerPage />} />
                <Route path="schedules" element={<ViewSchedules />} />
                <Route path="faculty" element={<FacultyManagement />} />
                <Route path="curriculum" element={<CurriculumRegistryPage />} />
                <Route path="overrides" element={<TrainingOverridesPage />} />
                <Route path="substitutions" element={<SubstitutionEnginePage />} />
                <Route path="reports" element={<ReportsAnalytics />} />
                <Route path="exam-seating" element={<ExamSeatingController />} />
                <Route path="exam-rooms" element={<ExamRoomManagement />} />
                <Route path="settings" element={<PlaceholderPage title="Admin Settings" description="System configuration and user management." />} />
              </Route>

              {/* Faculty Panel */}
              <Route path="/faculty" element={
                <ProtectedRoute requiredRole="faculty">
                  <DashboardLayout />
                </ProtectedRoute>
              }>
                <Route index element={<FacultyDashboard />} />
                <Route path="substitutions" element={<SubstitutionListPage />} />
                <Route path="schedule" element={<PlaceholderPage title="My Schedule" description="Your full weekly timetable." />} />
                <Route path="subjects" element={<PlaceholderPage title="My Subjects" description="Subjects assigned to you across all sections." />} />
                <Route path="settings" element={<PlaceholderPage title="Faculty Settings" description="Update your profile and preferences." />} />
              </Route>

              {/* Student Panel */}
              <Route path="/student" element={
                <ProtectedRoute requiredRole="student">
                  <DashboardLayout />
                </ProtectedRoute>
              }>
                <Route index element={<StudentDashboard />} />
                <Route path="timetable" element={<PlaceholderPage title="Class Timetable" description="Your section's full timetable with export options." />} />
                <Route path="exams" element={<PlaceholderPage title="Exam Schedule" description="Upcoming examination schedule with room assignments." />} />
                <Route path="settings" element={<PlaceholderPage title="Student Settings" description="Update your profile." />} />
              </Route>

              {/* Hidden Super Admin Gateway */}
              <Route path="/superadminconsole" element={<SuperAdminLogin />} />
              <Route path="/superadmin" element={
                <ProtectedRoute requiredRole="superadmin">
                  <DashboardLayout />
                </ProtectedRoute>
              }>
                <Route index element={<SuperAdminDashboard />} />
              </Route>

              {/* Catch all */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </ToastProvider>
    </ErrorBoundary>
  );
}

// Temporary placeholder for routes not yet fully built
function PlaceholderPage({ title, description }) {
  return (
    <div style={{ 
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      minHeight: '400px', textAlign: 'center', padding: '40px',
    }}>
      <div style={{
        width: '64px', height: '64px', borderRadius: '16px',
        background: 'var(--accent-blue-subtle)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: '20px',
      }}>
        <span style={{ fontSize: '28px' }}>🚧</span>
      </div>
      <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '8px' }}>{title}</h2>
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', maxWidth: '400px' }}>{description}</p>
      <span className="badge badge-amber" style={{ marginTop: '16px' }}>Coming Soon</span>
    </div>
  );
}
