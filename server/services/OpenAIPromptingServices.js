const OpenAI = require('openai');const { tblDefaultPrompts, tblAuthentication } = require('../models');

const openAI = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const getAiPrompts = async (projectId, questionNumber) => {
  try {
    const prompts = await tblDefaultPrompts.findAll({
      where: {
        projectId: projectId,
        questionNumber: questionNumber
      },
      limit: 5,
      order: [['dateCreated', 'DESC']],
    });
    return prompts;
  } catch (error) {
    console.error('Error fetching AI prompts with Sequelize:', error);
  }
};

const addAiPrompt = async (projectId, questionNumber, questionSummary, tone, prompt, email) => {
  try {
    const user = await tblAuthentication.findOne({
      where: { email: email },
    });

    if (!user) {
      throw new Error(`Authentication error: User with email ${email} not found.`);
    }

    const newPrompt = await tblDefaultPrompts.create({
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
  }
};

const getAIResponse = async (model, messages) => {
  try {
    const response = await openAI.chat.completions.create({
      model: model,
      messages: messages,
      store: false
    });
    return response;
  } catch (error) {
    console.error('Error fetching AI prompt:', error);
    res.status(500).json({ message: 'Failed to fetch AI prompt' });
  }
};

const getGPTModels = async () => {
  try {
    const response = await openAI.models.list();
    return response.data;
  } catch (error) {
    console.error('Error fetching GPT model list:', error);
    res.status(500).json({ message: 'Failed to fetch GPT model list' });
  }
};

module.exports = {
  getAIResponse,
  getGPTModels,
  getAiPrompts,
  addAiPrompt,
};
