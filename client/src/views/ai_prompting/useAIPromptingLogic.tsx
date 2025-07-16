import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  useGetChatModelsQuery,
  useGetAiResponseMutation,
} from '../../features/aiPromptingApiSlice';

// Helper function to calculate words
const countWords = (str: string) => {
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

  const [rawOriginalQuestion, setRawOriginalQuestion] = useState<string>('');
  const [testQuestions, setTestQuestions] = useState<string[]>([]);
  const [testResponses, setTestResponses] = useState<string[]>([]);
  const [selectedModel, setSelectedModel] = useState<string | null>(null);
  const [temperature, setTemperature] = useState<number>(0.2);
  const [systemPrompt, setSystemPrompt] = useState<string>('');
  const [questionNumber, setQuestionNumber] = useState<string>('');
  const [promptExchanges, setPromptExchanges] = useState<PromptExchange[]>([]);
  const [requestJson, setRequestJson] = useState<string>('');
  const [output, setOutput] = useState<string>('');
  const systemPromptRef = useRef<HTMLTextAreaElement>(null);

  // State for visibility and RESPONSE word counts
  const [showExchanges, setShowExchanges] = useState<boolean>(false);
  const [showTestResponses, setShowTestResponses] = useState<boolean>(false);
  const [outputWordCount, setOutputWordCount] = useState(0);
  const [testResponsesWordCounts, setTestResponsesWordCounts] = useState<number[]>([]);

  const modelOptions = useMemo(() => {
    if (!models) return [];
    return models.map((model: ChatModel) => ({
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
    if (systemPromptRef.current) {
      systemPromptRef.current.style.height = 'auto';
      systemPromptRef.current.style.height = `${systemPromptRef.current.scrollHeight}px`;
    }
  }, [systemPrompt]);

  const handleModelChange = useCallback(
    (option: { value: string; label: string } | null) => {
      setSelectedModel(option ? option.value : null);
    },
    []
  );

  const handleTemperatureChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setTemperature(parseFloat(e.target.value));
    },
    []
  );

  const handleQuestionNumberChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setQuestionNumber(e.target.value);
    },
    []
  );

  const handleOriginalQuestionChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setRawOriginalQuestion(e.target.value);
    },
    []
  );

  const handleTestQuestionChange = useCallback(
    (index: number, e: React.ChangeEvent<HTMLTextAreaElement>) => {
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
    (index: number) => {
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

  const handleSystemPromptChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setSystemPrompt(e.target.value);
    },
    []
  );

  const handleUserPromptChange = useCallback(
    (index: number, e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setPromptExchanges((prev) => {
        const newExchanges = [...prev];
        newExchanges[index] = { ...newExchanges[index], user: e.target.value };
        return newExchanges;
      });
    },
    []
  );

  const handleAssistantResponseChange = useCallback(
    (index: number, e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setPromptExchanges((prev) => {
        const newExchanges = [...prev];
        newExchanges[index] = {
          ...newExchanges[index],
          assistant: e.target.value,
        };
        return newExchanges;
      });
    },
    []
  );

  const addPromptExchange = useCallback(() => {
    if (!showExchanges) setShowExchanges(true);
    setPromptExchanges((prev) => [...prev, { user: '', assistant: '' }]);
  }, [showExchanges]);

  const removePromptExchange = useCallback(
    (index: number) => {
      const newExchanges = promptExchanges.filter((_, i) => i !== index);
      setPromptExchanges(newExchanges);
      if (newExchanges.length === 0) {
        setShowExchanges(false);
      }
    },
    [promptExchanges]
  );

  const generateOutput = useCallback(async () => {
    const displayMessages: Message[] = [];

    if (systemPrompt.trim()) {
      displayMessages.push({
        role: 'system',
        content: systemPrompt.trim().replace(/\\n/g, '\n'),
      });
    }

    promptExchanges.forEach((exchange) => {
      if (exchange.user.trim()) {
        displayMessages.push({
          role: 'user',
          content: exchange.user.trim().replace(/\\n/g, '\n'),
        });
      }
      if (exchange.assistant.trim()) {
        displayMessages.push({
          role: 'assistant',
          content: exchange.assistant.trim().replace(/\\n/g, '\n'),
        });
      }
    });

    const finalOriginalQuestion = `Original Question: ${rawOriginalQuestion}\nResponse: [${questionNumber}]\nFollow-up Question:`;

    if (rawOriginalQuestion.trim() && !testQuestions.some((q) => q.trim())) {
      displayMessages.push({
        role: 'user',
        content: finalOriginalQuestion.trim().replace(/\\n/g, '\n'),
      });
    }

    const displayObject = {
      model: selectedModel,
      temperature: temperature,
      messages: displayMessages,
    };
    setRequestJson(JSON.stringify(displayObject, null, 2));

    if (testQuestions.some((q) => q.trim())) {
      const responses: string[] = [];
      const wordCounts: number[] = [];
      for (const testQuestion of testQuestions) {
        if (testQuestion.trim()) {
          const payloadMessages = [...displayMessages];
          if (rawOriginalQuestion.trim()) {
            payloadMessages.push({
              role: 'user',
              content: finalOriginalQuestion.trim().replace(/\\n/g, '\n'),
            });
            payloadMessages.push({
              role: 'assistant',
              content: testQuestion.trim().replace(/\\n/g, '\n'),
            });
          } else {
             payloadMessages.push({
              role: 'user',
              content: testQuestion.trim().replace(/\\n/g, '\n'),
            });
          }

          const payloadObject = {
            model: selectedModel,
            temperature: temperature,
            messages: payloadMessages,
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
      const payloadMessages = [...displayMessages];
      const payloadObject = {
        model: selectedModel,
        temperature: temperature,
        messages: payloadMessages,
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
    promptExchanges,
    selectedModel,
    temperature,
    getAiResponse,
    rawOriginalQuestion,
    questionNumber,
    testQuestions,
  ]);

  const clearAll = useCallback(() => {
    setSelectedModel(models && models.length > 0 ? models[0].id : null);
    setSystemPrompt('');
    setRawOriginalQuestion('');
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
    selectedModel,
    isGenerating,
    handleModelChange,
    systemPrompt,
    handleSystemPromptChange,
    systemPromptRef,
    originalQuestion: rawOriginalQuestion,
    handleOriginalQuestionChange,
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
  };
};