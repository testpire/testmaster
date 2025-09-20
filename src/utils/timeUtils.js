/**
 * Format time for display with timezone
 * @param {Date} date - The current date/time
 * @param {string} timezone - Timezone (default: user's local)
 * @returns {string} - Formatted time string
 */
export const formatDisplayTime = (date = new Date(), timezone = 'Asia/Kolkata') => {
  try {
    return date.toLocaleString('en-IN', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: timezone
    });
  } catch (error) {
    // Fallback to user's local timezone if specified timezone fails
    return date.toLocaleString('en-IN', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
};