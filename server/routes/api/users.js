const express = require('express');
const router = express.Router();
const ROLES_LIST = require('../../config/rolesList');
const verifyRoles = require('../../middleware/verifyRoles');
const usersController = require('../../controllers/usersController');

// router
// 	.route('/')
// 	.get(verifyRoles(ROLES_LIST.Admin), usersController.getAllUsers)
// 	.delete(verifyRoles(ROLES_LIST.Admin), usersController.deleteUser);

// router.route('/:id').get(usersController.getUser);

router
	.route('/adduser')
	.post(verifyRoles(ROLES_LIST.Admin), usersController.handleCreateUser);

router
	.route('/getclients')
	.get(verifyRoles(ROLES_LIST.Admin), usersController.handleGetClients);

// router
//     .route('/getpartners')
//     .get(verifyRoles(ROLES_LIST.Admin), usersController.handleGetPartners);

module.exports = router;
