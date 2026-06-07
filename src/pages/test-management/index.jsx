import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useSuperAdmin } from '../../contexts/SuperAdminContext';
import PageLayout from '../../components/layout/PageLayout';
import Icon from '../../components/AppIcon';
import Button from '../../components/ui/Button';
import { newTestService } from '../../services/newTestService';
import TestFormModal from './components/TestFormModal';
import QuestionPickerModal from './components/QuestionPickerModal';
import AssignTestModal from './components/AssignTestModal';
import TestResultsModal from './components/TestResultsModal';
import { TEST_STATUS_BADGE, prettyEnum, formatDateTime } from './testConstants';

const TestManagement = () => {
  const { user, userProfile } = useAuth();
  const currentUser = userProfile || user;

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
  const [statusFilter, setStatusFilter] = useState('');
  const [searchText, setSearchText] = useState('');

  // Modal state — each holds the test being acted on (or true for create).
  const [formTest, setFormTest] = useState(null); // {} for create, test obj for edit
  const [pickerTest, setPickerTest] = useState(null);
  const [assignTest, setAssignTest] = useState(null);
  const [resultsTest, setResultsTest] = useState(null);
  const [busyId, setBusyId] = useState(null); // id mid publish/delete

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
      if (statusFilter && (t.status || '').toUpperCase() !== statusFilter) return false;
      if (searchText.trim()) {
        const q = searchText.trim().toLowerCase();
        return (
          (t.title || '').toLowerCase().includes(q) ||
          (t.description || '').toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [tests, statusFilter, searchText]);

  const handlePublish = async (test) => {
    if ((test.questionCount ?? (test.questions?.length || 0)) === 0) {
      setError('Add at least one question before publishing.');
      return;
    }
    setBusyId(test.id);
    const { error: pubErr } = await newTestService.publishTest(test.id);
    setBusyId(null);
    if (pubErr) {
      setError(pubErr.message || 'Failed to publish test');
    } else {
      loadTests();
    }
  };

  const handleDelete = async (test) => {
    if (!window.confirm(`Delete test "${test.title}"? This cannot be undone.`)) return;
    const previous = tests;
    setTests((prev) => prev.filter((t) => t.id !== test.id));
    const { error: delErr } = await newTestService.deleteTest(test.id);
    if (delErr) {
      setTests(previous);
      setError(delErr.message || 'Failed to delete test');
    }
  };

  const defaultInstituteId = isSuperAdmin
    ? superAdminContext?.selectedInstitute?.id
    : currentUser?.instituteId;

  const inputCls =
    'px-3 py-2 border border-border rounded-md bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary';

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
              <h1 className="text-xl lg:text-2xl font-bold text-foreground">Test Management</h1>
              <p className="text-sm text-muted-foreground mt-1">
                {loading && tests.length === 0
                  ? 'Loading tests...'
                  : `${filtered.length} test${filtered.length === 1 ? '' : 's'}`}
              </p>
            </div>
            <Button
              variant="default"
              onClick={() => setFormTest({})}
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
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className={inputCls}
            >
              <option value="">All statuses</option>
              <option value="DRAFT">Draft</option>
              <option value="PUBLISHED">Published</option>
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
              <Icon name="ClipboardList" size={48} className="mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-medium text-foreground mb-2">No Tests Found</h3>
              <p className="text-muted-foreground mb-4">
                Create your first test or adjust the filters.
              </p>
              <Button variant="default" onClick={() => setFormTest({})} iconName="Plus" iconPosition="left">
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
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Questions</th>
                    <th className="px-4 py-3 font-medium">Total Marks</th>
                    <th className="px-4 py-3 font-medium">Duration</th>
                    <th className="px-4 py-3 font-medium">Window</th>
                    <th className="px-4 py-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.map((test) => {
                    const status = (test.status || '').toUpperCase();
                    const qCount = test.questionCount ?? (test.questions?.length || 0);
                    const isBusy = busyId === test.id;
                    return (
                      <tr key={test.id} className="hover:bg-muted/20">
                        <td className="px-4 py-3">
                          <div className="font-medium text-foreground">{test.title || '—'}</div>
                          {test.description && (
                            <div className="text-xs text-muted-foreground line-clamp-1">
                              {test.description}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                              TEST_STATUS_BADGE[status] || 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {prettyEnum(test.status) || '—'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{qCount}</td>
                        <td className="px-4 py-3 text-muted-foreground">{test.totalMarks ?? 0}</td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {test.durationMinutes ? `${test.durationMinutes} min` : '—'}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground text-xs">
                          {test.availableFrom || test.availableUntil ? (
                            <>
                              {formatDateTime(test.availableFrom)}
                              <br />→ {formatDateTime(test.availableUntil)}
                            </>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Manage questions"
                              onClick={() => setPickerTest(test)}
                              className="w-8 h-8"
                            >
                              <Icon name="ListChecks" size={16} />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Assign"
                              onClick={() => setAssignTest(test)}
                              className="w-8 h-8"
                            >
                              <Icon name="Send" size={16} />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Results"
                              onClick={() => setResultsTest(test)}
                              className="w-8 h-8"
                            >
                              <Icon name="BarChart3" size={16} />
                            </Button>
                            {status === 'DRAFT' && (
                              <Button
                                variant="ghost"
                                size="icon"
                                title="Publish"
                                disabled={isBusy}
                                onClick={() => handlePublish(test)}
                                className="w-8 h-8 text-green-600"
                              >
                                <Icon name={isBusy ? 'Loader2' : 'Upload'} size={16} className={isBusy ? 'animate-spin' : ''} />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Edit"
                              onClick={() => setFormTest(test)}
                              className="w-8 h-8"
                            >
                              <Icon name="Pencil" size={16} />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Delete"
                              onClick={() => handleDelete(test)}
                              className="w-8 h-8 text-destructive"
                            >
                              <Icon name="Trash2" size={16} />
                            </Button>
                          </div>
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

      {/* Modals */}
      {formTest && (
        <TestFormModal
          isOpen={!!formTest}
          editMode={!!formTest.id}
          existingTest={formTest.id ? formTest : null}
          defaultInstituteId={defaultInstituteId}
          onClose={() => setFormTest(null)}
          onSuccess={(created) => {
            loadTests();
            // After creating a brand-new test, jump straight into the question picker.
            if (!formTest.id && created?.id) setPickerTest(created);
          }}
        />
      )}

      {pickerTest && (
        <QuestionPickerModal
          isOpen={!!pickerTest}
          test={pickerTest}
          onClose={() => setPickerTest(null)}
          onSuccess={() => loadTests()}
        />
      )}

      {assignTest && (
        <AssignTestModal
          isOpen={!!assignTest}
          test={assignTest}
          onClose={() => setAssignTest(null)}
          onChanged={() => loadTests()}
        />
      )}

      {resultsTest && (
        <TestResultsModal
          isOpen={!!resultsTest}
          test={resultsTest}
          onClose={() => setResultsTest(null)}
        />
      )}
    </PageLayout>
  );
};

export default TestManagement;
