const express = require('express');
const router = express.Router();
const configController = require('../controllers/configController');

// These routes do not require JWT authentication
router.use('/auth', require('./auth'));
router.use('/refresh', require('./refresh'));
router.use('/logout', require('./logout'));
router.use('/reset', require('./resetPassword'));

router.get('/roles', configController.getRolesConfig); 

router.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    uptime: process.uptime(),
    version: '1.0.0'
  });
});

module.exports = router;