import React, { useRef, useEffect } from 'react';
import './css/PromptInputPair.css';

interface PromptInputPairProps {
  userContent: string;
  assistantContent: string;
  onUserChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onAssistantChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  index: number;
}

const PromptInputPair: React.FC<PromptInputPairProps> = ({
  userContent,
  assistantContent,
  onUserChange,
  onAssistantChange,
  index,
}) => {
  const userTextAreaRef = useRef<HTMLTextAreaElement>(null);
  const assistantTextAreaRef = useRef<HTMLTextAreaElement>(null);

  const adjustHeight = (ref: React.RefObject<HTMLTextAreaElement>) => {
    if (ref.current) {
      ref.current.style.height = 'auto';
      ref.current.style.height = `${ref.current.scrollHeight}px`;
    }
  };

  useEffect(() => {
    adjustHeight(userTextAreaRef);
  }, [userContent]);

  useEffect(() => {
    adjustHeight(assistantTextAreaRef);
  }, [assistantContent]);

  return (
    <div className='prompt-input-pair'>
      <div>
        <label htmlFor={`user-input-${index}`}>User:</label>
        <textarea
          id={`user-input-${index}`}
          ref={userTextAreaRef}
          value={userContent}
          onChange={onUserChange}
          onInput={() => adjustHeight(userTextAreaRef)}
          placeholder='Enter user prompt content...'
        />
      </div>
      <div>
        <label htmlFor={`assistant-input-${index}`}>Assistant:</label>
        <textarea
          id={`assistant-input-${index}`}
          ref={assistantTextAreaRef}
          value={assistantContent}
          onChange={onAssistantChange}
          onInput={() => adjustHeight(assistantTextAreaRef)}
          placeholder='Enter assistant response content...'
        />
      </div>
    </div>
  );
};

export default PromptInputPair;