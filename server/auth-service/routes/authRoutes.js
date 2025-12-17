// Auth Service - authRoutes.js

const express = require('express');
const router = express.Router();

const { handleLogin, handleLogout } = require('../controllers/authController');
const { handleRefreshToken } = require('../controllers/refreshTokenController');
const { handlePasswordResetRequest, handleResetPassword } = require('../controllers/resetPasswordController');

// Health check (accessible via /api/auth/health through Caddy)
router.get('/auth/health', (req, res) => {
    res.status(200).json({
        status: 'healthy',
        service: 'auth-service',
        timestamp: new Date().toISOString()
    });
});

// Auth routes
router.post('/auth/login', handleLogin);
router.post('/auth/logout', handleLogout);

// Refresh token route
router.get('/refresh', handleRefreshToken);

// Password reset routes
router.post('/reset/forgot-password', handlePasswordResetRequest);
router.post('/reset/reset-password', handleResetPassword);

module.exports = router;
