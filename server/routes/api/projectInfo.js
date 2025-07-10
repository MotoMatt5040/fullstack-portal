const express = require('express');
const router = express.Router();
const verifyRoles = require('../../middleware/verifyRoles');
const {ROLES_LIST} = require('../../config/rolesConfig');
const projectInfoController = require('../../controllers/projectInfoController');

router
  .route('/projects')
  .get(
    verifyRoles(
      ROLES_LIST.Admin,
      ROLES_LIST.Executive,
      ROLES_LIST.Programmer,
      ROLES_LIST.Manager,
      ROLES_LIST.External
    ),
    projectInfoController.handleGetProjectList
  );

  module.exports = router;