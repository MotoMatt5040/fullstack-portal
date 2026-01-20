// Auth Gateway Tests
const express = require('express');
const request = require('supertest');
const jwt = require('jsonwebtoken');

// Create a test app that mirrors server.js functionality
const createTestApp = () => {
  const app = express();

  // Health check
  app.get('/health', (req, res) => {
    res.status(200).json({ status: 'healthy', service: 'auth-gateway' });
  });

  // Auth verification endpoint
  app.get('/verify', (req, res) => {
    const authHeader = req.headers.authorization || req.headers.Authorization;
    const cookieHeader = req.headers.cookie || '';

    let token = null;

    // Try Authorization header first
    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    }

    // Fall back to cookie
    if (!token) {
      const cookies = cookieHeader.split(';').reduce((acc, cookie) => {
        const [key, value] = cookie.trim().split('=');
        if (key && value) acc[key] = value;
        return acc;
      }, {});
      token = cookies.jwt;
    }

    // No token found
    if (!token) {
      res.setHeader('X-User-Authenticated', 'false');
      res.setHeader('X-User-Roles', '');
      res.setHeader('X-User-Name', '');
      return res.status(200).send('OK');
    }

    // Validate the token
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
      if (err) {
        if (err.name === 'TokenExpiredError') {
          res.setHeader('Content-Type', 'application/json');
          return res.status(403).json({ message: 'Token expired', code: 'TOKEN_EXPIRED' });
        }
        res.setHeader('Content-Type', 'application/json');
        return res.status(403).json({ message: 'Invalid token', code: 'INVALID_TOKEN' });
      }

      if (!decoded?.UserInfo?.username || !decoded?.UserInfo?.roles) {
        res.setHeader('X-Auth-Error', 'MALFORMED_TOKEN');
        return res.status(401).send('Malformed token');
      }

      // Token is valid
      res.setHeader('X-User-Authenticated', 'true');
      res.setHeader('X-User-Name', decoded.UserInfo.username);
      res.setHeader('X-User-Roles', JSON.stringify(decoded.UserInfo.roles));

      return res.status(200).send('OK');
    });
  });

  return app;
};

describe('Auth Gateway', () => {
  let app;

  beforeAll(() => {
    process.env.ACCESS_TOKEN_SECRET = 'test-access-secret';
  });

  beforeEach(() => {
    app = createTestApp();
  });

  describe('GET /health', () => {
    it('should return healthy status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).toEqual({
        status: 'healthy',
        service: 'auth-gateway',
      });
    });
  });

  describe('GET /verify', () => {
    describe('No token provided', () => {
      it('should return 200 with unauthenticated headers when no token', async () => {
        const response = await request(app)
          .get('/verify')
          .expect(200);

        expect(response.headers['x-user-authenticated']).toBe('false');
        expect(response.headers['x-user-roles']).toBe('');
        expect(response.headers['x-user-name']).toBe('');
      });
    });

    describe('Token via Authorization header', () => {
      it('should return 200 with user headers for valid token', async () => {
        const token = jwt.sign(
          {
            UserInfo: {
              username: 'test@example.com',
              roles: ['User', 'Admin'],
            },
          },
          process.env.ACCESS_TOKEN_SECRET,
          { expiresIn: '15m' }
        );

        const response = await request(app)
          .get('/verify')
          .set('Authorization', `Bearer ${token}`)
          .expect(200);

        expect(response.headers['x-user-authenticated']).toBe('true');
        expect(response.headers['x-user-name']).toBe('test@example.com');
        expect(JSON.parse(response.headers['x-user-roles'])).toEqual(['User', 'Admin']);
      });

      it('should return 403 TOKEN_EXPIRED for expired token', async () => {
        // Create a token that's already expired by setting exp to a past timestamp
        const expiredPayload = {
          UserInfo: {
            username: 'test@example.com',
            roles: ['User'],
          },
          exp: Math.floor(Date.now() / 1000) - 60, // Expired 60 seconds ago
        };
        const token = jwt.sign(expiredPayload, process.env.ACCESS_TOKEN_SECRET);

        const response = await request(app)
          .get('/verify')
          .set('Authorization', `Bearer ${token}`)
          .expect(403);

        expect(response.body).toEqual({
          message: 'Token expired',
          code: 'TOKEN_EXPIRED',
        });
      });

      it('should return 403 INVALID_TOKEN for invalid signature', async () => {
        const token = jwt.sign(
          {
            UserInfo: {
              username: 'test@example.com',
              roles: ['User'],
            },
          },
          'wrong-secret',
          { expiresIn: '15m' }
        );

        const response = await request(app)
          .get('/verify')
          .set('Authorization', `Bearer ${token}`)
          .expect(403);

        expect(response.body).toEqual({
          message: 'Invalid token',
          code: 'INVALID_TOKEN',
        });
      });

      it('should return 401 for malformed token payload', async () => {
        const token = jwt.sign(
          { someOtherData: 'notUserInfo' },
          process.env.ACCESS_TOKEN_SECRET,
          { expiresIn: '15m' }
        );

        const response = await request(app)
          .get('/verify')
          .set('Authorization', `Bearer ${token}`)
          .expect(401);

        expect(response.headers['x-auth-error']).toBe('MALFORMED_TOKEN');
      });
    });

    describe('Token via cookie', () => {
      it('should return 200 with user headers for valid token in cookie', async () => {
        const token = jwt.sign(
          {
            UserInfo: {
              username: 'cookie@example.com',
              roles: ['User'],
            },
          },
          process.env.ACCESS_TOKEN_SECRET,
          { expiresIn: '15m' }
        );

        const response = await request(app)
          .get('/verify')
          .set('Cookie', `jwt=${token}`)
          .expect(200);

        expect(response.headers['x-user-authenticated']).toBe('true');
        expect(response.headers['x-user-name']).toBe('cookie@example.com');
        expect(JSON.parse(response.headers['x-user-roles'])).toEqual(['User']);
      });

      it('should prefer Authorization header over cookie', async () => {
        const headerToken = jwt.sign(
          {
            UserInfo: {
              username: 'header@example.com',
              roles: ['Admin'],
            },
          },
          process.env.ACCESS_TOKEN_SECRET,
          { expiresIn: '15m' }
        );

        const cookieToken = jwt.sign(
          {
            UserInfo: {
              username: 'cookie@example.com',
              roles: ['User'],
            },
          },
          process.env.ACCESS_TOKEN_SECRET,
          { expiresIn: '15m' }
        );

        const response = await request(app)
          .get('/verify')
          .set('Authorization', `Bearer ${headerToken}`)
          .set('Cookie', `jwt=${cookieToken}`)
          .expect(200);

        // Should use header token, not cookie
        expect(response.headers['x-user-name']).toBe('header@example.com');
        expect(JSON.parse(response.headers['x-user-roles'])).toEqual(['Admin']);
      });
    });
  });
});
