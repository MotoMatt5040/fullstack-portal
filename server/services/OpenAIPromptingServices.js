const OpenAI = require('openai');

const openAI = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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
};
