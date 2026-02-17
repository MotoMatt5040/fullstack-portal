const OpenAI = require('openai');
const { tblProjectPrompts, Authentication, tblDefaultPrompt } = require('../models');

const openAI = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Get the default prompt configuration
 */
const getDefaultPrompt = async () => {
  try {
    const prompt = await tblDefaultPrompt.findOne({
      order: [['dateCreated', 'DESC']],
    });
    return prompt;
  } catch (error) {
    console.error('Error fetching default prompt:', error);
    throw new Error('Failed to fetch default prompt');
  }
};

/**
 * Update or create the default prompt
 */
const updateDefaultPrompt = async (tone, prompt, email) => {
  try {
    const user = await Authentication.findOne({
      where: { Email: email },
    });
    if (!user) {
      throw new Error(`Authentication error: User with email ${email} not found.`);
    }
    const [defaultPrompt, created] = await tblDefaultPrompt.upsert(
      {
        tone: tone,
        prompt: prompt,
        createdBy: user.Uuid,
      },
      {
        returning: true,
      }
    );
    return defaultPrompt;
  } catch (error) {
    console.error('Error updating default prompt:', error);
    throw new Error('Failed to update default prompt');
  }
};

/**
 * Get AI prompts for a specific project and question
 */
const getAiPrompts = async (projectId, questionNumber) => {
  try {
    const prompts = await tblProjectPrompts.findAll({
      where: {
        projectId: projectId,
        questionNumber: questionNumber,
      },
      limit: 5,
      order: [['dateCreated', 'DESC']],
    });
    return prompts;
  } catch (error) {
    console.error('Error fetching AI prompts with Sequelize:', error);
    throw error;
  }
};

/**
 * Add a new AI prompt for a project
 */
const addAiPrompt = async (projectId, questionNumber, questionSummary, tone, prompt, email) => {
  try {
    const user = await Authentication.findOne({
      where: { Email: email },
    });

    if (!user) {
      throw new Error(`Authentication error: User with email ${email} not found.`);
    }

    const newPrompt = await tblProjectPrompts.create({
      projectId: projectId,
      questionNumber: questionNumber,
      questionSummary: questionSummary,
      tone: tone,
      prompt: prompt,
      createdBy: user.Uuid,
    });

    return newPrompt;
  } catch (error) {
    console.error('Error adding new AI prompt:', error);
    throw error;
  }
};

/**
 * Get AI response from OpenAI
 */
const getAIResponse = async (model, messages) => {
  try {
    const response = await openAI.chat.completions.create({
      model: model,
      messages: messages,
      store: false,
    });
    return response;
  } catch (error) {
    console.error('Error fetching AI response:', error);
    throw new Error('Failed to fetch AI response');
  }
};

/**
 * Get list of available GPT models
 */
const getGPTModels = async () => {
  try {
    const response = await openAI.models.list();
    return response.data;
  } catch (error) {
    console.error('Error fetching GPT model list:', error);
    throw new Error('Failed to fetch GPT model list');
  }
};

module.exports = {
  getAIResponse,
  getGPTModels,
  getAiPrompts,
  addAiPrompt,
  getDefaultPrompt,
  updateDefaultPrompt,
};
