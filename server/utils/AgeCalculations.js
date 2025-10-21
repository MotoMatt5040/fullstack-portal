/**
 * Calculate age from birth year
 * @param {number|string|null|undefined} birthYear - Four-digit birth year
 * @returns {number|null} Age in years, or null if invalid
 */
const calculateAgeFromBirthYear = (birthYear) => {
  if (birthYear === null || birthYear === undefined || birthYear === '') {
    return null;
  }

  const year = typeof birthYear === 'string' ? parseInt(birthYear) : birthYear;

  if (isNaN(year) || year < 1900 || year > new Date().getFullYear()) {
    return null;
  }

  const currentYear = new Date().getFullYear();
  const age = currentYear - year;

  return age >= 0 ? age : null;
};

/**
 * Calculate age from birth year with min/max capping
 * @param {number|string|null|undefined} birthYear - Four-digit birth year
 * @param {number} minAge - Minimum age (default: 0)
 * @param {number} maxAge - Maximum age (default: 99)
 * @returns {number|null} Capped age, or null if invalid
 */
const calculateAgeFromBirthYearCapped = (
  birthYear,
  minAge = 0,
  maxAge = 99
) => {
  const age = calculateAgeFromBirthYear(birthYear);

  if (age === null) {
    return null;
  }

  if (age < minAge) return minAge;
  if (age > maxAge) return maxAge;

  return age;
};

/**
 * Batch convert array of birth years to ages
 * @param {Array<number|string|null>} birthYears - Array of birth years
 * @returns {Array<number|null>} Array of ages (null for invalid years)
 */
const batchCalculateAges = (birthYears) => {
  return birthYears.map((year) => calculateAgeFromBirthYear(year));
};

/**
 * Get current year (useful for testing and consistency)
 * @returns {number} Current year
 */
const getCurrentYear = () => {
  return new Date().getFullYear();
};

/**
 * Validate if a year is reasonable for birth year calculations
 * @param {number|string} year - Year to validate
 * @returns {boolean} True if valid birth year range
 */
const isValidBirthYear = (year) => {
  const numYear = typeof year === 'string' ? parseInt(year) : year;
  const currentYear = getCurrentYear();
  return !isNaN(numYear) && numYear >= 1900 && numYear <= currentYear;
};

module.exports = {
  calculateAgeFromBirthYear,
  calculateAgeFromBirthYearCapped,
  batchCalculateAges,
  getCurrentYear,
  isValidBirthYear,
};