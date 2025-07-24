import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import relativeTime from 'dayjs/plugin/relativeTime';
import localizedFormat from 'dayjs/plugin/localizedFormat';

// Extend dayjs with plugins
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(relativeTime);
dayjs.extend(localizedFormat);

// === CONFIGURATION ===
const DEFAULT_TIMEZONE = 'Africa/Kigali'; // Rwanda timezone
const UTC_FORMAT = 'YYYY-MM-DDTHH:mm:ss.SSS[Z]';
const DISPLAY_FORMAT = 'MMM DD, YYYY [at] h:mm A';
const SHORT_FORMAT = 'MMM DD, YYYY';
const TIME_FORMAT = 'h:mm A';

// === CORE DATE FUNCTIONS ===

/**
 * Get current date/time in UTC
 */
export const nowUtc = (): dayjs.Dayjs => {
  return dayjs().utc();
};

/**
 * Parse any date input and convert to UTC dayjs object
 */
export const parseToUtc = (date?: string | Date | dayjs.Dayjs | null): dayjs.Dayjs => {
  if (!date) return nowUtc();
  return dayjs(date).utc();
};

/**
 * Convert UTC date to Rwanda timezone
 */
export const toRwandaTime = (date?: string | Date | dayjs.Dayjs | null): dayjs.Dayjs => {
  if (!date) return nowUtc().tz(DEFAULT_TIMEZONE);
  return parseToUtc(date).tz(DEFAULT_TIMEZONE);
};

/**
 * Format date for database storage (UTC ISO string)
 */
export const formatForDatabase = (date?: string | Date | dayjs.Dayjs | null): string => {
  return parseToUtc(date).format(UTC_FORMAT);
};

// === DISPLAY FORMATTING FUNCTIONS ===

/**
 * Format date for user display in Rwanda timezone
 * Example: "Jan 15, 2024 at 2:30 PM"
 */
export const formatForDisplay = (date?: string | Date | dayjs.Dayjs | null): string => {
  if (!date) return 'N/A';
  return toRwandaTime(date).format(DISPLAY_FORMAT);
};

/**
 * Format date as short display
 * Example: "Jan 15, 2024"
 */
export const formatShort = (date?: string | Date | dayjs.Dayjs | null): string => {
  if (!date) return 'N/A';
  return toRwandaTime(date).format(SHORT_FORMAT);
};

/**
 * Format time only
 * Example: "2:30 PM"
 */
export const formatTime = (date?: string | Date | dayjs.Dayjs | null): string => {
  if (!date) return 'N/A';
  return toRwandaTime(date).format(TIME_FORMAT);
};

/**
 * Format relative time (e.g., "2 hours ago", "in 3 days")
 */
export const formatRelative = (date?: string | Date | dayjs.Dayjs | null): string => {
  if (!date) return 'N/A';
  return toRwandaTime(date).fromNow();
};

/**
 * Format for incident timestamps with relative time
 * Example: "Jan 15, 2024 at 2:30 PM (2 hours ago)"
 */
export const formatIncidentTime = (date?: string | Date | dayjs.Dayjs | null): string => {
  if (!date) return 'N/A';
  const formatted = formatForDisplay(date);
  const relative = formatRelative(date);
  return `${formatted} (${relative})`;
};

/**
 * Format for assignment logs
 * Example: "Assigned on Jan 15, 2024 at 2:30 PM"
 */
export const formatAssignmentTime = (action?: string, date?: string | Date | dayjs.Dayjs | null): string => {
  if (!date) return 'N/A';
  return `${action || 'Updated'} on ${formatForDisplay(date)}`;
};

/**
 * Format for audit/activity logs
 * Example: "2:30 PM • Jan 15, 2024"
 */
export const formatActivityTime = (date?: string | Date | dayjs.Dayjs | null): string => {
  if (!date) return 'N/A';
  const rwandaTime = toRwandaTime(date);
  return `${rwandaTime.format(TIME_FORMAT)} • ${rwandaTime.format(SHORT_FORMAT)}`;
};

// === COMPARISON FUNCTIONS ===

/**
 * Check if date is today
 */
export const isToday = (date?: string | Date | dayjs.Dayjs | null): boolean => {
  if (!date) return false;
  return toRwandaTime(date).isSame(toRwandaTime(), 'day');
};

/**
 * Check if date is yesterday
 */
export const isYesterday = (date?: string | Date | dayjs.Dayjs | null): boolean => {
  if (!date) return false;
  const yesterday = toRwandaTime().subtract(1, 'day');
  return toRwandaTime(date).isSame(yesterday, 'day');
};

/**
 * Check if date is within last N hours
 */
export const isWithinHours = (hours: number, date?: string | Date | dayjs.Dayjs | null): boolean => {
  if (!date) return false;
  const threshold = nowUtc().subtract(hours, 'hour');
  return parseToUtc(date).isAfter(threshold);
};

/**
 * Get difference in hours between two dates
 */
export const getHoursDiff = (
  startDate?: string | Date | dayjs.Dayjs | null, 
  endDate?: string | Date | dayjs.Dayjs | null
): number => {
  const start = parseToUtc(startDate);
  const end = endDate ? parseToUtc(endDate) : nowUtc();
  return end.diff(start, 'hour', true); // true for floating point
};

/**
 * Get difference in minutes between two dates
 */
export const getMinutesDiff = (
  startDate?: string | Date | dayjs.Dayjs | null, 
  endDate?: string | Date | dayjs.Dayjs | null
): number => {
  const start = parseToUtc(startDate);
  const end = endDate ? parseToUtc(endDate) : nowUtc();
  return end.diff(start, 'minute');
};

// === SMART FORMATTING FUNCTIONS ===

/**
 * Smart date formatting that shows relative time for recent dates
 * and absolute time for older dates
 */
export const formatSmart = (date?: string | Date | dayjs.Dayjs | null): string => {
  if (!date) return 'N/A';
  
  const parsedDate = toRwandaTime(date);
  
  if (isToday(date)) {
    return `Today at ${parsedDate.format(TIME_FORMAT)}`;
  } else if (isYesterday(date)) {
    return `Yesterday at ${parsedDate.format(TIME_FORMAT)}`;
  } else if (isWithinHours(72, date)) { // Within 3 days
    return formatRelative(date);
  } else {
    return formatForDisplay(date);
  }
};

/**
 * Format response time for incidents
 */
export const formatResponseTime = (
  startDate?: string | Date | dayjs.Dayjs | null,
  endDate?: string | Date | dayjs.Dayjs | null
): string => {
  if (!startDate) return 'N/A';
  
  const minutes = getMinutesDiff(startDate, endDate);
  
  if (minutes < 1) {
    return 'Less than 1 minute';
  } else if (minutes < 60) {
    return `${Math.round(minutes)} minute${minutes !== 1 ? 's' : ''}`;
  } else {
    const hours = Math.round(minutes / 60 * 10) / 10; // Round to 1 decimal
    return `${hours} hour${hours !== 1 ? 's' : ''}`;
  }
};

/**
 * Format duration between two dates
 */
export const formatDuration = (
  startDate?: string | Date | dayjs.Dayjs | null,
  endDate?: string | Date | dayjs.Dayjs | null
): string => {
  if (!startDate) return 'N/A';
  
  const start = parseToUtc(startDate);
  const end = endDate ? parseToUtc(endDate) : nowUtc();
  const diffMs = end.diff(start);
  
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  
  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m`;
  } else if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else {
    return `${minutes}m`;
  }
};

// === UTILITY FUNCTIONS ===

/**
 * Create a date range filter for database queries
 */
export const createDateRange = (days: number) => {
  const endDate = nowUtc();
  const startDate = endDate.subtract(days, 'day');
  
  return {
    start: formatForDatabase(startDate),
    end: formatForDatabase(endDate),
    startDisplay: formatShort(startDate),
    endDisplay: formatShort(endDate)
  };
};

/**
 * Validate if a date string is valid
 */
export const isValidDate = (date?: string | Date | dayjs.Dayjs | null): boolean => {
  if (!date) return false;
  return dayjs(date).isValid();
};

/**
 * Get current Rwanda time as display string
 */
export const getCurrentRwandaTime = (): string => {
  return formatForDisplay(nowUtc());
};

/**
 * Convert timestamp to age in words
 */
export const getAge = (date?: string | Date | dayjs.Dayjs | null): string => {
  if (!date) return 'Unknown';
  
  const hours = getHoursDiff(date);
  
  if (hours < 1) {
    const minutes = getMinutesDiff(date);
    return `${Math.max(1, minutes)} minute${minutes !== 1 ? 's' : ''} old`;
  } else if (hours < 24) {
    const roundedHours = Math.round(hours);
    return `${roundedHours} hour${roundedHours !== 1 ? 's' : ''} old`;
  } else {
    const days = Math.round(hours / 24);
    return `${days} day${days !== 1 ? 's' : ''} old`;
  }
};

// === EXPORT DEFAULT FORMATTER OBJECT ===
export const dateFormatter = {
  // Core functions
  nowUtc,
  parseToUtc,
  toRwandaTime,
  formatForDatabase,
  
  // Display functions
  formatForDisplay,
  formatShort,
  formatTime,
  formatRelative,
  formatIncidentTime,
  formatAssignmentTime,
  formatActivityTime,
  formatSmart,
  formatResponseTime,
  formatDuration,
  
  // Comparison functions
  isToday,
  isYesterday,
  isWithinHours,
  getHoursDiff,
  getMinutesDiff,
  
  // Utility functions
  createDateRange,
  isValidDate,
  getCurrentRwandaTime,
  getAge
};

export default dateFormatter; 