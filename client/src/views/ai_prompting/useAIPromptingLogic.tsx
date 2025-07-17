import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { selectUser } from '../../features/auth/authSlice';
import {
  useGetChatModelsQuery,
  useGetAiResponseMutation,
  useGetAiPromptsQuery,
  useAddAiPromptMutation,
  useGetDefaultPromptQuery,
  useUpdateDefaultPromptMutation,
} from '../../features/aiPromptingApiSlice';

const countWords = (str) => {
  if (!str.trim()) return 0;
  return str.trim().split(/\s+/).length;
};

interface PromptExchange {
  user: string;
  assistant: string;
}

interface ChatModel {
  id: string;
  object: string;
}

interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export const useAIPromptingLogic = () => {
  const {
    data: models,
    isLoading: modelsLoading,
    error: modelsError,
  } = useGetChatModelsQuery();

  const [getAiResponse, { isLoading: isGenerating }] =
    useGetAiResponseMutation();

  const [addAiPrompt, { isLoading: isAddingPrompt }] = useAddAiPromptMutation();

  const [updateDefaultPrompt, { isLoading: isUpdatingDefaultPrompt }] = 
    useUpdateDefaultPromptMutation();

  const currentUser = useSelector(selectUser);

  const [rawFinalSystemInstruction, setRawFinalSystemInstruction] = useState('');
  const [testQuestions, setTestQuestions] = useState([]);
  const [testResponses, setTestResponses] = useState([]);
  const [selectedModel, setSelectedModel] = useState(null);
  const [temperature, setTemperature] = useState(0.5);
  const [systemPrompt, setSystemPrompt] = useState('');
  const [questionSummary, setQuestionSummary] = useState('');
  const [tone, setTone] = useState('professional / friendly');
  const [projectId, setProjectId] = useState('');
  const [questionNumber, setQuestionNumber] = useState('');
  const [promptExchanges, setPromptExchanges] = useState([]);
  const [requestJson, setRequestJson] = useState('');
  const [output, setOutput] = useState('');
  const systemPromptRef = useRef(null);

  const [showExchanges, setShowExchanges] = useState(false);
  const [showTestResponses, setShowTestResponses] = useState(false);
  const [outputWordCount, setOutputWordCount] = useState(0);
  const [testResponsesWordCounts, setTestResponsesWordCounts] = useState([]);

  const { 
    data: defaultPrompt, 
    isLoading: defaultPromptLoading,
    error: defaultPromptError 
  } = useGetDefaultPromptQuery();

  const { data: prompts, isLoading: promptsLoading } = useGetAiPromptsQuery(
    { projectId, questionNumber },
    { skip: !projectId || !questionNumber }
  );

  const toneOptions = useMemo(() => [
    { value: 'professional / friendly', label: '1. Professional / Friendly' },
    { value: 'neutral / objective', label: '2. Neutral / Objective' },
    { value: 'professional / formal', label: '3. Professional / Formal' },
    { value: 'friendly / conversational', label: '4. Friendly / Conversational' },
    { value: 'encouraging / supportive', label: '5. Encouraging / Supportive' },
    { value: 'concise / direct', label: '6. Concise / Direct' },
    { value: 'polite / softened', label: '7. Polite / Softened' },
    { value: 'direct / challenging', label: '8. Direct / Challenging' },
  ], []);

  const modelOptions = useMemo(() => {
    if (!models) return [];
    return models.map((model) => ({
      value: model.id,
      label: model.id,
    }));
  }, [models]);

  useEffect(() => {
    if (models && models.length > 0 && !selectedModel) {
      setSelectedModel(models[67].id);
    }
  }, [models, selectedModel]);

  useEffect(() => {
    if (defaultPrompt && defaultPrompt.prompt) {
      if (!systemPrompt || systemPrompt === '') {
        setSystemPrompt(defaultPrompt.prompt);
        if (defaultPrompt.tone) {
          setTone(defaultPrompt.tone);
        }
      }
    }
  }, [defaultPrompt, systemPrompt]);

  useEffect(() => {
    if (prompts && prompts.length > 0) {
      const latestPrompt = prompts[0]; 
      setSystemPrompt(latestPrompt.prompt);
      
      if (latestPrompt.questionSummary) {
        setQuestionSummary(latestPrompt.questionSummary);
      }
      
      if (latestPrompt.tone) {
        setTone(latestPrompt.tone);
      }
    }
  }, [prompts]);

  const getProcessedSystemPrompt = useCallback(() => {
    if (!systemPrompt) return '';
    let processed = systemPrompt;
    
    if (questionSummary && questionSummary.trim()) {
      processed = processed.replace(/\[summary:\]/gi, `[summary: ${questionSummary}]`);
    }
    
    if (tone && tone.trim()) {
      processed = processed.replace(/\[tone:\]/gi, `[tone: ${tone}]`);
    }
    
    return processed;
  }, [systemPrompt, questionSummary, tone]);

  const getFinalSystemPromptForJson = useCallback(() => {
    if (!systemPrompt) return '';
    let processed = systemPrompt;
    
    if (questionSummary && questionSummary.trim()) {
      processed = processed.replace(/\[summary:\]/gi, questionSummary);
    } else {
      processed = processed.replace(/\[summary:\]/gi, '');
    }
    
    if (tone && tone.trim()) {
      processed = processed.replace(/\[tone:\]/gi, tone);
    } else {
      processed = processed.replace(/\[tone:\]/gi, '');
    }
    
    return processed;
  }, [systemPrompt, questionSummary, tone]);

  const handleSelectPrompt = useCallback((selectedPromptText) => {
    setSystemPrompt(selectedPromptText);
  }, []);

  const handleUpdatePrompt = useCallback(async () => {
    if (!systemPrompt.trim()) {
      console.error('Cannot update with an empty prompt.');
      return;
    }

    if (!currentUser) {
      console.error('No user information available.');
      return;
    }

    if (!projectId || !questionNumber) {
      console.error('Project ID and Question Number are required.');
      return;
    }

    try {
      const payload = {
        projectId,
        questionNumber,
        questionSummary,
        tone,
        prompt: systemPrompt,
        email: currentUser.email,
      };

      await addAiPrompt(payload).unwrap();
      console.log('Prompt updated successfully!');
    } catch (error) {
      console.error('Failed to update prompt:', error);
    }
  }, [systemPrompt, addAiPrompt, currentUser, projectId, questionNumber, questionSummary, tone]);

  const handleUpdateDefaultPrompt = useCallback(async () => {
    if (!systemPrompt.trim()) {
      console.error('Cannot update default prompt with an empty prompt.');
      return;
    }

    if (!currentUser) {
      console.error('No user information available.');
      return;
    }

    try {
      const payload = {
        tone,
        prompt: systemPrompt,
        email: currentUser.email,
      };

      await updateDefaultPrompt(payload).unwrap();
      console.log('Default prompt updated successfully!');
    } catch (error) {
      console.error('Failed to update default prompt:', error);
    }
  }, [systemPrompt, tone, updateDefaultPrompt, currentUser]);

  const handleModelChange = useCallback((option) => {
    setSelectedModel(option ? option.value : null);
  }, []);

  const handleTemperatureChange = useCallback((e) => {
    setTemperature(parseFloat(e.target.value));
  }, []);

  const handleProjectIdChange = useCallback((e) => {
    setProjectId(e.target.value);
  }, []);

  const handleQuestionNumberChange = useCallback((e) => {
    setQuestionNumber(e.target.value);
  }, []);

  const handleQuestionSummaryChange = useCallback((e) => {
    setQuestionSummary(e.target.value);
  }, []);

  const handleToneChange = useCallback((option) => {
    const newTone = option ? option.value : 'neutral / friendly';
    setTone(newTone);
  }, []);

  const handleFinalSystemInstructionChange = useCallback((e) => {
    setRawFinalSystemInstruction(e.target.value);
  }, []);

  const handleTestQuestionChange = useCallback(
    (index, e) => {
      const newTestQuestions = [...testQuestions];
      newTestQuestions[index] = e.target.value;
      setTestQuestions(newTestQuestions);
    },
    [testQuestions]
  );

  const addTestQuestion = useCallback(() => {
    if (!showTestResponses) setShowTestResponses(true);
    setTestQuestions((prev) => [...prev, '']);
    setTestResponsesWordCounts((prev) => [...prev, 0]);
  }, [showTestResponses]);

  const removeTestQuestion = useCallback(
    (index) => {
      const newTestQuestions = testQuestions.filter((_, i) => i !== index);
      setTestQuestions(newTestQuestions);
      setTestResponses((prev) => prev.filter((_, i) => i !== index));
      setTestResponsesWordCounts((prev) => prev.filter((_, i) => i !== index));

      if (newTestQuestions.length === 0) {
        setShowTestResponses(false);
      }
    },
    [testQuestions]
  );

  const handleSystemPromptChange = useCallback((e) => {
    setSystemPrompt(e.target.value);
  }, []);

  const handleUserPromptChange = useCallback((index, e) => {
    setPromptExchanges((prev) => {
      const newExchanges = [...prev];
      newExchanges[index] = { ...newExchanges[index], user: e.target.value };
      return newExchanges;
    });
  }, []);

  const handleAssistantResponseChange = useCallback((index, e) => {
    setPromptExchanges((prev) => {
      const newExchanges = [...prev];
      newExchanges[index] = {
        ...newExchanges[index],
        assistant: e.target.value,
      };
      return newExchanges;
    });
  }, []);

  const addPromptExchange = useCallback(() => {
    if (!showExchanges) setShowExchanges(true);
    setPromptExchanges((prev) => [...prev, { user: '', assistant: '' }]);
  }, [showExchanges]);

  const removePromptExchange = useCallback(
    (index) => {
      const newExchanges = promptExchanges.filter((_, i) => i !== index);
      setPromptExchanges(newExchanges);
      if (newExchanges.length === 0) {
        setShowExchanges(false);
      }
    },
    [promptExchanges]
  );

  const generateOutput = useCallback(async () => {
    const messages = [];

    // Use the final system prompt (without brackets) for JSON and API
    const finalSystemPromptForJson = getFinalSystemPromptForJson();
    if (finalSystemPromptForJson.trim()) {
      messages.push({
        role: 'system',
        content: finalSystemPromptForJson.trim().replace(/\\n/g, '\n'),
      });
    }

    promptExchanges.forEach((exchange) => {
      if (exchange.user.trim()) {
        messages.push({
          role: 'user',
          content: exchange.user.trim().replace(/\\n/g, '\n'),
        });
      }
      if (exchange.assistant.trim()) {
        messages.push({
          role: 'assistant',
          content: exchange.assistant.trim().replace(/\\n/g, '\n'),
        });
      }
    });

    const finalSystemInstructionContent = `Generate a follow-up question based on the original survey question and the respondent's answer below.\n\nOriginal Question: [${questionNumber}.textLabel]\nResponse: [${questionNumber}.openEnd]\n\nFollow-up Question:`;

    // Add the final system instruction to messages
    if (rawFinalSystemInstruction.trim()) {
      messages.push({
        role: 'user',
        content: finalSystemInstructionContent.trim().replace(/\\n/g, '\n'),
      });
    }

    const requestObject = {
      model: selectedModel,
      temperature: temperature,
      messages: messages,
    };
    setRequestJson(JSON.stringify(requestObject, null, 2));

    if (testQuestions.some((q) => q.trim())) {
      const responses = [];
      const wordCounts = [];
      for (const testQuestion of testQuestions) {
        if (testQuestion.trim()) {
          const testMessages = [...messages];
          
          testMessages.push({
            role: 'assistant',
            content: testQuestion.trim().replace(/\\n/g, '\n'),
          });

          const payloadObject = {
            model: selectedModel,
            temperature: temperature,
            messages: testMessages,
          };

          try {
            const payload = await getAiResponse(payloadObject).unwrap();
            responses.push(payload);
            wordCounts.push(countWords(payload));
          } catch (error) {
            console.error('Failed to get AI response:', error);
            const errorMsg = 'Error: Could not generate a response.';
            responses.push(errorMsg);
            wordCounts.push(countWords(errorMsg));
          }
        } else {
          responses.push('');
          wordCounts.push(0);
        }
      }
      setTestResponses(responses);
      setTestResponsesWordCounts(wordCounts);
      setOutput('');
      setOutputWordCount(0);
    } else {
      const payloadObject = {
        model: selectedModel,
        temperature: temperature,
        messages: messages,
      };

      try {
        const payload = await getAiResponse(payloadObject).unwrap();
        setOutput(payload);
        setOutputWordCount(countWords(payload));
        setTestResponses([]);
        setTestResponsesWordCounts([]);
      } catch (error) {
        console.error('Failed to get AI response:', error);
        const errorMsg = 'Error: Could not generate a response.';
        setOutput(errorMsg);
        setOutputWordCount(countWords(errorMsg));
      }
    }
  }, [
    systemPrompt,
    questionSummary,
    tone,
    promptExchanges,
    selectedModel,
    temperature,
    getAiResponse,
    rawFinalSystemInstruction,
    questionNumber,
    testQuestions,
    getFinalSystemPromptForJson,
  ]);

  const clearAll = useCallback(() => {
    setSelectedModel(models && models.length > 0 ? models[0].id : null);
    setSystemPrompt('');
    setQuestionSummary('');
    setTone('neutral / friendly');
    setProjectId('');
    setRawFinalSystemInstruction('');
    setPromptExchanges([]);
    setOutput('');
    setRequestJson('');
    setTestQuestions([]);
    setTestResponses([]);
    setQuestionNumber('');
    setShowExchanges(false);
    setShowTestResponses(false);
    setOutputWordCount(0);
    setTestResponsesWordCounts([]);
  }, [models]);

  return {
    modelsLoading,
    modelsError,
    modelOptions,
    toneOptions,
    selectedModel,
    isGenerating,
    handleModelChange,
    systemPrompt,
    handleSystemPromptChange,
    questionSummary,
    handleQuestionSummaryChange,
    tone,
    handleToneChange,
    projectId,
    handleProjectIdChange,
    getProcessedSystemPrompt,
    systemPromptRef,
    finalSystemInstruction: rawFinalSystemInstruction,
    handleFinalSystemInstructionChange,
    promptExchanges,
    handleUserPromptChange,
    handleAssistantResponseChange,
    addPromptExchange,
    removePromptExchange,
    output,
    generateOutput,
    clearAll,
    requestJson,
    testQuestions,
    handleTestQuestionChange,
    addTestQuestion,
    removeTestQuestion,
    testResponses,
    temperature,
    handleTemperatureChange,
    questionNumber,
    handleQuestionNumberChange,
    showExchanges,
    showTestResponses,
    outputWordCount,
    testResponsesWordCounts,
    prompts,
    promptsLoading,
    handleSelectPrompt,
    handleUpdatePrompt,
    isAddingPrompt,
    handleUpdateDefaultPrompt,
    isUpdatingDefaultPrompt,
    defaultPromptLoading,
  };
};