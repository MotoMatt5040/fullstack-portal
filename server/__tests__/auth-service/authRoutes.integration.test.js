// Auth Routes Integration Tests
// These tests make actual HTTP requests to the endpoints
// Requires mocking the database layer

const express = require('express');
const request = require('supertest');
const cookieParser = require('cookie-parser');

// Mock the models before requiring routes
jest.mock('../../auth-service/models', () => ({
  sequelize: {
    authenticate: jest.fn().mockResolvedValue(true),
  },
  tblRoles: {
    findAll: jest.fn().mockResolvedValue([
      { RoleID: 1, RoleName: 'Admin' },
      { RoleID: 2, RoleName: 'User' },
    ]),
  },
}));

// Mock the services
jest.mock('../../auth-service/services/PromarkUsers', () => ({
  getUserByEmail: jest.fn(),
  updateUserRefreshToken: jest.fn(),
  getUserByRefreshToken: jest.fn(),
  clearRefreshToken: jest.fn(),
}));

jest.mock('../../auth-service/services/UserRoles', () => ({
  getUserRoles: jest.fn(),
}));

const authRoutes = require('../../auth-service/routes/authRoutes');
const { getUserByEmail, updateUserRefreshToken } = require('../../auth-service/services/PromarkUsers');
const { getUserRoles } = require('../../auth-service/services/UserRoles');
const bcrypt = require('bcrypt');

// Create test app
const createTestApp = () => {
  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use('/api', authRoutes);
  return app;
};

describe('Auth Routes Integration Tests', () => {
  let app;

  beforeAll(() => {
    process.env.ACCESS_TOKEN_SECRET = 'test-access-secret';
    process.env.REFRESH_TOKEN_SECRET = 'test-refresh-secret';
    process.env.PROMARK_DB_NAME = 'TestDB';
  });

  beforeEach(() => {
    app = createTestApp();
    jest.clearAllMocks();
  });

  describe('GET /api/auth/health', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/api/auth/health')
        .expect(200);

      expect(response.body).toMatchObject({
        status: 'healthy',
        service: 'auth-service',
        database: 'connected',
      });
      expect(response.body.timestamp).toBeDefined();
    });
  });

  describe('POST /api/auth/login', () => {
    it('should return 400 for missing credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ user: 'test@example.com' })
        .expect(400);

      expect(response.body.message).toBe('Please include a username and password');
    });

    it('should return 401 for invalid credentials', async () => {
      getUserByEmail.mockResolvedValue(null);

      const response = await request(app)
        .post('/api/auth/login')
        .send({ user: 'invalid@example.com', pwd: 'password123' })
        .expect(401);

      expect(response.body.message).toBe('Invalid username or password');
    });

    it('should return 200 with access token for valid credentials', async () => {
      // Hash a test password
      const hashedPassword = await bcrypt.hash('correctpassword', 10);

      getUserByEmail.mockResolvedValue({
        Email: 'test@example.com',
        Password: hashedPassword,
      });
      getUserRoles.mockResolvedValue(['User']);
      updateUserRefreshToken.mockResolvedValue();

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          user: 'test@example.com',
          pwd: 'correctpassword',
          deviceId: 'test-device',
        })
        .expect(200);

      expect(response.body.accessToken).toBeDefined();
      expect(response.headers['set-cookie']).toBeDefined();
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should return 204 when logging out without cookie', async () => {
      await request(app)
        .post('/api/auth/logout')
        .expect(204);
    });
  });

  describe('GET /api/auth/roles', () => {
    it('should return roles mapping', async () => {
      const response = await request(app)
        .get('/api/auth/roles')
        .expect(200);

      expect(response.body).toEqual({
        Admin: 1,
        User: 2,
      });
    });
  });
});
