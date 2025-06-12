const express = require('express');
const router = express.Router();
const usersController = require('../controllers/usersController');

router.post('/forgot-password', (req, res) => {
  usersController.handleForgotPassword(req, res);
});

router.post('/reset-password', (req, res) => {
  usersController.handlePasswordReset(req, res);
});

router.get('/verify-reset-token', usersController.handleVerifyResetToken);

module.exports = router;