// Base theme colors
export const lightTheme = {
  primary: '#378e40',
  secondary: '#378e40',
  background: '#ffffff',
  white: '#ffffff',
  black: '#000000',
  
  gray25: '#fcfcfd',
  gray50: '#f9fafb',
  gray100: '#f3f4f6',
  gray200: '#e5e7eb',
  gray300: '#d1d5db',
  gray400: '#9ca3af',
  gray500: '#6b7280',
  gray600: '#4b5563',
  gray700: '#374151',
  gray800: '#1f2937',
  gray900: '#111827',
  
  success: '#378e40',
  warning: '#f59e0b',
  error: '#ef4444',
  info: '#3b82f6',
  danger: '#ef4444',
  
  border: '#e5e7eb',
  
  shadow: {
    color: '#000000',
  },
};


// User theme (Green)
export const userTheme = {
  primary: '#378e40',      // Custom Green
  primaryLight: '#378e40', // Lighter Green
  primaryDark: '#378e40',  // Darker Green
  secondary: '#378e40',    // Light Green
  accent: '#378e40',       // Very Light Green
  background: '#ffffff',
  white: '#ffffff',
  black: '#000000',
  
  gray25: '#fcfcfd',
  gray50: '#f9fafb',
  gray100: '#f3f4f6',
  gray200: '#e5e7eb',
  gray300: '#d1d5db',
  gray400: '#9ca3af',
  gray500: '#6b7280',
  gray600: '#4b5563',
  gray700: '#374151',
  gray800: '#1f2937',
  gray900: '#111827',
  
  success: '#378e40',
  warning: '#f59e0b',
  error: '#ef4444',
  info: '#3b82f6',
  danger: '#ef4444',
  
  border: '#e5e7eb',
  
  shadow: {
    color: '#000000',
  },
};

export const darkTheme = {
  primary: '#378e40',
  secondary: '#378e40',
  background: '#111827',
  white: '#1f2937',
  black: '#ffffff',
  
  gray25: '#1f2937',
  gray50: '#374151',
  gray100: '#4b5563',
  gray200: '#6b7280',
  gray300: '#9ca3af',
  gray400: '#d1d5db',
  gray500: '#e5e7eb',
  gray600: '#f3f4f6',
  gray700: '#f9fafb',
  gray800: '#fcfcfd',
  gray900: '#ffffff',
  
  success: '#378e40',
  warning: '#d97706',
  error: '#dc2626',
  info: '#2563eb',
  danger: '#dc2626',
  
  border: '#4b5563',
  
  shadow: {
    color: '#000000',
  },
};

export const getColors = (theme) => {
  if (!theme || typeof theme !== 'string') {
    return lightTheme;
  }
  return theme === 'dark' ? darkTheme : lightTheme;
};

// Function to get theme based on user role
export const getThemeByRole = (isAdmin, isDark = false) => {
  if (isDark) {
    return darkTheme;
  }
  return userTheme;
};

export const Colors = lightTheme;