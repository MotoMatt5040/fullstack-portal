import React from 'react';
import Select from 'react-select';
import { useAIPromptingLogic } from './useAIPromptingLogic';
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
    originalQuestion,
    handleOriginalQuestionChange,
    isGenerating,
    output,
    generateOutput,
    clearAll,
    requestJson,
    temperature,
    handleTemperatureChange,
    questionNumber,
    handleQuestionNumberChange,
    showExchanges,
    showTestResponses,
    addPromptExchange,
    removePromptExchange,
    promptExchanges,
    handleUserPromptChange,
    handleAssistantResponseChange,
    addTestQuestion,
    removeTestQuestion,
    testQuestions,
    handleTestQuestionChange,
    testResponses,
    outputWordCount,
    testResponsesWordCounts,
  } = useAIPromptingLogic();

  const autoResizeTextarea = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    e.target.style.height = 'auto';
    e.target.style.height = `${e.target.scrollHeight}px`;
  };

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
          <label htmlFor='temperature-slider'>Temperature: {temperature}</label>
          <input
            type='range'
            id='temperature-slider'
            min='0'
            max='2'
            step='0.1'
            value={temperature}
            onChange={handleTemperatureChange}
          />
        </div>

        <div className='form-group'>
          <label htmlFor='system-prompt'>System Prompt:</label>
          <textarea
            id='system-prompt'
            className='grow-textarea'
            value={systemPrompt}
            onChange={(e) => {
              handleSystemPromptChange(e);
              autoResizeTextarea(e);
            }}
            placeholder='Enter system-level instructions for the AI...'
            rows={1}
          />
        </div>

        <div className='form-group'>
          {showExchanges && (
            <div className='ai-prompt-pairs-container'>
              <label>User/Assistant Exchanges:</label>
              {promptExchanges.map((exchange, index) => (
                <div key={index} className='input-pair-item'>
                  <div>
                    <label htmlFor={`user-prompt-${index}`}>User:</label>
                    <textarea
                      id={`user-prompt-${index}`}
                      className='grow-textarea-short'
                      value={exchange.user}
                      onChange={(e) => {
                        handleUserPromptChange(index, e);
                        autoResizeTextarea(e);
                      }}
                      placeholder='Enter user prompt content...'
                      rows={1}
                    />
                  </div>
                  <div>
                    <label htmlFor={`assistant-response-${index}`}>
                      Assistant:
                    </label>
                    <textarea
                      id={`assistant-response-${index}`}
                      className='grow-textarea-short'
                      value={exchange.assistant}
                      onChange={(e) => {
                        handleAssistantResponseChange(index, e);
                        autoResizeTextarea(e);
                      }}
                      placeholder='Enter assistant response content...'
                      rows={1}
                    />
                  </div>
                  <button
                    type='button'
                    onClick={() => removePromptExchange(index)}
                    className='action-button secondary remove-button-spacing'
                  >
                    <FaTrashAlt /> Remove Exchange
                  </button>
                </div>
              ))}
            </div>
          )}
          <button
            type='button'
            onClick={addPromptExchange}
            className='action-button primary add-button'
          >
            <FaPlus />{' '}
            {showExchanges
              ? 'Add Another Exchange'
              : 'Add User/Assistant Exchanges'}
          </button>
        </div>

        <div className='form-group'>
          <label htmlFor='question-number'>Question Number:</label>
          <input
            id='question-number'
            type='text'
            className='text-input'
            value={questionNumber}
            onChange={handleQuestionNumberChange}
            placeholder='Enter the question number (e.g., 1a, 2b)'
          />
        </div>

        <div className='form-group'>
          <label htmlFor='original-question'>Original Question:</label>
          <textarea
            id='original-question'
            className='grow-textarea'
            value={originalQuestion}
            onChange={(e) => {
              handleOriginalQuestionChange(e);
              autoResizeTextarea(e);
            }}
            placeholder='Enter the final user question here...'
            rows={1}
          />
        </div>

        <div className='form-group'>
          {showTestResponses && (
            <div className='test-responses-container'>
              <label>Test Responses:</label>
              {testQuestions.map((question, index) => (
                <div key={index} className='test-response-item'>
                  <textarea
                    className='grow-textarea-short'
                    value={question}
                    onChange={(e) => {
                      handleTestQuestionChange(index, e);
                      autoResizeTextarea(e);
                    }}
                    placeholder={`Enter Test Response #${index + 1}`}
                    rows={1}
                  />
                  {testResponses[index] && (
                    <div className='ai-prompt-output nested-output'>
                      <div className='output-header'>
                        <h2>Response:</h2>
                        <div className='word-counter'>
                          {testResponsesWordCounts[index] || 0} words
                        </div>
                      </div>
                      <div className='output-content-box'>
                        {testResponses[index]}
                      </div>
                    </div>
                  )}
                  <button
                    type='button'
                    onClick={() => removeTestQuestion(index)}
                    className='action-button secondary remove-test-response-button'
                  >
                    <FaTrashAlt /> Remove Test Response
                  </button>
                </div>
              ))}
            </div>
          )}
          <button
            type='button'
            onClick={addTestQuestion}
            className='action-button primary add-button'
          >
            <FaPlus />{' '}
            {showTestResponses
              ? 'Add Another Test Response'
              : 'Add Test Responses'}
          </button>
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
            {isGenerating ? (
              'Generating...'
            ) : (
              <>
                <FaPlay /> Generate Response
              </>
            )}
          </button>
        </div>
      </div>

      {output && (
        <div className='ai-prompt-output'>
          <div className='output-header'>
            <h2>Response:</h2>
            <div className='word-counter'>{outputWordCount} words</div>
          </div>
          <div className='output-content-box'>{output}</div>
        </div>
      )}
      {requestJson && (
        <div className='ai-prompt-output'>
          <div className='output-header'>
            <h2>Request JSON:</h2>
          </div>
          <pre className='output-content-box'>
            <code>{requestJson}</code>
          </pre>
        </div>
      )}
    </section>
  );
};

export default AIPrompting;