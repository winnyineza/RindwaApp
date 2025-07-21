/**
 * Utility functions for consistent date formatting across the application
 */

/**
 * Format date for display in tables (MMM DD, YYYY format)
 * @param dateString - ISO date string or Date object
 * @returns Formatted date string or "N/A" for invalid dates
 */
export function formatDate(dateString: string | Date | null | undefined): string {
  if (!dateString) return "N/A";
  
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "Invalid Date";
    
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  } catch (error) {
    console.warn('Error formatting date:', error);
    return "Invalid Date";
  }
}

/**
 * Format date and time for detailed display (audit logs, etc.)
 * @param dateString - ISO date string or Date object
 * @returns Formatted date and time string or "N/A" for invalid dates
 */
export function formatDateTime(dateString: string | Date | null | undefined): string {
  if (!dateString) return "N/A";
  
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "Invalid Date";
    
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  } catch (error) {
    console.warn('Error formatting date time:', error);
    return "Invalid Date";
  }
}

/**
 * Format date as ISO date string (YYYY-MM-DD)
 * @param dateString - ISO date string or Date object
 * @returns ISO date string or "N/A" for invalid dates
 */
export function formatDateOnly(dateString: string | Date | null | undefined): string {
  if (!dateString) return "N/A";
  
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "Invalid Date";
    
    return date.toISOString().split('T')[0];
  } catch (error) {
    console.warn('Error formatting date only:', error);
    return "Invalid Date";
  }
}