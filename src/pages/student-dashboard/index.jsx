import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import NavigationHeader from '../../components/ui/NavigationHeader';
import RoleBasedNavigation from '../../components/ui/RoleBasedNavigation';
import Icon from '../../components/AppIcon';
import { newAuthService } from '../../services/newAuthService';
import { newUserService } from '../../services/newUserService';
import { newInstituteService } from '../../services/newInstituteService';
import AssignedTestsWidget from './components/AssignedTestsWidget';

const StudentDashboard = () => {
  const navigate = useNavigate();
  const { user, userProfile, signOut } = useAuth();
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState(null);

  const [profile, setProfile] = useState(userProfile || user || null);
  const [institute, setInstitute] = useState(null);
  const [peers, setPeers] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [loading, setLoading] = useState(true);

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
    document.title = 'Student Dashboard - TestMaster';
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
          setEnrollments(Array.isArray(studentResp?.data?.enrollments) ? studentResp.data.enrollments : []);
        }
      } catch (e) {
        console.error('Failed to load student dashboard:', e);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, [user, userProfile]);

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

  return (
    <div className="min-h-screen bg-background">
      {/* Sign Out Error Notification */}
      {signOutError && (
        <div className="fixed top-20 right-4 z-[1020] max-w-sm">
          <div className="bg-destructive text-destructive-foreground p-4 rounded-lg shadow-lg border">
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
          <div className="bg-card p-6 rounded-lg shadow-lg border">
            <div className="flex items-center space-x-3">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
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

      <main className={`pt-16 pb-20 lg:pb-4 ${window.innerWidth >= 1024 ? 'ml-64' : ''}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* Welcome */}
          <div className="bg-gradient-to-r from-primary/10 to-secondary/10 rounded-xl border border-border p-6 mb-6">
            <h1 className="text-2xl font-bold text-foreground mb-1">
              Welcome back, {currentUser.firstName}!
            </h1>
            <p className="text-muted-foreground">
              {institute?.name ? institute.name : 'Your student portal'}
            </p>
          </div>

          {/* Assigned tests — most actionable thing on login, shown up top */}
          <AssignedTestsWidget />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Profile card */}
            <div className="bg-card rounded-lg border border-border p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-foreground">My Profile</h3>
                <button onClick={() => navigate('/profile')} className="text-sm text-primary hover:underline">Edit</button>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex items-center space-x-2">
                  <Icon name="User" size={16} className="text-muted-foreground" />
                  <span className="text-foreground">{currentUser.name}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Icon name="Mail" size={16} className="text-muted-foreground" />
                  <span className="text-foreground">{currentUser.email || '—'}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Icon name="Shield" size={16} className="text-muted-foreground" />
                  <span className="text-foreground">{profile?.role || 'STUDENT'}</span>
                </div>
              </div>
            </div>

            {/* Institute card */}
            <div className="bg-card rounded-lg border border-border p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">My Institute</h3>
              {loading ? (
                <p className="text-sm text-muted-foreground">Loading...</p>
              ) : institute ? (
                <div className="space-y-2 text-sm">
                  <div className="flex items-center space-x-2">
                    <Icon name="Building2" size={16} className="text-muted-foreground" />
                    <span className="text-foreground">{institute.name}</span>
                  </div>
                  {institute.city && (
                    <div className="flex items-center space-x-2">
                      <Icon name="MapPin" size={16} className="text-muted-foreground" />
                      <span className="text-foreground">{[institute.city, institute.country].filter(Boolean).join(', ')}</span>
                    </div>
                  )}
                  {institute.email && (
                    <div className="flex items-center space-x-2">
                      <Icon name="Mail" size={16} className="text-muted-foreground" />
                      <span className="text-foreground">{institute.email}</span>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Institute details unavailable.</p>
              )}
            </div>

            {/* Classmates count */}
            <div className="bg-card rounded-lg border border-border p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">Classmates</h3>
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                  <Icon name="Users" size={22} className="text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{loading ? '...' : peers.length}</p>
                  <p className="text-sm text-muted-foreground">peers in your institute</p>
                </div>
              </div>
            </div>
          </div>

          {/* My Courses & Batches */}
          <div className="bg-card rounded-lg border border-border p-6 mt-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-foreground">My Courses & Batches</h3>
              <button onClick={() => navigate('/profile')} className="text-sm text-primary hover:underline">Manage</button>
            </div>
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading...</p>
            ) : enrollments.length === 0 ? (
              <p className="text-sm text-muted-foreground">No enrollments yet.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {enrollments.map((en, i) => (
                  <span
                    key={en.enrollmentId || i}
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-sm text-foreground"
                  >
                    <Icon name="BookOpen" size={14} className="text-primary" />
                    <span className="font-medium">{en.courseName || `Course #${en.courseId}`}</span>
                    {en.batchName && (
                      <span className="text-muted-foreground">· {en.batchName}</span>
                    )}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Peers list */}
          <div className="bg-card rounded-lg border border-border p-6 mt-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">My Classmates</h3>
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading...</p>
            ) : peers.length === 0 ? (
              <p className="text-sm text-muted-foreground">No classmates found.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {peers.slice(0, 12).map((peer, i) => (
                  <div key={peer.id || i} className="flex items-center space-x-3 p-2 hover:bg-muted/50 rounded">
                    <div className="w-8 h-8 bg-secondary/10 rounded-full flex items-center justify-center">
                      <Icon name="User" size={14} className="text-secondary" />
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
