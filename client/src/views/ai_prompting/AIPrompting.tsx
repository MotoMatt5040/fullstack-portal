import React, { useMemo, useCallback } from 'react';
import Select from 'react-select';
import { useAIPromptingLogic } from './useAIPromptingLogic';
import { FaPlus, FaTrashAlt, FaRedo, FaPlay, FaSave } from 'react-icons/fa';
import './AIPrompting.css';

const AIPrompting = () => {
  const {
    modelsLoading,
    modelsError,
    modelOptions,
    toneOptions,
    selectedModel,
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
    finalSystemInstruction,
    handleFinalSystemInstructionChange,
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
    addPromptExchange,
    removePromptExchange,
    promptExchanges,
    handleUserPromptChange,
    handleAssistantResponseChange,
    showTestResponses,
    addTestQuestion,
    removeTestQuestion,
    testQuestions,
    handleTestQuestionChange,
    testResponses,
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
  } = useAIPromptingLogic();

  const autoResizeTextarea = useCallback((e) => {
    e.target.style.height = 'auto';
    e.target.style.height = `${e.target.scrollHeight}px`;
  }, []);

  // Memoize prompt options to avoid recreation on every render
  const promptOptions = useMemo(() =>
    prompts?.map((p) => ({
      value: p.prompt,
      label:
        p.prompt.length > 60 ? `${p.prompt.substring(0, 60)}...` : p.prompt,
    })) || [],
    [prompts]
  );

  const handlePromptSelectChange = useCallback((selectedOption) => {
    if (selectedOption) {
      handleSelectPrompt(selectedOption.value);
    }
  }, [handleSelectPrompt]);

  const handleSystemPromptEdit = useCallback((e) => {
    const newValue = e.target.value;
    let originalValue = newValue;

    if (tone && tone.trim()) {
      const tonePattern = `[tone: ${tone}]`;
      originalValue = originalValue.replaceAll(tonePattern, '[tone:]');
    }

    if (questionSummary && questionSummary.trim()) {
      const summaryPattern = `[summary: ${questionSummary}]`;
      originalValue = originalValue.replaceAll(summaryPattern, '[summary:]');
    }

    handleSystemPromptChange({ target: { value: originalValue } });
  }, [tone, questionSummary, handleSystemPromptChange]);

  if (modelsLoading) {
    return (
      <section className='ai-prompting-container'>
        <div className='ai-prompting-header'>
          <h1>AI Prompt Engineering Tool</h1>
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
          <h1>AI Prompt Engineering Tool</h1>
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
        <h1>AI Prompt Engineering Tool</h1>
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
            className='temperature-slider'
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
          <label htmlFor='tone-select'>Tone:</label>
          <Select
            classNamePrefix='my-select'
            inputId='tone-select'
            options={toneOptions}
            value={toneOptions.find((option) => option.value === tone)}
            onChange={handleToneChange}
            placeholder='Select a tone...'
            isClearable={false}
          />
        </div>

        <div className='form-group'>
          <label htmlFor='project-id'>Project ID:</label>
          <input
            id='project-id'
            type='text'
            className='text-input'
            value={projectId}
            onChange={handleProjectIdChange}
            placeholder='Enter the project ID'
          />
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
          <label htmlFor='recent-prompts-select'>Recent Prompts:</label>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end' }}>
            <div style={{ flex: 1 }}>
              <Select
                classNamePrefix='my-select'
                inputId='recent-prompts-select'
                options={promptOptions}
                value={null}
                onChange={handlePromptSelectChange}
                placeholder={
                  !projectId || !questionNumber
                    ? 'Enter Project ID and Question Number first...'
                    : promptsLoading
                    ? 'Loading recent prompts...'
                    : 'Select a recent prompt...'
                }
                isClearable={true}
                isDisabled={!projectId || !questionNumber || promptsLoading}
                isSearchable={true}
                noOptionsMessage={() => 'No recent prompts found'}
              />
            </div>
          </div>
        </div>

        <div className='form-group'>
          <label htmlFor='question-summary'>Question Summary:</label>
          <textarea
            id='question-summary'
            className='grow-textarea-short'
            value={questionSummary}
            onChange={(e) => {
              handleQuestionSummaryChange(e);
              autoResizeTextarea(e);
            }}
            placeholder='Enter the question summary that will replace [summary:] in the system prompt...'
            rows={1}
          />
        </div>

        <div className='form-group'>
          <div
            className='system-prompt-header'
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <label htmlFor='system-prompt'>System Prompt:</label>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button
                type='button'
                onClick={handleUpdateDefaultPrompt}
                className='action-button secondary'
                disabled={isUpdatingDefaultPrompt || !systemPrompt.trim()}
              >
                <FaSave />{' '}
                {isUpdatingDefaultPrompt
                  ? 'Updating...'
                  : 'Update Default Prompt'}
              </button>
              <button
                type='button'
                onClick={handleUpdatePrompt}
                className='action-button primary'
                disabled={
                  isAddingPrompt ||
                  !projectId ||
                  !questionNumber ||
                  !systemPrompt.trim()
                }
              >
                <FaSave /> {isAddingPrompt ? 'Updating...' : 'Update Prompt'}
              </button>
            </div>
          </div>
          <textarea
            id='system-prompt'
            className='grow-textarea'
            value={getProcessedSystemPrompt()}
            onChange={(e) => {
              handleSystemPromptEdit(e);
              autoResizeTextarea(e);
            }}
            placeholder='Enter system-level instructions for the AI... Use [tone:] and [summary:] where you want the tone and question summary to appear.'
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
          <label htmlFor='final-system-instruction'>
            Final System Instruction:
          </label>
          <textarea
            id='final-system-instruction'
            className='grow-textarea-short'
            value={finalSystemInstruction}
            onChange={(e) => {
              handleFinalSystemInstructionChange(e);
              autoResizeTextarea(e);
            }}
            placeholder='Enter the final system instruction here...'
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
