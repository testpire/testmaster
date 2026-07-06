import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import PageLayout from '../../components/layout/PageLayout';
import Icon from '../../components/AppIcon';
import Button from '../../components/ui/Button';
import { newLeadService } from '../../services/newLeadService';
import { courseService } from '../../services/courseService';
import { prettyEnum, LEAD_STATUS_BADGE } from '../lead-management/leadConstants';
import { cn } from '../../utils/cn';

// Format an ISO date (or date-only) string for display; blanks fall back to "—".
const fmtDate = (v) => {
  if (!v) return '—';
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return String(v).slice(0, 10);
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
};

// Same but including the time of day — used for the audit timestamps.
const fmtDateTime = (v) => {
  if (!v) return '—';
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return String(v);
  return d.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const fmtFee = (v) =>
  v == null || v === ''
    ? null
    : `₹${Number(v).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

// A single label/value pair inside an info card. Empty values render as "—".
const Field = ({ label, value, full = false }) => (
  <div className={cn('min-w-0', full && 'sm:col-span-2')}>
    <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</dt>
    <dd className="mt-0.5 text-sm text-foreground break-words">
      {value === 0 || value ? value : <span className="text-muted-foreground">—</span>}
    </dd>
  </div>
);

const Card = ({ title, icon, children }) => (
  <div className="bg-card rounded-2xl border border-border shadow-sm">
    <div className="flex items-center justify-between px-5 py-3 border-b border-border">
      <h2 className="flex items-center gap-2 text-sm font-display font-semibold text-foreground">
        {icon && <Icon name={icon} size={16} className="text-muted-foreground" />}
        {title}
      </h2>
    </div>
    <div className="p-5">{children}</div>
  </div>
);

const LeadProfile = () => {
  const { leadId } = useParams();
  const navigate = useNavigate();

  const [lead, setLead] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Courses load independently so we can resolve course ids → names.
  const [courseMap, setCourseMap] = useState({});

  useEffect(() => {
    document.title = 'Lead Profile - TopperLoop';
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      setError(null);
      const { data, error: err } = await newLeadService.getLead(leadId);
      if (!active) return;
      if (err || !data) {
        setError(err?.message || 'Failed to load this lead');
        setLead(null);
      } else {
        setLead(data);
      }
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [leadId]);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data } = await courseService.getCourses({ page: 0, size: 100 });
      if (!active) return;
      const map = {};
      (Array.isArray(data) ? data : []).forEach((c) => {
        map[c.id] = c.name;
      });
      setCourseMap(map);
    })();
    return () => {
      active = false;
    };
  }, []);

  const courseName = (id) => (id ? courseMap[id] || `Course #${id}` : null);

  const fullName = lead
    ? `${lead.firstName || ''} ${lead.lastName || ''}`.trim() || 'Lead'
    : '';
  const initial = (lead?.firstName || 'L')[0]?.toUpperCase();
  const converted = !!lead?.convertedUserId;

  return (
    <PageLayout title="Lead Profile">
      <div className="p-4 lg:p-6 max-w-5xl mx-auto w-full">
        <button
          onClick={() => navigate('/lead-management')}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <Icon name="ArrowLeft" size={16} /> Back to Leads
        </button>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : error ? (
          <div className="text-center py-20">
            <Icon name="AlertCircle" size={40} className="mx-auto mb-3 text-destructive" />
            <p className="text-foreground font-medium mb-4">{error}</p>
            <Button variant="outline" onClick={() => navigate('/lead-management')} iconName="ArrowLeft" iconPosition="left">
              Back to Leads
            </Button>
          </div>
        ) : (
          <div className="space-y-5">
            {/* Header card */}
            <div className="bg-card rounded-2xl border border-border shadow-sm p-5 flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <span className="text-primary font-semibold text-2xl">{initial}</span>
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="font-display text-2xl font-semibold text-foreground truncate">{fullName}</h1>
                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                  <span>Lead ID: {lead.id}</span>
                  <span
                    className={cn(
                      'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
                      LEAD_STATUS_BADGE[lead.status] || 'bg-muted text-muted-foreground'
                    )}
                  >
                    {prettyEnum(lead.status)}
                  </span>
                  {converted && (
                    <span className="inline-flex items-center gap-1 text-xs text-success">
                      <Icon name="CheckCircle" size={12} /> Converted
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Contact & personal */}
            <Card title="Contact & Personal" icon="User">
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
                <Field label="Email" value={lead.email} />
                <Field label="Phone" value={lead.phone} />
                <Field label="Gender" value={prettyEnum(lead.gender) || null} />
                <Field label="School" value={lead.school} />
                <Field label="Current Class" value={lead.currentClass} />
                <Field label="Board" value={lead.board} />
              </dl>
            </Card>

            {/* Lead details */}
            <Card title="Lead Details" icon="UserPlus">
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
                <Field label="Status" value={prettyEnum(lead.status)} />
                <Field label="Source" value={prettyEnum(lead.source) || null} />
                <Field label="Interested Course" value={courseName(lead.interestedCourseId)} />
                <Field label="Committed Fee" value={fmtFee(lead.courseFeeCommitted)} />
                <Field label="Assigned To" value={lead.assignedTo} />
                <Field label="Next Follow-up" value={lead.nextFollowUpDate ? fmtDate(lead.nextFollowUpDate) : null} />
                <Field label="Notes" value={lead.notes} full />
              </dl>
            </Card>

            {/* Parent / Guardian */}
            <Card title="Parent / Guardian" icon="Users">
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
                <Field label="Parent Name" value={lead.parentName} />
                <Field label="Parent Phone" value={lead.parentPhone} />
                <Field label="Parent Email" value={lead.parentEmail} full />
              </dl>
            </Card>

            {/* Conversion */}
            {converted && (
              <Card title="Conversion" icon="UserCheck">
                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
                  <Field label="Enrolled Course" value={courseName(lead.enrolledCourseId)} />
                  <Field
                    label="Student"
                    value={
                      lead.convertedUserId ? (
                        <button
                          onClick={() => navigate(`/student-profile/${lead.convertedUserId}`)}
                          className="inline-flex items-center gap-1 text-primary hover:underline"
                        >
                          View student profile <Icon name="ArrowRight" size={14} />
                        </button>
                      ) : null
                    }
                  />
                </dl>
              </Card>
            )}

            {/* Audit */}
            <Card title="Record" icon="Clock">
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
                <Field label="Created" value={fmtDateTime(lead.createdAt)} />
                <Field label="Last Updated" value={lead.updatedAt ? fmtDateTime(lead.updatedAt) : null} />
              </dl>
            </Card>
          </div>
        )}
      </div>
    </PageLayout>
  );
};

export default LeadProfile;
