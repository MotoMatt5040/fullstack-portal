const express = require('express');
const router = express.Router();
const { gatewayAuth, verifyRoles } = require('@internal/auth-middleware');
const { ROLES_LIST } = require('@internal/roles-config');
const OpenAIPromptingController = require('../controllers/openAIPromptingController');

// All routes require authentication via gateway
router.use(gatewayAuth);

// POST /api/ai/response - Get AI response
router.route('/response').post(
  verifyRoles(ROLES_LIST.Admin, ROLES_LIST.Executive, ROLES_LIST.Programmer),
  OpenAIPromptingController.handleGetOpenAIResponse
);

// GET /api/ai/models - Get available OpenAI models
router.route('/models').get(
  verifyRoles(ROLES_LIST.Admin, ROLES_LIST.Executive, ROLES_LIST.Programmer),
  OpenAIPromptingController.handleGetOpenAIModels
);

// GET/POST /api/ai/prompts - Get or add AI prompts
router
  .route('/prompts')
  .get(
    verifyRoles(ROLES_LIST.Admin, ROLES_LIST.Executive, ROLES_LIST.Programmer),
    OpenAIPromptingController.handleGetAiPrompts
  )
  .post(
    verifyRoles(ROLES_LIST.Admin, ROLES_LIST.Executive, ROLES_LIST.Programmer),
    OpenAIPromptingController.handleAddAiPrompt
  );

// GET/POST /api/ai/default-prompt - Get or update default prompt
router
  .route('/default-prompt')
  .get(
    verifyRoles(ROLES_LIST.Admin, ROLES_LIST.Executive, ROLES_LIST.Programmer),
    OpenAIPromptingController.handleGetDefaultPrompt
  )
  .post(
    verifyRoles(ROLES_LIST.Admin, ROLES_LIST.Executive, ROLES_LIST.Programmer),
    OpenAIPromptingController.handleUpdateDefaultPrompt
  );

module.exports = router;
