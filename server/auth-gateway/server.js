// Auth Gateway - JWT validation for Caddy forward_auth
// This service validates JWTs and returns user info via headers
require('dotenv').config();

const express = require('express');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 5005;

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy', service: 'auth-gateway' });
});

// Auth verification endpoint - called by Caddy forward_auth
app.get('/verify', (req, res) => {
  // Debug logging
  console.log('=== Auth Gateway /verify ===');
  console.log('Authorization header:', req.headers.authorization ? 'present' : 'missing');
  console.log('Cookie header:', req.headers.cookie ? 'present' : 'missing');

  // Get token from Authorization header or cookie
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
      acc[key] = value;
      return acc;
    }, {});
    token = cookies.jwt;
  }

  // No token found - allow public routes, reject protected ones
  if (!token) {
    console.log('No token found');
    // Return 200 with empty user headers for public routes
    // The downstream service decides if auth is required
    res.setHeader('X-User-Authenticated', 'false');
    res.setHeader('X-User-Roles', '');
    res.setHeader('X-User-Name', '');
    return res.status(200).send('OK');
  }

  console.log('Token found, validating...');

  // Validate the token
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      console.log('JWT verification error:', err.name, err.message);
      if (err.name === 'TokenExpiredError') {
        // Return 403 with TOKEN_EXPIRED code so client can refresh
        res.setHeader('Content-Type', 'application/json');
        return res.status(403).json({ message: 'Token expired', code: 'TOKEN_EXPIRED' });
      }
      res.setHeader('Content-Type', 'application/json');
      return res.status(403).json({ message: 'Invalid token', code: 'INVALID_TOKEN' });
    }
    console.log('JWT valid for user:', decoded?.UserInfo?.username, 'roles:', decoded?.UserInfo?.roles);

    if (!decoded?.UserInfo?.username || !decoded?.UserInfo?.roles) {
      res.setHeader('X-Auth-Error', 'MALFORMED_TOKEN');
      return res.status(401).send('Malformed token');
    }

    // Token is valid - set headers for downstream services
    res.setHeader('X-User-Authenticated', 'true');
    res.setHeader('X-User-Name', decoded.UserInfo.username);
    res.setHeader('X-User-Roles', JSON.stringify(decoded.UserInfo.roles));

    return res.status(200).send('OK');
  });
});

app.listen(PORT, () => {
  console.log(`Auth Gateway running on port ${PORT}`);
});
