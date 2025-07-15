const express = require('express');
const router = express.Router();
const verifyRoles = require('../../middleware/verifyRoles');
const { ROLES_LIST } = require('../../config/rolesConfig');
const OpenAIPromptingController = require('../../controllers/openAIPromptingController');

router.route('/response')
  .post(
    verifyRoles(
      ROLES_LIST.Admin,
      ROLES_LIST.Executive,
      ROLES_LIST.Programmer
    ),
    OpenAIPromptingController.handleGetOpenAIResponse
  );

router.route('/models')
  .get(
    verifyRoles(
      ROLES_LIST.Admin,
      ROLES_LIST.Executive,
      ROLES_LIST.Programmer
    ),
    OpenAIPromptingController.handleGetOpenAIModels
  );

module.exports = router;
