// Auth Service - authRoutes.js

const express = require('express');
const router = express.Router();
const { sequelize, tblRoles } = require('../models');

const { handleLogin, handleLogout } = require('../controllers/authController');
const { handleRefreshToken } = require('../controllers/refreshTokenController');
const { handlePasswordResetRequest, handleResetPassword } = require('../controllers/resetPasswordController');

// Health check (accessible via /api/auth/health through Caddy)
router.get('/auth/health', async (req, res) => {
    let dbStatus = 'unknown';
    try {
        await sequelize.authenticate();
        dbStatus = 'connected';
    } catch (error) {
        dbStatus = `error: ${error.message}`;
    }

    res.status(200).json({
        status: 'healthy',
        service: 'auth-service',
        database: dbStatus,
        dbName: process.env.PROMARK_DB_NAME || 'CaligulaD',
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

// Roles endpoint - returns role mapping for other services
router.get('/auth/roles', async (req, res) => {
    try {
        const roles = await tblRoles.findAll({
            attributes: ['RoleID', 'RoleName']
        });

        // Convert to { RoleName: RoleID } object
        const rolesMap = {};
        roles.forEach(role => {
            rolesMap[role.RoleName] = role.RoleID;
        });

        res.json(rolesMap);
    } catch (error) {
        console.error('Error fetching roles:', error);
        res.status(500).json({ message: 'Failed to fetch roles' });
    }
});

module.exports = router;
