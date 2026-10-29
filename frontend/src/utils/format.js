/**
 * Formats a number to Indian Rupee (INR) currency string.
 * @param {number} amount - The numeric value to format.
 * @returns {string} - Formatted currency string (e.g., ₹25,000).
 */
export const formatToINR = (amount) => {
  if (amount === undefined || amount === null || isNaN(amount)) {
    return '₹0';
  }
  
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
};
