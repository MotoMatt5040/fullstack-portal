const express = require('express');
const router = express.Router();
const { handleContactSupport } = require('../controllers/supportController');

router.post('/contact', handleContactSupport);

module.exports = router;