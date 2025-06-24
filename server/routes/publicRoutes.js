const express = require('express');
const router = express.Router();
const configController = require('../controllers/configController');

// These routes do not require JWT authentication
router.use('/auth', require('./auth'));
router.use('/refresh', require('./refresh'));
router.use('/logout', require('./logout'));
router.use('/reset', require('./resetPassword'));

router.get('/roles', configController.getRolesConfig); 

module.exports = router;