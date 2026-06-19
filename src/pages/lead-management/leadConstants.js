// Shared enums + display helpers for the Lead Management feature.

// Status funnel order is meaningful — it's the nurture path a lead moves through.
export const LEAD_STATUSES = [
  'NEW',
  'CONTACTED',
  'INTERESTED',
  'DEMO_SCHEDULED',
  'ENROLLED',
  'LOST',
  'NOT_INTERESTED'
];

export const LEAD_SOURCES = ['WALK_IN', 'REFERRAL', 'ONLINE', 'PHONE', 'OTHER'];

export const LEAD_GENDERS = ['MALE', 'FEMALE', 'OTHER'];

export const LEAD_BOARDS = ['CBSE', 'ICSE', 'STATE'];

// Human-friendly labels for the SCREAMING_SNAKE_CASE enum values.
export const prettyEnum = (value) =>
  (value || '')
    .toLowerCase()
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');

// Token soft-pairs for the status badge — success for the won end of the funnel,
// destructive for the lost end, primary/warning for the in-progress middle.
export const LEAD_STATUS_BADGE = {
  NEW: 'bg-primary/10 text-primary',
  CONTACTED: 'bg-primary/10 text-primary',
  INTERESTED: 'bg-primary/10 text-primary',
  DEMO_SCHEDULED: 'bg-warning/15 text-warning',
  ENROLLED: 'bg-success/15 text-success',
  LOST: 'bg-destructive/10 text-destructive',
  NOT_INTERESTED: 'bg-muted text-muted-foreground'
};
