const { getAIResponse, getGPTModels } = require('../services/OpenAIPromptingServices');

const handleGetOpenAIResponse = async (req, res) => {
  const model = req?.body?.model;
  if (!model) return res.status(400).json({ message: 'Model is required' });

  const message = req?.body?.messages;
  // console.log(req.body)
  if (!message) return res.status(400).json({ message: 'Message is required' });
  try {
    const response = await getAIResponse(model, message);
    const content = response.choices[0].message.content
    return res.status(200).json(content);
  } catch (error) {
    console.error('Error in handleGetOpenAIResponse:', error);
    res
      .status(500)
      .json({ message: 'Internal server error while fetching AI response' });
  }
};

const handleGetOpenAIModels = async (req, res) => {
  try {
    const models = await getGPTModels();
    return res.status(200).json(models);
  } catch (error) {
    console.error('Error in handleGetOpenAIModels:', error);
    res
      .status(500)
      .json({ message: 'Internal server error while fetching AI models' });
  }
};

module.exports = { handleGetOpenAIResponse, handleGetOpenAIModels };
