/**
 * @param {string} phoneNumber The phone number to format.
 * @returns {string | null} The 10-digit phone number, or null if invalid.
 *
 * Formats a phone number string into a standard 10-digit format.
 *
 * This function removes all non-digit characters (like spaces, parentheses,
 * dashes, and plus signs) and returns the resulting 10-digit number.
 * It also handles an optional leading '1' or '+1' country code.
 */
function formatPhoneNumber(phoneNumber) {
  const cleanedNumber = phoneNumber.replace(/\D/g, '');

  if (cleanedNumber.length === 11 && cleanedNumber.startsWith('1')) {
    return cleanedNumber.substring(1);
  }

  if (cleanedNumber.length === 10) {
    return cleanedNumber;
  }

  return null;
}

// --- Examples of use for local testing ---
if (require.main === module) {
  const testNumbers = [
    "123-456-7890",
    "(123) 456-7890",
    "123.456.7890",
    "+1 (123) 456-7890",
    "  1234567890  ",
    "123456789",
    "12345678901",
    "abc-123-456-7890", 
    "+18325853212", 
    "18325853212", 
    "1234567890" 
  ];

  console.log("Formatting phone numbers:");
  testNumbers.forEach(number => {
    const formatted = formatPhoneNumber(number);
    console.log(`Original: '${number}' -> Formatted: '${formatted}'`);
  });
}

module.exports = {
  formatPhoneNumber
};