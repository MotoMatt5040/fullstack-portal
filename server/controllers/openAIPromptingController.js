const { getAIResponse } = require('../services/OpenAIPromptingService');
const { getGPTModelList } = require('../services/OpenAIPromptingServices');

const buildMessages = (req) => {
  const messages = [];
  // System message
  if (req?.query?.systemContent) {
    messages.push({ role: 'system', content: req.query.systemContent });
  }
  // Few shots from context array
  const contextArr = req?.query?.context;
  if (Array.isArray(contextArr)) {
    contextArr.forEach(item => {
      if (item.userContent) {
        messages.push({ role: 'user', content: item.userContent });
      }
      if (item.assistantContent) {
        messages.push({ role: 'assistant', content: item.assistantContent });
      }
    });
  }
  return messages;
};

const handleGetOpenAIResponse = async (req, res) => {
  try {
    const messages = buildMessages(req);
    const models = req?.query?.model;
    if (!models) {
      return res.status(400).json({ message: 'Model is required' });
    }
    if (!messages.length) {
      return res.status(400).json({ message: 'Messages are required' });
    }
    await getAIResponse(models, messages);
    return res.status(200).json(response.data);
  } catch (error) {
    console.error('Error in handleGetOpenAIResponse:', error);
    res
      .status(500)
      .json({ message: 'Internal server error while fetching AI response' });
  }
};

const handleGetOpenAIModels = async (req, res) => {
  try {
    const models = await getGPTModelList();
    return res.status(200).json(models);
  } catch (error) {
    console.error('Error in handleGetOpenAIModels:', error);
    res
      .status(500)
      .json({ message: 'Internal server error while fetching AI models' });
  }
};

module.exports = { handleGetOpenAIResponse, handleGetOpenAIModels };
