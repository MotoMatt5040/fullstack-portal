const OpenAI = require('openai');const { tblProjectPrompts, Authentication, tblDefaultPrompt } = require('../models');

const openAI = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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

const updateDefaultPrompt = async (tone, prompt, email) => {
  try {
    const user = await Authentication.findOne({
      where: { email: email },
    });
    if (!user) {
      throw new Error(`Authentication error: User with email ${email} not found.`);
    }
    const [defaultPrompt, created] = await tblDefaultPrompt.upsert({
      tone: tone,
      prompt: prompt,
      createdBy: user.Uuid,
    }, {
      returning: true,
    });
    return defaultPrompt;
  } catch (error) {
    console.error('Error updating default prompt:', error);
    throw new Error('Failed to update default prompt');
  }
};

const getAiPrompts = async (projectId, questionNumber) => {
  try {
    const prompts = await tblProjectPrompts.findAll({
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
    const user = await Authentication.findOne({
      where: { email: email },
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
  getDefaultPrompt,
  updateDefaultPrompt
};
