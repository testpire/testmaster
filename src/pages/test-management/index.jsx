import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useSuperAdmin } from '../../contexts/SuperAdminContext';
import PageLayout from '../../components/layout/PageLayout';
import Icon from '../../components/AppIcon';
import Button from '../../components/ui/Button';
import { newTestService } from '../../services/newTestService';
import TestFormModal from './components/TestFormModal';
import {
  TEST_AVAILABILITY_BADGE,
  formatDate,
  formatDateTime,
  getTestAvailability,
  TEST_TYPES,
  TEST_TYPE_BADGE,
  TEST_TYPE_LABEL,
  TEST_TYPE_ICON,
  normalizeTestType
} from './testConstants';

// List filter by computed availability (replaces the redundant Draft/Published
// status filter — "Open" covers both a windowed-open and an always-open test).
const AVAILABILITY_FILTERS = [
  { value: 'DRAFT', label: 'Draft' },
  { value: 'OPEN', label: 'Open' },
  { value: 'EXPIRED', label: 'Expired' }
];
const matchesAvailabilityFilter = (state, filter) => {
  if (filter === 'OPEN') return state === 'OPEN' || state === 'ALWAYS_OPEN';
  return state === filter;
};

const TestManagement = () => {
  const { user, userProfile } = useAuth();
  const currentUser = userProfile || user;
  const navigate = useNavigate();

  // SuperAdmin context is only present under the super-admin guard branch.
  let superAdminContext = null;
  try {
    superAdminContext = useSuperAdmin();
  } catch (e) {
    // Not in super-admin context (INST_ADMIN / TEACHER) — fine.
  }

  const isSuperAdmin =
    currentUser?.role === 'SUPER_ADMIN' || currentUser?.role === 'super-admin';

  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [availabilityFilter, setAvailabilityFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [searchText, setSearchText] = useState('');

  // Create modal only — viewing/editing/assigning/etc. all live on the detail page now.
  const [showCreate, setShowCreate] = useState(false);

  const loadTests = async () => {
    if (!currentUser) return;
    setLoading(true);
    setError(null);
    const { data, error: loadErr } = await newTestService.listTests();
    if (loadErr) {
      setError(loadErr.message || 'Failed to load tests');
      setTests([]);
    } else {
      setTests(Array.isArray(data) ? data : []);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (currentUser) loadTests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser]);

  // Reload when a super-admin switches institute.
  useEffect(() => {
    if (currentUser && superAdminContext?.selectedInstitute?.id) loadTests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [superAdminContext?.selectedInstitute?.id]);

  const filtered = useMemo(() => {
    return tests.filter((t) => {
      if (availabilityFilter && !matchesAvailabilityFilter(getTestAvailability(t).state, availabilityFilter)) return false;
      if (typeFilter && normalizeTestType(t.type) !== typeFilter) return false;
      if (searchText.trim()) {
        const q = searchText.trim().toLowerCase();
        return (
          (t.title || '').toLowerCase().includes(q) ||
          (t.description || '').toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [tests, availabilityFilter, typeFilter, searchText]);

  const openTest = (test) => navigate(`/test-management/${test.id}`);

  const defaultInstituteId = isSuperAdmin
    ? superAdminContext?.selectedInstitute?.id
    : currentUser?.instituteId;

  const inputCls =
    'px-3 py-2 border border-input rounded-lg bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring/70 focus:border-primary';

  return (
    <PageLayout
      title="Test Management"
      activeRoute="/test-management"
      showInstituteDropdown={isSuperAdmin && !!superAdminContext}
      institutes={superAdminContext?.allInstitutes || []}
      selectedInstitute={superAdminContext?.selectedInstitute || null}
      onInstituteChange={superAdminContext?.handleInstituteChange || (() => {})}
      institutesLoading={superAdminContext?.institutesLoading || false}
    >
      <div className="h-full flex flex-col">
        {/* Header + filters */}
        <div className="bg-background border-b border-border px-4 lg:px-6 py-4 space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
            <div>
              <h1 className="text-xl lg:text-2xl font-display font-semibold text-foreground">Test Management</h1>
              <p className="text-sm text-muted-foreground mt-1">
                {loading && tests.length === 0
                  ? 'Loading tests...'
                  : `${filtered.length} test${filtered.length === 1 ? '' : 's'}`}
              </p>
            </div>
            <Button
              variant="default"
              onClick={() => setShowCreate(true)}
              iconName="Plus"
              iconPosition="left"
              className="text-sm"
            >
              Create Test
            </Button>
          </div>

          <div className="flex flex-col sm:flex-row flex-wrap gap-2">
            <div className="relative flex-1 min-w-0 sm:min-w-[200px]">
              <Icon
                name="Search"
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              />
              <input
                type="text"
                placeholder="Search tests..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                className={`w-full pl-10 ${inputCls}`}
              />
            </div>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className={inputCls}
            >
              <option value="">All types</option>
              {TEST_TYPES.map((tt) => (
                <option key={tt} value={tt}>
                  {TEST_TYPE_LABEL[tt]}
                </option>
              ))}
            </select>
            <select
              value={availabilityFilter}
              onChange={(e) => setAvailabilityFilter(e.target.value)}
              className={inputCls}
            >
              <option value="">All</option>
              {AVAILABILITY_FILTERS.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-4 lg:p-6">
          {error && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 mb-4 flex items-center justify-between">
              <p className="text-destructive text-sm">{error}</p>
              <button onClick={() => setError(null)} className="text-destructive hover:opacity-70">
                <Icon name="X" size={16} />
              </button>
            </div>
          )}

          {loading && tests.length === 0 && (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2" />
                <p className="text-muted-foreground">Loading tests...</p>
              </div>
            </div>
          )}

          {!loading && !error && filtered.length === 0 && (
            <div className="text-center py-12">
              <Icon name="ClipboardList" size={48} className="mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-display font-semibold text-foreground mb-2">No Tests Found</h3>
              <p className="text-muted-foreground mb-4">
                Create your first test or adjust the filters.
              </p>
              <Button variant="default" onClick={() => setShowCreate(true)} iconName="Plus" iconPosition="left">
                Create Test
              </Button>
            </div>
          )}

          {filtered.length > 0 && (
            <div className="overflow-x-auto border border-border rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-left text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-medium">Title</th>
                    <th className="px-4 py-3 font-medium">Availability</th>
                    <th className="px-4 py-3 font-medium">Questions</th>
                    <th className="px-4 py-3 font-medium">Total Marks</th>
                    <th className="px-4 py-3 font-medium">Duration</th>
                    <th className="px-4 py-3 font-medium">Created</th>
                    <th className="px-4 py-3 font-medium w-8" aria-label="Open" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.map((test) => {
                    const qCount = test.questionCount ?? (test.questions?.length || 0);
                    const availability = getTestAvailability(test);
                    return (
                      <tr
                        key={test.id}
                        onClick={() => openTest(test)}
                        className="hover:bg-muted/30 cursor-pointer transition-colors"
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-foreground">{test.title || '—'}</span>
                            {(() => {
                              const tt = normalizeTestType(test.type);
                              return (
                                <span
                                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${TEST_TYPE_BADGE[tt]}`}
                                  title={TEST_TYPE_LABEL[tt]}
                                >
                                  <Icon name={TEST_TYPE_ICON[tt]} size={11} />
                                  {TEST_TYPE_LABEL[tt]}
                                </span>
                              );
                            })()}
                          </div>
                          {test.description && (
                            <div className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                              {test.description}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${TEST_AVAILABILITY_BADGE[availability.state]}`}
                            title={availability.detail}
                          >
                            <Icon name="Clock" size={11} />
                            {availability.label}
                          </span>
                          {(test.availableFrom || test.availableUntil) && (
                            <div className="text-[11px] text-muted-foreground mt-1">
                              {formatDateTime(test.availableFrom)} → {formatDateTime(test.availableUntil)}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{qCount}</td>
                        <td className="px-4 py-3 text-muted-foreground">{test.totalMarks ?? 0}</td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {test.durationMinutes ? `${test.durationMinutes} min` : '—'}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                          {formatDate(test.createdAt)}
                        </td>
                        <td className="px-4 py-3 text-right text-muted-foreground">
                          <Icon name="ChevronRight" size={16} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Create — after creating, jump straight to the new test's detail page. */}
      {showCreate && (
        <TestFormModal
          isOpen={showCreate}
          editMode={false}
          existingTest={null}
          defaultInstituteId={defaultInstituteId}
          onClose={() => setShowCreate(false)}
          onSuccess={(created) => {
            setShowCreate(false);
            if (created?.id) navigate(`/test-management/${created.id}`);
            else loadTests();
          }}
        />
      )}
    </PageLayout>
  );
};

export default TestManagement;
