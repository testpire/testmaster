// Student "Current Class" is stored as an integer (1-13) in the backend, but we
// show intuitive ordinal labels in the UI. Single source of truth for both the
// admin Create/Edit user modal and the student profile page.

const ordinalSuffix = (n) => {
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 13) return 'th';
  switch (n % 10) {
    case 1: return 'st';
    case 2: return 'nd';
    case 3: return 'rd';
    default: return 'th';
  }
};

// e.g. { value: 1, label: 'Class 1st' } ... { value: 13, label: 'Class 13th' }
export const CLASS_OPTIONS = Array.from({ length: 13 }, (_, i) => {
  const n = i + 1;
  return { value: n, label: `Class ${n}${ordinalSuffix(n)}` };
});
