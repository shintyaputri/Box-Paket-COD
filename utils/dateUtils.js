/**
 * Utility functions for date formatting and validation
 */

/**
 * Safely format date string to Indonesian locale
 * @param {string|Date|number} dateInput - Date string, Date object, or timestamp
 * @param {Object} options - Formatting options
 * @returns {string} Formatted date string or "-" if invalid
 */
export const formatDate = (dateInput, options = {}) => {
  if (!dateInput) return "-";
  
  try {
    let date;
    
    // Handle different input types
    if (dateInput instanceof Date) {
      date = dateInput;
    } else if (typeof dateInput === 'string' || typeof dateInput === 'number') {
      date = new Date(dateInput);
    } else {
      return "-";
    }
    
    // Check if date is valid
    if (isNaN(date.getTime())) {
      console.warn("Invalid date input:", dateInput);
      return "-";
    }
    
    // Default formatting options for Indonesian locale
    const defaultOptions = {
      day: "numeric",
      month: "short", 
      year: "numeric",
      ...options
    };
    
    return date.toLocaleDateString("id-ID", defaultOptions);
  } catch (error) {
    console.warn("Error formatting date:", dateInput, error);
    return "-";
  }
};

/**
 * Format date with full month name
 */
export const formatDateLong = (dateInput) => {
  return formatDate(dateInput, {
    day: "numeric",
    month: "long",
    year: "numeric"
  });
};

/**
 * Format date with time
 */
export const formatDateTime = (dateInput) => {
  return formatDate(dateInput, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
};

/**
 * Check if date is valid
 */
export const isValidDate = (dateInput) => {
  if (!dateInput) return false;
  
  try {
    const date = new Date(dateInput);
    return !isNaN(date.getTime());
  } catch {
    return false;
  }
};

/**
 * Convert date to ISO string safely
 */
export const toISOString = (dateInput = new Date()) => {
  try {
    const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
    if (isNaN(date.getTime())) {
      return new Date().toISOString();
    }
    return date.toISOString();
  } catch (error) {
    console.warn("Error converting to ISO string:", dateInput, error);
    return new Date().toISOString();
  }
};