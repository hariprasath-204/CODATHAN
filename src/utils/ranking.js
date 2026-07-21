/**
 * Helper utility to determine student category ('UG' or 'PG').
 * Uses explicit category property if available, or analyzes roll/lot number pattern.
 */
export function getStudentCategory(rollNoOrUser) {
  if (!rollNoOrUser) return 'UG';
  if (typeof rollNoOrUser === 'object') {
    if (rollNoOrUser.category === 'UG' || rollNoOrUser.category === 'PG') {
      return rollNoOrUser.category;
    }
    return getStudentCategory(rollNoOrUser.rollNo || rollNoOrUser.id || rollNoOrUser.lotNo);
  }
  const clean = String(rollNoOrUser).trim().toUpperCase();
  if (clean === 'UG' || clean === 'PG') return clean;
  // Check PCA / PG series or starting with P
  if (clean.includes('PCA') || /^\d*PCA/.test(clean) || /PCA/.test(clean) || /^\d+P/i.test(clean)) {
    return 'PG';
  }
  // Check UCA / UG series or starting with U
  if (clean.includes('UCA') || /^\d*UCA/.test(clean) || /UCA/.test(clean) || /^\d+U/i.test(clean)) {
    return 'UG';
  }
  return 'UG'; // Default to UG if no pattern matches
}
