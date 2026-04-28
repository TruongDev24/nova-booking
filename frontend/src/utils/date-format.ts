/**
 * Formats a date string to display only the date in Vietnam timezone
 * Format: DD/MM/YYYY
 */
export const formatToVietnamDate = (utcDateString: string | Date | undefined | null): string => {
  if (!utcDateString) return '';
  
  const date = new Date(utcDateString);
  if (isNaN(date.getTime())) return '';

  return date.toLocaleDateString('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
};
