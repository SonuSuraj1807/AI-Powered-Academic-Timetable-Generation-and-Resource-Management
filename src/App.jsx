/**
 * App — Root component with React Router route definitions.
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
const FacultySchedulePage = lazy(() => import('./pages/faculty/FacultySchedulePage'));
const FacultySubjectsPage = lazy(() => import('./pages/faculty/FacultySubjectsPage'));
const FacultySettingsPage = lazy(() => import('./pages/faculty/FacultySettingsPage'));

const StudentSettingsPage = lazy(() => import('./pages/student/StudentSettingsPage'));
const AdminSettingsPage = lazy(() => import('./pages/admin/AdminSettingsPage'));

// Examination Branch Seating Plan
const ExamSeatingController = lazy(() => import('./pages/admin/ExamSeatingController'));
const ExamRoomManagement = lazy(() => import('./pages/admin/ExamRoomManagement'));

// Venue & Auditorium Allocation System
const ManageClubLeads = lazy(() => import('./components/admin/ManageClubLeads'));
const VenueOversightView = lazy(() => import('./components/admin/VenueOversightView'));
const SacDirectorDashboard = lazy(() => import('./pages/approvers/SacDirectorDashboard'));
const PrincipalDashboard = lazy(() => import('./pages/approvers/PrincipalDashboard'));
const FacilityBookingSection = lazy(() => import('./components/student/FacilityBookingSection'));

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
    if (role === 'superadmin') return children;
    if ((role === 'hod' || role === 'dept_admin' || role === 'exam_controller') && requiredRole === 'admin') return children;

    const roleRoutes = { 
      admin: '/admin', 
      hod: '/admin',
      dept_admin: '/admin',
      sac_director: '/sac-director',
      principal: '/principal',
      faculty: '/faculty', 
      student: '/student', 
      superadmin: '/superadmin', 
      exam_controller: '/admin/exam-scheduler' 
    };
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
                <Route path="club-leads" element={<ManageClubLeads />} />
                <Route path="venue-oversight" element={<VenueOversightView />} />
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
                <Route path="settings" element={<AdminSettingsPage />} />
              </Route>

              {/* SAC Director Console (Tier 1 Approver) */}
              <Route path="/sac-director" element={
                <ProtectedRoute requiredRole="sac_director">
                  <DashboardLayout />
                </ProtectedRoute>
              }>
                <Route index element={<SacDirectorDashboard />} />
              </Route>

              {/* Principal Console (Tier 2 Approver) */}
              <Route path="/principal" element={
                <ProtectedRoute requiredRole="principal">
                  <DashboardLayout />
                </ProtectedRoute>
              }>
                <Route index element={<PrincipalDashboard />} />
              </Route>

              {/* Faculty Panel */}
              <Route path="/faculty" element={
                <ProtectedRoute requiredRole="faculty">
                  <DashboardLayout />
                </ProtectedRoute>
              }>
                <Route index element={<FacultyDashboard />} />
                <Route path="substitutions" element={<SubstitutionListPage />} />
                <Route path="schedule" element={<FacultySchedulePage />} />
                <Route path="subjects" element={<FacultySubjectsPage />} />
                <Route path="settings" element={<FacultySettingsPage />} />
              </Route>

              {/* Student Panel */}
              <Route path="/student" element={
                <ProtectedRoute requiredRole="student">
                  <DashboardLayout />
                </ProtectedRoute>
              }>
                <Route index element={<StudentDashboard />} />
                <Route path="facility-booking" element={<FacilityBookingSection />} />
                <Route path="timetable" element={<StudentDashboard />} />
                <Route path="exams" element={<StudentDashboard />} />
                <Route path="settings" element={<StudentSettingsPage />} />
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
