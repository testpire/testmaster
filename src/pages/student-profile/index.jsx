import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import PageLayout from '../../components/layout/PageLayout';
import Icon from '../../components/AppIcon';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import AttemptReview from '../../components/test/AttemptReview';
import { newUserService } from '../../services/newUserService';
import { newTestService } from '../../services/newTestService';
import { cn } from '../../utils/cn';
import { formatTimetable } from '../../utils/timetable';

// Format an ISO date (or date-only) string for display; blanks fall back to "—".
const fmtDate = (v) => {
  if (!v) return '—';
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return String(v);
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
};

const fmtPct = (n) => (n == null ? '—' : `${Number(n).toFixed(1)}%`);

// A single label/value pair inside an info card. Empty values render as "—".
const Field = ({ label, value, full = false }) => (
  <div className={cn('min-w-0', full && 'sm:col-span-2')}>
    <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</dt>
    <dd className="mt-0.5 text-sm text-foreground break-words">
      {value === 0 || value ? value : <span className="text-muted-foreground">—</span>}
    </dd>
  </div>
);

const Card = ({ title, icon, children, action }) => (
  <div className="bg-card rounded-lg border border-border">
    <div className="flex items-center justify-between px-5 py-3 border-b border-border">
      <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
        {icon && <Icon name={icon} size={16} className="text-muted-foreground" />}
        {title}
      </h2>
      {action}
    </div>
    <div className="p-5">{children}</div>
  </div>
);

const StudentProfile = () => {
  const { studentId } = useParams();
  const navigate = useNavigate();

  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Test history loads independently so student details render immediately.
  const [tests, setTests] = useState([]);
  const [testsLoading, setTestsLoading] = useState(true);
  const [testsError, setTestsError] = useState(null);

  // Per-question drill-down (staff endpoint may not exist yet — degrade gracefully).
  const [detailRow, setDetailRow] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState(null);

  useEffect(() => {
    document.title = 'Student Profile - TestMaster';
  }, []);

  // Load A: student details (fast).
  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      setError(null);
      const { data, error: err } = await newUserService.getStudentById(studentId);
      if (!active) return;
      if (err || !data) {
        setError(err?.message || 'Failed to load this student');
        setStudent(null);
      } else {
        setStudent(data);
      }
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [studentId]);

  // Load B: aggregated test history (lazy / heavier).
  useEffect(() => {
    let active = true;
    (async () => {
      setTestsLoading(true);
      setTestsError(null);
      const { data, error: err } = await newTestService.getResultsForStudent(studentId);
      if (!active) return;
      if (err) setTestsError(err?.message || 'Failed to load test history');
      setTests(Array.isArray(data) ? data : []);
      setTestsLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [studentId]);

  const fullName = student
    ? `${student.firstName || ''} ${student.lastName || ''}`.trim() || student.username || 'Student'
    : '';
  const initial = (student?.firstName || student?.username || 'S')[0]?.toUpperCase();
  const courseEnrollments = Array.isArray(student?.courseEnrollments) ? student.courseEnrollments : [];
  const batchMemberships = Array.isArray(student?.batchMemberships) ? student.batchMemberships : [];

  // Summary stats across the student's graded tests.
  const scored = tests.map((t) => t.percentage).filter((p) => p != null).map(Number);
  const avgPct = scored.length ? scored.reduce((a, b) => a + b, 0) / scored.length : null;
  const passedCount = tests.filter((t) => t.passed === true).length;

  const openAttempt = async (row) => {
    if (!row.attemptId) return;
    setDetailRow(row);
    setDetail(null);
    setDetailError(null);
    setDetailLoading(true);
    const { data, error: err } = await newTestService.getStaffAttempt(row.testId, row.attemptId);
    if (err || !data) {
      setDetailError(err?.message || 'This attempt breakdown is not available yet.');
    } else {
      setDetail(data);
    }
    setDetailLoading(false);
  };

  const closeAttempt = () => {
    setDetailRow(null);
    setDetail(null);
    setDetailError(null);
  };

  return (
    <PageLayout title="Student Profile">
      <div className="p-4 lg:p-6 max-w-5xl mx-auto w-full">
        <button
          onClick={() => navigate('/student-management')}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <Icon name="ArrowLeft" size={16} /> Back to Students
        </button>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : error ? (
          <div className="text-center py-20">
            <Icon name="AlertCircle" size={40} className="mx-auto mb-3 text-destructive" />
            <p className="text-foreground font-medium mb-4">{error}</p>
            <Button variant="outline" onClick={() => navigate('/student-management')} iconName="ArrowLeft" iconPosition="left">
              Back to Students
            </Button>
          </div>
        ) : (
          <div className="space-y-5">
            {/* Header card */}
            <div className="bg-card rounded-lg border border-border p-5 flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                <span className="text-green-600 font-semibold text-2xl">{initial}</span>
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="text-2xl font-bold text-foreground truncate">{fullName}</h1>
                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <Icon name="AtSign" size={14} />
                    {student.username || '—'}
                  </span>
                  <span>Student ID: {student.id}</span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    Active
                  </span>
                </div>
              </div>
            </div>

            {/* Contact & personal */}
            <Card title="Contact & Personal" icon="User">
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
                <Field label="Email" value={student.email} />
                <Field label="Phone" value={student.phone} />
                <Field label="Gender" value={student.gender} />
                <Field label="Date of Birth" value={student.dateOfBirth ? fmtDate(student.dateOfBirth) : null} />
                <Field label="Current Class" value={student.currentClass} />
                <Field label="Roll Number" value={student.rollNumber} />
                <Field label="Blood Group" value={student.bloodGroup} />
                <Field label="Emergency Contact" value={student.emergencyContact} />
                <Field label="Address" value={student.address} full />
              </dl>
            </Card>

            {/* Parent / Guardian */}
            <Card title="Parent / Guardian" icon="Users">
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
                <Field label="Parent Name" value={student.parentName} />
                <Field label="Parent Phone" value={student.parentPhone} />
                <Field label="Parent Email" value={student.parentEmail} full />
              </dl>
            </Card>

            {/* Courses */}
            <Card title="Enrolled Courses" icon="BookOpen">
              {courseEnrollments.length > 0 ? (
                <ul className="divide-y divide-border">
                  {courseEnrollments.map((en, i) => (
                    <li key={en.enrollmentId || i} className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0">
                      <div className="flex items-center gap-2 min-w-0">
                        <Icon name="GraduationCap" size={16} className="text-muted-foreground flex-shrink-0" />
                        <span className="text-sm font-medium text-foreground truncate">
                          {en.courseName || `Course #${en.courseId}`}
                        </span>
                      </div>
                      {en.fee != null && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-emerald-50 text-emerald-700 flex-shrink-0 ml-3">
                          <Icon name="IndianRupee" size={11} />₹{Number(en.fee).toLocaleString('en-IN')}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              ) : student.course ? (
                <p className="text-sm text-foreground">{student.course}</p>
              ) : (
                <p className="text-sm text-muted-foreground">Not enrolled in any course yet.</p>
              )}
            </Card>

            {/* Batches */}
            <Card title="Batches" icon="Users">
              {batchMemberships.length > 0 ? (
                <ul className="divide-y divide-border">
                  {batchMemberships.map((m, i) => {
                    const slots = formatTimetable(m.timetable);
                    return (
                      <li key={m.membershipId || i} className="flex items-start justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                        <div className="flex items-center gap-2 min-w-0">
                          <Icon name="Users" size={16} className="text-muted-foreground flex-shrink-0" />
                          <span className="text-sm font-medium text-foreground truncate">
                            {m.batchName || `Batch #${m.batchId}`}
                          </span>
                        </div>
                        {slots.length > 0 ? (
                          <div className="flex flex-wrap justify-end gap-1 flex-shrink-0">
                            {slots.map((slot, si) => (
                              <span key={si} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-violet-50 text-violet-700">
                                <Icon name="Clock" size={11} />{slot}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">No timetable</span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">Not assigned to any batch yet.</p>
              )}
            </Card>

            {/* Test history */}
            <Card title="Test History" icon="ClipboardList">
              {testsLoading ? (
                <div className="flex items-center justify-center py-10">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
                </div>
              ) : (
                <>
                  {testsError && (
                    <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg flex items-center gap-2 mb-4">
                      <Icon name="AlertCircle" size={16} className="text-destructive" />
                      <p className="text-destructive text-sm font-medium">{testsError}</p>
                    </div>
                  )}

                  {tests.length === 0 ? (
                    <div className="text-center py-8">
                      <Icon name="ClipboardList" size={36} className="mx-auto mb-2 text-muted-foreground opacity-50" />
                      <p className="text-sm text-muted-foreground">No graded tests for this student yet.</p>
                    </div>
                  ) : (
                    <>
                      {/* Summary stats */}
                      <div className="grid grid-cols-3 gap-3 mb-4">
                        <div className="rounded-lg border border-border p-3 text-center">
                          <div className="text-2xl font-bold text-foreground">{tests.length}</div>
                          <div className="text-xs text-muted-foreground mt-0.5">Tests Taken</div>
                        </div>
                        <div className="rounded-lg border border-border p-3 text-center">
                          <div className="text-2xl font-bold text-foreground">{fmtPct(avgPct)}</div>
                          <div className="text-xs text-muted-foreground mt-0.5">Average</div>
                        </div>
                        <div className="rounded-lg border border-border p-3 text-center">
                          <div className="text-2xl font-bold text-foreground">
                            {passedCount}<span className="text-base text-muted-foreground">/{tests.length}</span>
                          </div>
                          <div className="text-xs text-muted-foreground mt-0.5">Passed</div>
                        </div>
                      </div>

                      {/* Per-test rows */}
                      <div className="overflow-x-auto -mx-5">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-y border-border bg-muted/50 text-left">
                              <th className="px-5 py-2 font-semibold text-foreground">Test</th>
                              <th className="px-3 py-2 font-semibold text-foreground">Score</th>
                              <th className="px-3 py-2 font-semibold text-foreground">%</th>
                              <th className="px-3 py-2 font-semibold text-foreground">Result</th>
                              <th className="px-3 py-2 font-semibold text-foreground">Submitted</th>
                              <th className="px-5 py-2" />
                            </tr>
                          </thead>
                          <tbody>
                            {tests.map((t, i) => (
                              <tr key={`${t.testId}-${i}`} className="border-b border-border last:border-0">
                                <td className="px-5 py-2.5 font-medium text-foreground">{t.testTitle}</td>
                                <td className="px-3 py-2.5 text-foreground whitespace-nowrap">
                                  {t.score != null ? `${t.score} / ${t.totalMarks ?? '—'}` : '—'}
                                </td>
                                <td className="px-3 py-2.5 text-foreground">{fmtPct(t.percentage)}</td>
                                <td className="px-3 py-2.5">
                                  {t.passed == null ? (
                                    <span className="text-muted-foreground">—</span>
                                  ) : (
                                    <span
                                      className={cn(
                                        'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
                                        t.passed ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                      )}
                                    >
                                      {t.passed ? 'Pass' : 'Fail'}
                                    </span>
                                  )}
                                </td>
                                <td className="px-3 py-2.5 text-muted-foreground whitespace-nowrap">{fmtDate(t.submittedAt)}</td>
                                <td className="px-5 py-2.5 text-right">
                                  {t.attemptId && (
                                    <Button variant="ghost" size="sm" onClick={() => openAttempt(t)} title="View answers">
                                      <Icon name="Eye" size={16} />
                                    </Button>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </>
                  )}
                </>
              )}
            </Card>
          </div>
        )}
      </div>

      {/* Per-question attempt drill-down */}
      <Modal
        isOpen={!!detailRow}
        onClose={closeAttempt}
        title="Attempt Detail"
        description={detailRow?.testTitle}
        size="xl"
      >
        {detailLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : detailError ? (
          <div className="text-center py-12">
            <Icon name="Info" size={40} className="mx-auto mb-3 text-muted-foreground" />
            <p className="text-foreground font-medium mb-1">Can't show this attempt</p>
            <p className="text-muted-foreground text-sm max-w-md mx-auto">{detailError}</p>
          </div>
        ) : detail ? (
          <AttemptReview attempt={detail} studentName={fullName} />
        ) : null}
      </Modal>
    </PageLayout>
  );
};

export default StudentProfile;
