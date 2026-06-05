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

// Human-friendly labels for the SCREAMING_SNAKE_CASE enum values.
export const prettyEnum = (value) =>
  (value || '')
    .toLowerCase()
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');

// Tailwind classes for the status badge — green for the won end of the funnel,
// red for the lost end, blue/amber for the in-progress middle.
export const LEAD_STATUS_BADGE = {
  NEW: 'bg-slate-100 text-slate-700',
  CONTACTED: 'bg-blue-100 text-blue-700',
  INTERESTED: 'bg-indigo-100 text-indigo-700',
  DEMO_SCHEDULED: 'bg-amber-100 text-amber-700',
  ENROLLED: 'bg-green-100 text-green-700',
  LOST: 'bg-red-100 text-red-700',
  NOT_INTERESTED: 'bg-gray-100 text-gray-500'
};
