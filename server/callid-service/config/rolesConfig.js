// Roles configuration - fetches from auth-service at startup
const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://auth:5001';

const ROLES_LIST = {};

const initializeRoles = async () => {
  try {
    console.log('Fetching roles from auth-service...');
    const response = await fetch(`${AUTH_SERVICE_URL}/api/auth/roles`);

    if (!response.ok) {
      throw new Error(`Failed to fetch roles: ${response.status}`);
    }

    const roles = await response.json();
    Object.assign(ROLES_LIST, roles);
    console.log('Roles loaded:', Object.keys(ROLES_LIST).join(', '));
  } catch (error) {
    console.error('Failed to fetch roles:', error.message);
    // Fallback roles
    Object.assign(ROLES_LIST, {
      Admin: 5150,
      Executive: 1001,
      Programmer: 2001,
      External: 3001,
      Manager: 4001,
    });
    console.log('Using fallback roles');
  }
};

module.exports = { ROLES_LIST, initializeRoles };
