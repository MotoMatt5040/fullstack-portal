import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useGetChatModelsQuery, useGetAiResponseMutation  } from '../../features/aiPromptingApiSlice';

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

  const [getAiResponse, { isLoading: isGenerating }] = useGetAiResponseMutation();


  const [selectedModel, setSelectedModel] = useState<string | null>(null);
  const [systemPrompt, setSystemPrompt] = useState<string>('');
  const [promptExchanges, setPromptExchanges] = useState<PromptExchange[]>([
    { user: '', assistant: '' },
  ]);
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
      setSelectedModel(models[0].id); 
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
    const messages: Message[] = [];

    if (systemPrompt.trim()) {
      messages.push({ role: 'system', content: systemPrompt.trim() });
    }

    promptExchanges.forEach(exchange => {
      if (exchange.user.trim()) {
        messages.push({ role: 'user', content: exchange.user.trim() });
      }
      if (exchange.assistant.trim()) {
        messages.push({ role: 'assistant', content: exchange.assistant.trim() });
      }
    });

    const outputObject = {
      model: selectedModel,
      messages: messages,
    };

    try {
      const payload = await getAiResponse(outputObject).unwrap();
      // console.log(payload)
      setOutput(payload); 
    } catch (error) {
      console.error('Failed to get AI response:', error);
      setOutput('Error: Could not generate a response. Please check the console for details.');
    }
  }, [systemPrompt, promptExchanges, selectedModel, getAiResponse]);

  const clearAll = useCallback(() => {
    setSelectedModel(models && models.length > 0 ? models[0].id : null);
    setSystemPrompt('');
    setPromptExchanges([{ user: '', assistant: '' }]);
    setOutput('');
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
    promptExchanges,
    handleUserPromptChange,
    handleAssistantResponseChange,
    addPromptExchange,
    removePromptExchange,
    output,
    generateOutput,
    clearAll,
  };
};
