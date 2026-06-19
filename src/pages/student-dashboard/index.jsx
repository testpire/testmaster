import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import NavigationHeader from '../../components/ui/NavigationHeader';
import RoleBasedNavigation from '../../components/ui/RoleBasedNavigation';
import Icon from '../../components/AppIcon';
import Button from '../../components/ui/Button';
import { formatTimetable } from '../../utils/timetable';
import { isWithinWindow } from '../test-management/testConstants';
import { newAuthService } from '../../services/newAuthService';
import { newUserService } from '../../services/newUserService';
import { newInstituteService } from '../../services/newInstituteService';
import { newTestService } from '../../services/newTestService';
import AssignedTestsWidget from './components/AssignedTestsWidget';

// Defensive readers — the available-test payload isn't strongly typed.
const statusOf = (t) => (t.attemptStatus || t.status || t.attempt?.status || '').toUpperCase();
const scoreOf = (t) => t.score ?? t.marksObtained ?? t.lastScore ?? t.attempt?.score ?? null;
const maxOf = (t) => t.totalMarks ?? t.maxMarks ?? t.maxScore ?? null;
const attemptIdOf = (t) => t.attemptId ?? t.currentAttemptId ?? t.attempt?.id ?? null;
const submittedOf = (t) => t.submittedAt || t.attempt?.submittedAt || t.completedAt || null;
const DONE = ['SUBMITTED', 'COMPLETED', 'GRADED'];
const INPROGRESS = ['IN_PROGRESS', 'STARTED'];

// Literal class strings so Tailwind's JIT keeps them.
const TONES = {
  primary: 'bg-primary/10 text-primary',
  success: 'bg-success/10 text-success',
  warning: 'bg-warning/15 text-warning',
  secondary: 'bg-secondary/10 text-secondary',
};

const StatCard = ({ icon, label, value, suffix, tone = 'primary', hint }) => (
  <div className="bg-card rounded-2xl border border-border p-5 shadow-sm animate-reveal">
    <div className="flex items-center justify-between">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${TONES[tone]}`}>
        <Icon name={icon} size={18} />
      </div>
      {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
    </div>
    <div className="mt-4">
      <div className="font-display text-3xl font-semibold text-foreground nums-tabular leading-none">
        {value}
        {suffix && <span className="text-lg text-muted-foreground font-sans"> {suffix}</span>}
      </div>
      <p className="text-sm text-muted-foreground mt-1.5">{label}</p>
    </div>
  </div>
);

const StudentDashboard = () => {
  const navigate = useNavigate();
  const { user, userProfile, signOut } = useAuth();
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState(null);

  const [profile, setProfile] = useState(userProfile || user || null);
  const [institute, setInstitute] = useState(null);
  const [peers, setPeers] = useState([]);
  const [courseEnrollments, setCourseEnrollments] = useState([]);
  const [batchMemberships, setBatchMemberships] = useState([]);
  const [loading, setLoading] = useState(true);

  const [tests, setTests] = useState([]);
  const [testsLoading, setTestsLoading] = useState(true);
  const [testsError, setTestsError] = useState(null);

  const currentUser = {
    name: profile?.firstName ? `${profile.firstName} ${profile.lastName || ''}`.trim() : 'Student',
    firstName: profile?.firstName || 'Student',
    role: (profile?.role || 'student').toLowerCase().replace('_', '-'),
    email: profile?.email,
    avatar: profile?.avatar || null,
    notifications: 0,
    instituteId: profile?.instituteId,
  };

  useEffect(() => {
    document.title = 'Student Dashboard - TestPire';
  }, []);

  // Load real student data
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      try {
        const { data: profileResp } = await newAuthService.getProfile();
        const resolvedProfile = profileResp?.user || profileResp || userProfile || user;
        if (mounted && resolvedProfile) setProfile(resolvedProfile);

        const instituteId = resolvedProfile?.instituteId;
        const [peersResp, instituteResp, studentResp] = await Promise.all([
          newUserService.getStudentPeers(instituteId),
          instituteId ? newInstituteService.getInstitute(instituteId, { skipAuthRedirect: true }) : Promise.resolve({ data: null }),
          newUserService.getMyStudentProfile(),
        ]);

        if (mounted) {
          setPeers(peersResp?.data || []);
          const inst = instituteResp?.data?.data || instituteResp?.data?.institute || instituteResp?.data || null;
          setInstitute(inst);
          setCourseEnrollments(Array.isArray(studentResp?.data?.courseEnrollments) ? studentResp.data.courseEnrollments : []);
          setBatchMemberships(Array.isArray(studentResp?.data?.batchMemberships) ? studentResp.data.batchMemberships : []);
        }
      } catch (e) {
        console.error('Failed to load student dashboard:', e);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
    // Keyed on the stable auth user id: user/userProfile settle in separate renders,
    // so depending on both would run this load (incl. the /auth/profile fetch) twice.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [(userProfile || user)?.id]);

  // Assigned tests — fetched once here and shared with the widget + stat cards.
  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data, error } = await newTestService.getAvailableTests();
      if (!mounted) return;
      if (error) {
        setTestsError(error.message || 'Unable to load your tests right now.');
        setTests([]);
      } else {
        setTests(Array.isArray(data) ? data : []);
      }
      setTestsLoading(false);
    })();
    return () => { mounted = false; };
  }, []);

  const handleNavigation = (path) => navigate(path);
  const handleMobileNavToggle = () => setIsMobileNavOpen(!isMobileNavOpen);

  const handleLogout = async () => {
    if (isSigningOut) return;
    setIsSigningOut(true);
    setSignOutError(null);
    try {
      if (user) {
        const { error } = await signOut();
        if (error) throw error;
      }
      navigate('/login', { replace: true });
    } catch (error) {
      console.error('Sign out error:', error);
      setSignOutError(error?.message || 'Failed to sign out. Please try again.');
      setTimeout(() => navigate('/login', { replace: true }), 2000);
    } finally {
      setIsSigningOut(false);
    }
  };

  // ── Derived stats (client-side; no backend aggregate endpoint exists) ──────
  const completedTests = tests.filter((t) => DONE.includes(statusOf(t)));
  const inProgressTest = tests.find((t) => INPROGRESS.includes(statusOf(t)));
  const dueCount = tests.filter((t) => {
    const s = statusOf(t);
    return (s === '' || s === 'NOT_STARTED') && isWithinWindow(t.availableFrom, t.availableUntil);
  }).length;
  const pcts = completedTests
    .map((t) => {
      const sc = scoreOf(t);
      const mx = maxOf(t);
      return sc != null && mx ? (Number(sc) / Number(mx)) * 100 : null;
    })
    .filter((x) => x != null);
  const avgScore = pcts.length ? Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length) : null;
  const recentResults = [...completedTests]
    .sort((a, b) => new Date(submittedOf(b) || 0).getTime() - new Date(submittedOf(a) || 0).getTime())
    .slice(0, 3);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const dateline = new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <div className="min-h-screen bg-background">
      {/* Sign Out Error Notification */}
      {signOutError && (
        <div className="fixed top-20 right-4 z-[1020] max-w-sm">
          <div className="bg-destructive text-destructive-foreground p-4 rounded-xl shadow-lg border border-border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Sign out failed</p>
                <p className="text-xs mt-1 opacity-90">{signOutError}</p>
              </div>
              <button onClick={() => setSignOutError(null)} className="ml-2 text-destructive-foreground hover:opacity-80">×</button>
            </div>
          </div>
        </div>
      )}

      {isSigningOut && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-[1015] flex items-center justify-center">
          <div className="bg-card p-6 rounded-2xl shadow-lg border border-border">
            <div className="flex items-center space-x-3">
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-primary/30 border-t-primary"></div>
              <p className="text-foreground">Signing out...</p>
            </div>
          </div>
        </div>
      )}

      <NavigationHeader
        userRole={currentUser?.role}
        userName={currentUser?.name}
        userAvatar={currentUser?.avatar}
        notifications={currentUser?.notifications}
        onLogout={handleLogout}
        onMenuToggle={handleMobileNavToggle}
        showMenuToggle={true}
      />

      <RoleBasedNavigation
        userRole={currentUser?.role}
        activeRoute="/student-dashboard"
        onNavigate={handleNavigation}
        isMobile={window.innerWidth < 1024}
        isOpen={isMobileNavOpen}
        onToggle={handleMobileNavToggle}
      />

      <main className="pt-16 pb-24 lg:pb-8 lg:ml-64">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Greeting hero */}
          <header className="mb-8">
            <p className="text-sm text-muted-foreground">{dateline}</p>
            <h1 className="font-display text-3xl sm:text-4xl font-semibold text-foreground tracking-tight mt-1">
              {greeting}, {currentUser.firstName}
            </h1>
            <p className="text-muted-foreground mt-1.5">
              {institute?.name ? `${institute.name} · your learning space` : 'Welcome to your learning space'}
            </p>
          </header>

          {/* Resume in-progress test */}
          {inProgressTest && (
            <button
              onClick={() => {
                const aid = attemptIdOf(inProgressTest);
                if (aid) navigate(`/test-taking/${aid}`, { state: { durationMinutes: inProgressTest.durationMinutes } });
                else navigate('/my-tests');
              }}
              className="w-full text-left mb-6 group"
            >
              <div className="flex items-center gap-4 rounded-2xl border border-primary/30 bg-primary/5 p-5 transition-colors hover:bg-primary/10">
                <div className="w-11 h-11 rounded-xl bg-primary text-primary-foreground flex items-center justify-center flex-shrink-0">
                  <Icon name="Play" size={20} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold uppercase tracking-wider text-primary">Pick up where you left off</p>
                  <p className="font-semibold text-foreground truncate mt-0.5">
                    {inProgressTest.title || `Test #${inProgressTest.testId ?? inProgressTest.id}`}
                  </p>
                </div>
                <Icon name="ArrowRight" size={20} className="text-primary flex-shrink-0 transition-transform group-hover:translate-x-1" />
              </div>
            </button>
          )}

          {/* Stat strip */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <StatCard
              icon="ClipboardList"
              tone="warning"
              value={testsLoading ? '—' : dueCount}
              label="Tests due"
            />
            <StatCard
              icon="CheckCircle2"
              tone="success"
              value={testsLoading ? '—' : completedTests.length}
              label="Completed"
            />
            <StatCard
              icon="TrendingUp"
              tone="primary"
              value={testsLoading || avgScore == null ? '—' : avgScore}
              suffix={avgScore != null ? '%' : ''}
              label="Average score"
            />
            <StatCard
              icon="BookOpen"
              tone="secondary"
              value={loading ? '—' : courseEnrollments.length}
              label="Courses enrolled"
            />
          </div>

          {/* Assigned tests (shares the dashboard's fetch) */}
          <div className="mb-6">
            <AssignedTestsWidget tests={tests} loading={testsLoading} error={testsError} />
          </div>

          {/* Recent results */}
          {recentResults.length > 0 && (
            <div className="bg-card rounded-2xl border border-border p-6 shadow-sm mb-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-success/10 rounded-xl flex items-center justify-center">
                    <Icon name="Award" size={20} className="text-success" />
                  </div>
                  <h3 className="font-display text-xl font-semibold text-foreground">Recent results</h3>
                </div>
                <button onClick={() => navigate('/my-results')} className="text-sm font-medium text-primary hover:underline underline-offset-4">
                  View all
                </button>
              </div>
              <div className="space-y-2.5">
                {recentResults.map((t, i) => {
                  const score = scoreOf(t);
                  const max = maxOf(t);
                  const pct = score != null && max ? Math.round((Number(score) / Number(max)) * 100) : null;
                  const aid = attemptIdOf(t);
                  return (
                    <button
                      key={t.testId ?? t.id ?? i}
                      onClick={() => aid && navigate(`/test-result/${aid}`)}
                      className="w-full text-left flex items-center justify-between gap-3 p-4 rounded-xl border border-border bg-background/40 hover:bg-muted/40 transition-colors"
                    >
                      <span className="font-medium text-foreground truncate">{t.title || `Test #${t.testId ?? t.id}`}</span>
                      <span className="flex items-center gap-3 flex-shrink-0">
                        {score != null && (
                          <span className="text-sm font-semibold text-foreground nums-tabular">
                            {score}{max != null ? ` / ${max}` : ''}
                          </span>
                        )}
                        {pct != null && (
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-success/10 text-success nums-tabular">{pct}%</span>
                        )}
                        <Icon name="ChevronRight" size={18} className="text-muted-foreground" />
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Profile + Institute + Classmates */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-card rounded-2xl border border-border p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-display text-lg font-semibold text-foreground">My profile</h3>
                <button onClick={() => navigate('/profile')} className="text-sm text-primary hover:underline underline-offset-4">Edit</button>
              </div>
              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-2.5">
                  <Icon name="User" size={16} className="text-muted-foreground" />
                  <span className="text-foreground">{currentUser.name}</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <Icon name="Mail" size={16} className="text-muted-foreground" />
                  <span className="text-foreground truncate">{currentUser.email || '—'}</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <Icon name="Shield" size={16} className="text-muted-foreground" />
                  <span className="text-foreground">{profile?.role || 'STUDENT'}</span>
                </div>
              </div>
            </div>

            <div className="bg-card rounded-2xl border border-border p-6 shadow-sm">
              <h3 className="font-display text-lg font-semibold text-foreground mb-4">My institute</h3>
              {loading ? (
                <p className="text-sm text-muted-foreground">Loading...</p>
              ) : institute ? (
                <div className="space-y-3 text-sm">
                  <div className="flex items-center gap-2.5">
                    <Icon name="Building2" size={16} className="text-muted-foreground" />
                    <span className="text-foreground">{institute.name}</span>
                  </div>
                  {institute.city && (
                    <div className="flex items-center gap-2.5">
                      <Icon name="MapPin" size={16} className="text-muted-foreground" />
                      <span className="text-foreground">{[institute.city, institute.country].filter(Boolean).join(', ')}</span>
                    </div>
                  )}
                  {institute.email && (
                    <div className="flex items-center gap-2.5">
                      <Icon name="Mail" size={16} className="text-muted-foreground" />
                      <span className="text-foreground truncate">{institute.email}</span>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Institute details unavailable.</p>
              )}
            </div>

            <div className="bg-card rounded-2xl border border-border p-6 shadow-sm">
              <h3 className="font-display text-lg font-semibold text-foreground mb-4">Classmates</h3>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-secondary/10 rounded-2xl flex items-center justify-center">
                  <Icon name="Users" size={22} className="text-secondary" />
                </div>
                <div>
                  <p className="font-display text-3xl font-semibold text-foreground nums-tabular leading-none">{loading ? '—' : peers.length}</p>
                  <p className="text-sm text-muted-foreground mt-1">peers in your institute</p>
                </div>
              </div>
            </div>
          </div>

          {/* Courses & Batches */}
          <div className="bg-card rounded-2xl border border-border p-6 shadow-sm mt-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-lg font-semibold text-foreground">My courses & batches</h3>
              <button onClick={() => navigate('/profile')} className="text-sm text-primary hover:underline underline-offset-4">Manage</button>
            </div>
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading...</p>
            ) : courseEnrollments.length === 0 && batchMemberships.length === 0 ? (
              <p className="text-sm text-muted-foreground">No enrollments yet.</p>
            ) : (
              <div className="space-y-4">
                {courseEnrollments.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2.5">Courses</p>
                    <div className="flex flex-wrap gap-2">
                      {courseEnrollments.map((en, i) => (
                        <span
                          key={en.enrollmentId || `c${i}`}
                          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-sm text-foreground"
                        >
                          <Icon name="BookOpen" size={14} className="text-primary" />
                          <span className="font-medium">{en.courseName || `Course #${en.courseId}`}</span>
                          {en.fee != null && (
                            <span className="text-muted-foreground">· ₹{Number(en.fee).toLocaleString('en-IN')}</span>
                          )}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {batchMemberships.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2.5">Batches</p>
                    <div className="flex flex-col gap-2">
                      {batchMemberships.map((m, i) => {
                        const slots = formatTimetable(m.timetable);
                        return (
                          <div
                            key={m.membershipId || `b${i}`}
                            className="flex flex-wrap items-center gap-2 text-sm text-foreground"
                          >
                            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary/10 text-secondary">
                              <Icon name="Users" size={14} />
                              <span className="font-medium">{m.batchName || `Batch #${m.batchId}`}</span>
                            </span>
                            {slots.map((slot, si) => (
                              <span key={si} className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                                <Icon name="Clock" size={12} />{slot}
                              </span>
                            ))}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Peers list */}
          <div className="bg-card rounded-2xl border border-border p-6 shadow-sm mt-6">
            <h3 className="font-display text-lg font-semibold text-foreground mb-4">My classmates</h3>
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading...</p>
            ) : peers.length === 0 ? (
              <p className="text-sm text-muted-foreground">No classmates found.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {peers.slice(0, 12).map((peer, i) => (
                  <div key={peer.id || i} className="flex items-center gap-3 p-2.5 hover:bg-muted/50 rounded-xl transition-colors">
                    <div className="w-9 h-9 bg-secondary/10 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-semibold text-secondary">
                        {([peer.firstName, peer.lastName].filter(Boolean).join(' ') || peer.username || peer.email || 'U').trim()[0].toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {[peer.firstName, peer.lastName].filter(Boolean).join(' ') || peer.username || peer.email}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default StudentDashboard;
