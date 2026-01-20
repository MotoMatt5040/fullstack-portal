// Auth Controller Unit Tests
const { handleLogin, handleLogout } = require('../../auth-service/controllers/authController');
const { getUserByEmail, updateUserRefreshToken, getUserByRefreshToken, clearRefreshToken } = require('../../auth-service/services/PromarkUsers');
const { getUserRoles } = require('../../auth-service/services/UserRoles');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// Mock dependencies
jest.mock('../../auth-service/services/PromarkUsers');
jest.mock('../../auth-service/services/UserRoles');
jest.mock('bcrypt');
jest.mock('jsonwebtoken');

describe('Auth Controller', () => {
  let mockReq;
  let mockRes;

  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();

    // Mock response object
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      sendStatus: jest.fn().mockReturnThis(),
      cookie: jest.fn().mockReturnThis(),
      clearCookie: jest.fn().mockReturnThis(),
    };

    // Set environment variables for tests
    process.env.ACCESS_TOKEN_SECRET = 'test-access-secret';
    process.env.REFRESH_TOKEN_SECRET = 'test-refresh-secret';
  });

  describe('handleLogin', () => {
    it('should return 400 if username is missing', async () => {
      mockReq = { body: { pwd: 'password123' } };

      await handleLogin(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ message: 'Please include a username and password' });
    });

    it('should return 400 if password is missing', async () => {
      mockReq = { body: { user: 'test@example.com' } };

      await handleLogin(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ message: 'Please include a username and password' });
    });

    it('should return 401 if user not found', async () => {
      mockReq = { body: { user: 'notfound@example.com', pwd: 'password123' } };
      getUserByEmail.mockResolvedValue(null);

      await handleLogin(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({ message: 'Invalid username or password' });
    });

    it('should return 401 if password does not match', async () => {
      mockReq = { body: { user: 'test@example.com', pwd: 'wrongpassword' } };
      getUserByEmail.mockResolvedValue({ Email: 'test@example.com', Password: 'hashedpassword' });
      bcrypt.compare.mockResolvedValue(false);

      await handleLogin(mockReq, mockRes);

      expect(mockRes.sendStatus).toHaveBeenCalledWith(401);
    });

    it('should return 200 with accessToken on successful login', async () => {
      mockReq = {
        body: {
          user: 'test@example.com',
          pwd: 'correctpassword',
          deviceId: 'device123'
        }
      };

      const mockUser = { Email: 'test@example.com', Password: 'hashedpassword' };
      const mockRoles = ['User', 'Admin'];
      const mockAccessToken = 'mock-access-token';
      const mockRefreshToken = 'mock-refresh-token';

      getUserByEmail.mockResolvedValue(mockUser);
      bcrypt.compare.mockResolvedValue(true);
      getUserRoles.mockResolvedValue(mockRoles);
      jwt.sign
        .mockReturnValueOnce(mockAccessToken)  // First call for access token
        .mockReturnValueOnce(mockRefreshToken); // Second call for refresh token
      updateUserRefreshToken.mockResolvedValue();

      await handleLogin(mockReq, mockRes);

      expect(mockRes.cookie).toHaveBeenCalledWith(
        'jwt',
        mockRefreshToken,
        expect.objectContaining({ httpOnly: true, secure: true })
      );
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({ accessToken: mockAccessToken });
    });

    it('should return 500 on database error', async () => {
      mockReq = { body: { user: 'test@example.com', pwd: 'password123' } };
      getUserByEmail.mockRejectedValue(new Error('Database error'));

      await handleLogin(mockReq, mockRes);

      expect(mockRes.sendStatus).toHaveBeenCalledWith(500);
    });
  });

  describe('handleLogout', () => {
    it('should return 204 if no jwt cookie exists', async () => {
      mockReq = { cookies: {} };

      await handleLogout(mockReq, mockRes);

      expect(mockRes.sendStatus).toHaveBeenCalledWith(204);
    });

    it('should clear cookie and return 204 if user not found by refresh token', async () => {
      mockReq = { cookies: { jwt: 'some-refresh-token' } };
      getUserByRefreshToken.mockResolvedValue(null);

      await handleLogout(mockReq, mockRes);

      expect(mockRes.clearCookie).toHaveBeenCalledWith('jwt', expect.any(Object));
      expect(mockRes.sendStatus).toHaveBeenCalledWith(204);
    });

    it('should clear cookie, clear db token, and return 204 on successful logout', async () => {
      mockReq = { cookies: { jwt: 'valid-refresh-token' } };
      const mockUser = { Email: 'test@example.com' };
      getUserByRefreshToken.mockResolvedValue(mockUser);
      clearRefreshToken.mockResolvedValue();

      await handleLogout(mockReq, mockRes);

      expect(mockRes.clearCookie).toHaveBeenCalledWith('jwt', expect.any(Object));
      expect(clearRefreshToken).toHaveBeenCalledWith('test@example.com');
      expect(mockRes.sendStatus).toHaveBeenCalledWith(204);
    });
  });
});
