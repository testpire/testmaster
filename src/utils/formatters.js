// Small shared display formatters.

// Human-readable byte size, e.g. 1536 → "1 KB", 1572864 → "1.5 MB".
export const formatBytes = (b) => {
  if (b == null) return '';
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(0)} KB`;
  return `${(b / 1024 / 1024).toFixed(1)} MB`;
};
