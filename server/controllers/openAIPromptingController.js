const OpenAIPromptingServices = require('../services/OpenAIPromptingServices');

const handleGetOpenAIResponse = async (req, res) => {
  const model = req?.body?.model;
  if (!model) return res.status(400).json({ message: 'Model is required' });

  const message = req?.body?.messages;
  if (!message) return res.status(400).json({ message: 'Message is required' });

  try {
    const response = await OpenAIPromptingServices.getAIResponse(
      model,
      message
    );
    const content = response.choices[0].message.content;
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
    const models = await OpenAIPromptingServices.getGPTModels();
    return res.status(200).json(models);
  } catch (error) {
    console.error('Error in handleGetOpenAIModels:', error);
    res
      .status(500)
      .json({ message: 'Internal server error while fetching AI models' });
  }
};

const handleGetAiPrompts = async (req, res) => {
  const { projectId, questionNumber } = req.query;

  if (!projectId || !questionNumber) {
    return res
      .status(400)
      .json({ message: 'Project ID and Question Number are required' });
  }

  try {
    const prompts = await OpenAIPromptingServices.getAiPrompts(
      projectId,
      questionNumber
    );
    if (!prompts || prompts.length === 0) {
      return res.status(404).json({ message: 'No AI prompts found' });
    }
    return res.status(200).json(prompts);
  } catch (error) {
    console.error('Error in handleGetAiPrompts:', error);
    res
      .status(500)
      .json({ message: 'Internal server error while fetching AI prompts' });
  }
};

const handleAddAiPrompt = async (req, res) => {
  const { projectId, questionNumber, questionSummary, tone, prompt, email } =
    req.body;

  if (
    !projectId ||
    !questionNumber ||
    !questionSummary ||
    !tone ||
    !prompt ||
    !email
  ) {
    return res.status(400).json({
      message:
        'All fields are required: projectId, questionNumber, questionSummary, tone, prompt, email',
    });
  }

  try {
    const newPrompt = await OpenAIPromptingServices.addAiPrompt(
      projectId,
      questionNumber,
      questionSummary,
      tone,
      prompt,
      email
    );
    return res.status(201).json(newPrompt);
  } catch (error) {
    console.error('Error in handleAddAiPrompt:', error);
    res
      .status(500)
      .json({ message: 'Internal server error while adding AI prompt' });
  }
};

const handleGetDefaultPrompt = async (req, res) => {
  try {
    const defaultPrompt = await OpenAIPromptingServices.getDefaultPrompt();
    if (!defaultPrompt) {
      return res.status(404).json({ message: 'Default prompt not found' });
    }
    return res.status(200).json(defaultPrompt);
  } catch (error) {
    console.error('Error in handleGetDefaultPrompt:', error);
    res
      .status(500)
      .json({ message: 'Internal server error while fetching default prompt' });
  }
};

const handleUpdateDefaultPrompt = async (req, res) => {
  const { tone, prompt, email } = req.body;
  
  if (!tone || !prompt || !email) {
    return res.status(400).json({ 
      message: 'Tone, prompt, and email are required' 
    });
  }

  try {
    const updatedPrompt = await OpenAIPromptingServices.updateDefaultPrompt(
      tone,
      prompt,
      email
    );
    return res.status(200).json(updatedPrompt);
  } catch (error) {
    console.error('Error in handleUpdateDefaultPrompt:', error);
    res
      .status(500)
      .json({ message: 'Internal server error while updating default prompt' });
  }
};

module.exports = {
  handleGetOpenAIResponse,
  handleGetOpenAIModels,
  handleGetAiPrompts,
  handleAddAiPrompt,
  handleGetDefaultPrompt,
  handleUpdateDefaultPrompt
};