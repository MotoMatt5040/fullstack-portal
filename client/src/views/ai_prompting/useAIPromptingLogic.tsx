import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useGetChatModelsQuery } from '../../features/aiPromptingApiSlice';

interface PromptExchange {
  user: string;
  assistant: string;
}

// Define an interface for the model data structure based on your sample
interface ChatModel {
  id: string;
  object: string;
  created: number;
  owned_by: string;
}

export const useAIPromptingLogic = () => {
  // Update the query type to expect an array of ChatModel objects
  const { data: models, isLoading: modelsLoading, error: modelsError } = useGetChatModelsQuery();

  const [selectedModel, setSelectedModel] = useState<string | null>(null);
  const [systemPrompt, setSystemPrompt] = useState<string>('');
  const [promptExchanges, setPromptExchanges] = useState<PromptExchange[]>([{ user: '', assistant: '' }]);
  const [output, setOutput] = useState<string>('');
  const systemPromptRef = useRef<HTMLTextAreaElement>(null);

  // Memoized model options for the dropdown
  const modelOptions = useMemo(() => {
    if (!models) return [];
    // Map each model object to an option with 'id' as both value and label
    return models.map((model: ChatModel) => ({
      value: model.id,
      label: model.id,
    }));
  }, [models]);

  // Set initial selected model once models are loaded
  useEffect(() => {
    if (models && models.length > 0 && !selectedModel) {
      setSelectedModel(models[0].id); // Set the ID of the first model
    }
  }, [models, selectedModel]);

  // Auto-resize system prompt textarea
  useEffect(() => {
    if (systemPromptRef.current) {
      systemPromptRef.current.style.height = 'auto';
      systemPromptRef.current.style.height = `${systemPromptRef.current.scrollHeight}px`;
    }
  }, [systemPrompt]);

  const handleModelChange = useCallback((option: { value: string; label: string } | null) => {
    setSelectedModel(option ? option.value : null);
  }, []);

  const handleSystemPromptChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setSystemPrompt(e.target.value);
  }, []);

  const handleUserPromptChange = useCallback((index: number, e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setPromptExchanges(prev => {
      const newExchanges = [...prev];
      newExchanges[index] = { ...newExchanges[index], user: e.target.value };
      return newExchanges;
    });
  }, []);

  const handleAssistantResponseChange = useCallback((index: number, e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setPromptExchanges(prev => {
      const newExchanges = [...prev];
      newExchanges[index] = { ...newExchanges[index], assistant: e.target.value };
      return newExchanges;
    });
  }, []);

  const addPromptExchange = useCallback(() => {
    setPromptExchanges(prev => [...prev, { user: '', assistant: '' }]);
  }, []);

  const removePromptExchange = useCallback((index: number) => {
    setPromptExchanges(prev => prev.filter((_, i) => i !== index));
  }, []);

  const generateOutput = useCallback(() => {
    let generatedOutput = '';

    if (systemPrompt.trim()) {
      generatedOutput += `SYSTEM: ${systemPrompt.trim()}\n\n`;
    }

    promptExchanges.forEach((exchange, index) => {
      if (exchange.user.trim()) {
        generatedOutput += `USER: ${exchange.user.trim()}\n`;
      }
      if (exchange.assistant.trim()) {
        generatedOutput += `ASSISTANT: ${exchange.assistant.trim()}\n`;
      }
      if (exchange.user.trim() || exchange.assistant.trim()) {
        generatedOutput += '\n'; // Add a newline after each exchange if it contains content
      }
    });

    setOutput(generatedOutput.trim());
  }, [systemPrompt, promptExchanges]);

  const clearAll = useCallback(() => {
    setSelectedModel(models && models.length > 0 ? models[0].id : null); // Clear to the first model's ID
    setSystemPrompt('');
    setPromptExchanges([{ user: '', assistant: '' }]);
    setOutput('');
  }, [models]);

  return {
    modelsLoading,
    modelsError,
    modelOptions,
    selectedModel,
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