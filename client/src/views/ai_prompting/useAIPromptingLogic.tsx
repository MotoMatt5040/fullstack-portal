import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  useGetChatModelsQuery,
  useGetAiResponseMutation,
} from '../../features/aiPromptingApiSlice';

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

  const [originalQuestion, setOriginalQuestion] = useState<string>('');
  const [testQuestion, setTestQuestion] = useState<string>('');
  const [selectedModel, setSelectedModel] = useState<string | null>(null);
  const [systemPrompt, setSystemPrompt] = useState<string>('');
  const [promptExchanges, setPromptExchanges] = useState<PromptExchange[]>([
    { user: '', assistant: '' },
  ]);
  const [requestJson, setRequestJson] = useState<string>('');
  const [output, setOutput] = useState<string>('');
  const systemPromptRef = useRef<HTMLTextAreaElement>(null);

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

  const handleOriginalQuestionChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setOriginalQuestion(e.target.value);
    },
    []
  );

  const handleTestQuestionChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setTestQuestion(e.target.value);
    },
    []
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
    setPromptExchanges((prev) => [...prev, { user: '', assistant: '' }]);
  }, []);

  const removePromptExchange = useCallback((index: number) => {
    setPromptExchanges((prev) => prev.filter((_, i) => i !== index));
  }, []);

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

    if (originalQuestion.trim()) {
      displayMessages.push({
        role: 'user',
        content: originalQuestion.trim().replace(/\\n/g, '\n'),
      });
    }

    const displayObject = {
      model: selectedModel,
      messages: displayMessages,
    };
    setRequestJson(JSON.stringify(displayObject, null, 2));

    const payloadMessages = [...displayMessages];
    if (testQuestion.trim()) {
      payloadMessages.push({
        role: 'user',
        content: testQuestion.trim().replace(/\\n/g, '\n'),
      });
    }

    const payloadObject = {
      model: selectedModel,
      messages: payloadMessages,
    };

    console.log('Payload sent to API:', payloadObject);

    try {
      const payload = await getAiResponse(payloadObject).unwrap();
      setOutput(payload);
    } catch (error) {
      console.error('Failed to get AI response:', error);
      setOutput(
        'Error: Could not generate a response. Please check the console for details.'
      );
    }
  }, [
    systemPrompt,
    promptExchanges,
    selectedModel,
    getAiResponse,
    originalQuestion,
    testQuestion,
  ]);

  const clearAll = useCallback(() => {
    setSelectedModel(models && models.length > 0 ? models[0].id : null);
    setSystemPrompt('');
    setOriginalQuestion('');
    setPromptExchanges([{ user: '', assistant: '' }]);
    setOutput('');
    setRequestJson('');
    setTestQuestion('');
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
    originalQuestion,
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
    testQuestion,
    handleTestQuestionChange
  };
};