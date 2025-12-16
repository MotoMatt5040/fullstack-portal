// Utility to generate and persist a unique device ID
// This ID is stored in localStorage so all tabs on the same browser share it
// Different browsers/machines will have different IDs

const DEVICE_ID_KEY = 'device_id';

/**
 * Generates a random device ID using crypto API
 */
const generateDeviceId = (): string => {
  // Use crypto.randomUUID if available (modern browsers)
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  // Fallback for older browsers
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

/**
 * Gets or creates a persistent device ID
 * The ID is stored in localStorage so it persists across sessions
 * and is shared across all tabs in the same browser
 */
export const getDeviceId = (): string => {
  try {
    let deviceId = localStorage.getItem(DEVICE_ID_KEY);

    if (!deviceId) {
      deviceId = generateDeviceId();
      localStorage.setItem(DEVICE_ID_KEY, deviceId);
    }

    return deviceId;
  } catch {
    // If localStorage is unavailable, generate a new ID each time
    // This is a fallback that won't persist but allows the app to work
    return generateDeviceId();
  }
};

/**
 * Clears the device ID (useful for testing or resetting device identity)
 */
export const clearDeviceId = (): void => {
  try {
    localStorage.removeItem(DEVICE_ID_KEY);
  } catch {
    // Ignore errors if localStorage is unavailable
  }
};
