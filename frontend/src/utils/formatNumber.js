/**
 * Format a number with commas for thousands separator
 * @param {number} num - The number to format
 * @param {number} decimals - Number of decimal places (default: 2)
 * @returns {string} Formatted number string
 */
export const formatCurrency = (num, decimals = 2) => {
  if (num === null || num === undefined || isNaN(num)) return '0.00';
  
  const fixedNum = Number(num).toFixed(decimals);
  const parts = fixedNum.split('.');
  
  // Add commas to the integer part
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  
  return parts.join('.');
};

/**
 * Format a number as currency with peso sign
 * @param {number} num - The number to format
 * @param {number} decimals - Number of decimal places (default: 2)
 * @returns {string} Formatted currency string with ₱ symbol
 */
export const formatPeso = (num, decimals = 2) => {
  return `₱${formatCurrency(num, decimals)}`;
};

/**
 * Format percentage
 * @param {number} num - The number to format
 * @param {number} decimals - Number of decimal places (default: 1)
 * @returns {string} Formatted percentage string
 */
export const formatPercent = (num, decimals = 1) => {
  if (num === null || num === undefined || isNaN(num)) return '0%';
  return `${Number(num).toFixed(decimals)}%`;
};

