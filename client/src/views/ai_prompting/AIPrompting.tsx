import React from 'react';
import Select from 'react-select';
import { useAIPromptingLogic } from './useAIPromptingLogic';
import PromptInputPair from '../../components/PromptInputPair';
import { FaPlus, FaTrashAlt, FaRedo, FaPlay } from 'react-icons/fa';
import './AIPrompting.css';

const AIPrompting: React.FC = () => {
  const {
    modelsLoading,
    modelsError,
    modelOptions,
    selectedModel,
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
    isGenerating,
    output,
    generateOutput,
    clearAll,
  } = useAIPromptingLogic();

  if (modelsLoading) {
    return (
      <section className='ai-prompting-container'>
        <div className='ai-prompting-header'>
          <h1>AI Prompting Tool</h1>
          <p>Craft and test AI prompts with ease.</p>
        </div>
        <div className='loading-indicator'>Loading models...</div>
      </section>
    );
  }

  if (modelsError) {
    return (
      <section className='ai-prompting-container'>
        <div className='ai-prompting-header'>
          <h1>AI Prompting Tool</h1>
          <p>Craft and test AI prompts with ease.</p>
        </div>
        <div className='error-indicator'>
          Error loading models. Please try again later.
        </div>
      </section>
    );
  }

  return (
    <section className='ai-prompting-container'>
      <div className='ai-prompting-header'>
        <h1>AI Prompting Tool</h1>
        <p>
          Select an AI model, define a system prompt, and add user/assistant
          exchanges to craft and test your prompts.
        </p>
      </div>

      <div className='ai-controls'>
        <div className='form-group'>
          <label htmlFor='model-select'>Select Model:</label>
          <Select
            classNamePrefix='my-select'
            inputId='model-select'
            options={modelOptions}
            value={modelOptions.find(
              (option) => option.value === selectedModel
            )}
            onChange={handleModelChange}
            placeholder='Select an AI model...'
            isClearable={false}
            isDisabled={modelsLoading}
          />
        </div>

        <div className='form-group'>
          <label htmlFor='system-prompt'>System Prompt:</label>
          <textarea
            id='system-prompt'
            ref={systemPromptRef}
            className='grow-textarea'
            value={systemPrompt}
            onChange={handleSystemPromptChange}
            placeholder='Enter system-level instructions for the AI (e.g., "You are a helpful assistant."). This sets the context for the conversation.'
            rows={3}
          />
        </div>

        <div className='ai-prompt-pairs-container'>
          {promptExchanges.map((exchange, index) => (
            <div key={index}>
              <PromptInputPair
                index={index}
                userContent={exchange.user}
                assistantContent={exchange.assistant}
                onUserChange={(e) => handleUserPromptChange(index, e)}
                onAssistantChange={(e) =>
                  handleAssistantResponseChange(index, e)
                }
              />
              {promptExchanges.length > 1 && (
                <button
                  type='button'
                  onClick={() => removePromptExchange(index)}
                  className='action-button secondary'
                  style={{ marginBottom: '1rem' }}
                >
                  <FaTrashAlt /> Remove Exchange
                </button>
              )}
            </div>
          ))}
          <button
            type='button'
            onClick={addPromptExchange}
            className='action-button primary'
          >
            <FaPlus /> Add Exchange
          </button>
        </div>

        <div className='form-group'>
            <label htmlFor='original-question'>Original Question:</label>
            <textarea
                id='original-question'
                className='grow-textarea'
                value={originalQuestion}
                onChange={handleOriginalQuestionChange}
                placeholder='Enter the final user question here. This will be appended as the last message in the request.'
                rows={3}
            />
        </div>

        <div className='action-buttons'>
          <button
            type='button'
            onClick={clearAll}
            className='action-button secondary'
          >
            <FaRedo /> Clear All
          </button>
          <button
            type='button'
            onClick={generateOutput}
            className='action-button primary'
            disabled={isGenerating}
          >
            {isGenerating ? 'Generating...' : <><FaPlay /> Generate Response</>}
          </button>
        </div>
      </div>

      {output && (
        <div className='ai-prompt-output'>
          <h2>Response:</h2>
          <div
            style={{
              whiteSpace: 'pre-wrap',
              background: '#f5f5f5',
              padding: '10px',
              borderRadius: '5px',
            }}
          >
            {output}
          </div>
        </div>
      )}
    </section>
  );
};

export default AIPrompting;