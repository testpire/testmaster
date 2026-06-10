import React, { useState, useEffect, useMemo } from 'react';
import { newTestService } from '../../../services/newTestService';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import Modal from '../../../components/ui/Modal';
import AttemptReview from '../../../components/test/AttemptReview';
import { formatDateTime } from '../testConstants';

// View per-student results for a test. The results[] row shape isn't strongly typed
// in the API spec, so every field is read defensively with a few likely aliases.
const TestResultsModal = ({ isOpen, onClose, test }) => {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Per-student attempt drill-down (shares AttemptReview with the student view).
  const [detailRow, setDetailRow] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    let active = true;
    (async () => {
      setLoading(true);
      setError('');
      const { data, error: err } = await newTestService.getResults(test.id);
      if (!active) return;
      if (err) setError(err.message || 'Failed to load results');
      setSummary(data || null);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [isOpen, test?.id]);

  // Reset the drill-down whenever the modal is (re)opened.
  useEffect(() => {
    if (!isOpen) {
      setDetailRow(null);
      setDetail(null);
      setDetailError('');
    }
  }, [isOpen]);

  const getAttemptId = (r) =>
    r?.attemptId ?? r?.attempt?.id ?? r?.latestAttemptId ?? r?.lastAttemptId ?? null;

  const openAttempt = async (row) => {
    setDetailRow(row);
    setDetail(null);
    setDetailError('');
    const attemptId = getAttemptId(row);
    if (attemptId == null) {
      setDetailError("This result row doesn't carry an attempt id, so the breakdown can't be opened.");
      return;
    }
    setDetailLoading(true);
    const { data, error: err } = await newTestService.getStaffAttempt(test.id, attemptId);
    setDetailLoading(false);
    if (err || !data) {
      setDetailError(
        err?.message ||
          "Detailed attempt view isn't available yet — the backend endpoint for staff to read a student's attempt hasn't been added."
      );
      return;
    }
    setDetail(data);
  };

  const closeAttempt = () => {
    setDetailRow(null);
    setDetail(null);
    setDetailError('');
  };

  const totalMarks = summary?.totalMarks ?? test?.totalMarks ?? 0;
  const passingMarks = summary?.passingMarks ?? test?.passingMarks ?? null;
  const rows = useMemo(() => (Array.isArray(summary?.results) ? summary.results : []), [summary]);

  // Defensive field access — different backends name these slightly differently.
  const getName = (r) =>
    r.studentName ||
    `${r.firstName || ''} ${r.lastName || ''}`.trim() ||
    r.username ||
    r.email ||
    (r.studentId ? `Student #${r.studentId}` : '—');
  const getScore = (r) => r.marksObtained ?? r.score ?? r.totalScore ?? r.marks ?? null;
  const getSubmitted = (r) => r.submittedAt || r.completedAt || r.attemptedAt || r.updatedAt || null;
  const getPassed = (r) => {
    if (typeof r.passed === 'boolean') return r.passed;
    const score = getScore(r);
    if (passingMarks != null && score != null) return Number(score) >= Number(passingMarks);
    return null;
  };
  const getPercentage = (r) => {
    if (r.percentage != null) return Number(r.percentage);
    const score = getScore(r);
    if (score != null && totalMarks) return (Number(score) / Number(totalMarks)) * 100;
    return null;
  };

  const stats = useMemo(() => {
    const scored = rows.map(getScore).filter((s) => s != null).map(Number);
    const avg = scored.length ? scored.reduce((a, b) => a + b, 0) / scored.length : null;
    const passedCount = rows.filter((r) => getPassed(r) === true).length;
    return {
      attempted: rows.length,
      avg,
      passRate: rows.length ? (passedCount / rows.length) * 100 : null,
      passedCount
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, totalMarks, passingMarks]);

  const exportCsv = () => {
    const header = ['Student', 'Score', 'Total', 'Percentage', 'Result', 'Submitted At'];
    const lines = rows.map((r) => {
      const score = getScore(r);
      const pct = getPercentage(r);
      const passed = getPassed(r);
      return [
        getName(r),
        score ?? '',
        totalMarks ?? '',
        pct != null ? pct.toFixed(1) : '',
        passed == null ? '' : passed ? 'PASS' : 'FAIL',
        getSubmitted(r) || ''
      ]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(',');
    });
    const csv = [header.join(','), ...lines].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(test?.title || 'test').replace(/[^a-z0-9]+/gi, '_')}_results.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const modalTitle = detailRow ? (
    <span className="flex items-center gap-2">
      <button
        onClick={closeAttempt}
        className="text-muted-foreground hover:text-foreground flex-shrink-0"
        title="Back to results"
      >
        <Icon name="ArrowLeft" size={20} />
      </button>
      Attempt Detail
    </span>
  ) : 'Results';

  const modalDescription = detailRow
    ? getName(detailRow)
    : summary?.testTitle || test?.title;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={modalTitle}
      description={modalDescription}
      size="xl"
      footer={
        !detailRow && rows.length > 0 ? (
          <Button variant="outline" size="sm" onClick={exportCsv} iconName="Download" iconPosition="left">
            Export CSV
          </Button>
        ) : undefined
      }
    >
        <div>
          {detailRow ? (
            detailLoading ? (
              <div className="flex items-center justify-center py-16">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              </div>
            ) : detailError ? (
              <div className="text-center py-12">
                <Icon name="Info" size={40} className="mx-auto mb-3 text-muted-foreground" />
                <p className="text-foreground font-medium mb-1">Can't show this attempt</p>
                <p className="text-muted-foreground text-sm max-w-md mx-auto">{detailError}</p>
              </div>
            ) : (
              <AttemptReview attempt={detail} studentName={getName(detailRow)} />
            )
          ) : (
          <>
          {error && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg flex items-center space-x-2 mb-4">
              <Icon name="AlertCircle" size={16} className="text-destructive" />
              <p className="text-destructive text-sm font-medium">{error}</p>
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : (
            <>
              {/* Summary cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                <Stat label="Attempted" value={stats.attempted} />
                <Stat label="Total Marks" value={totalMarks} />
                <Stat label="Avg Score" value={stats.avg != null ? stats.avg.toFixed(1) : '—'} />
                <Stat
                  label="Pass Rate"
                  value={stats.passRate != null ? `${stats.passRate.toFixed(0)}%` : '—'}
                />
              </div>

              {rows.length === 0 ? (
                <div className="text-center py-10">
                  <Icon name="ClipboardList" size={40} className="mx-auto mb-3 text-muted-foreground/40" />
                  <p className="text-muted-foreground text-sm">
                    No students have attempted this test yet.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto border border-border rounded-lg">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/40 text-left text-muted-foreground">
                      <tr>
                        <th className="px-4 py-3 font-medium">Student</th>
                        <th className="px-4 py-3 font-medium">Score</th>
                        <th className="px-4 py-3 font-medium">%</th>
                        <th className="px-4 py-3 font-medium">Result</th>
                        <th className="px-4 py-3 font-medium">Submitted</th>
                        <th className="px-4 py-3 font-medium sr-only">View</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {rows.map((r, i) => {
                        const score = getScore(r);
                        const pct = getPercentage(r);
                        const passed = getPassed(r);
                        return (
                          <tr
                            key={r.id || r.studentId || i}
                            onClick={() => openAttempt(r)}
                            className="hover:bg-muted/20 cursor-pointer"
                            title="View this student's attempt"
                          >
                            <td className="px-4 py-3 font-medium text-foreground">{getName(r)}</td>
                            <td className="px-4 py-3 text-muted-foreground">
                              {score != null ? `${score} / ${totalMarks}` : '—'}
                            </td>
                            <td className="px-4 py-3 text-muted-foreground">
                              {pct != null ? `${pct.toFixed(0)}%` : '—'}
                            </td>
                            <td className="px-4 py-3">
                              {passed == null ? (
                                <span className="text-muted-foreground">—</span>
                              ) : (
                                <span
                                  className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                                    passed ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                  }`}
                                >
                                  {passed ? 'Pass' : 'Fail'}
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-muted-foreground">
                              {formatDateTime(getSubmitted(r))}
                            </td>
                            <td className="px-4 py-3 text-right text-muted-foreground">
                              <Icon name="ChevronRight" size={16} className="inline" />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
          </>
          )}
        </div>
    </Modal>
  );
};

const Stat = ({ label, value }) => (
  <div className="p-3 rounded-lg border border-border bg-background">
    <p className="text-xs text-muted-foreground">{label}</p>
    <p className="text-lg font-semibold text-foreground">{value}</p>
  </div>
);

export default TestResultsModal;
