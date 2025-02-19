const express = require('express');
const router = express.Router();
const { handlePasswordResetRequest, handleResetPassword } = require('../controllers/resetPasswordController');

router.post('/reset-password', handlePasswordResetRequest);
router.post('/reset-password:email', handleResetPassword);

module.exports = router;
