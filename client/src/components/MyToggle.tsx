import React from 'react';
import './css/MyToggle.css';

type MyToggleProps = {
  active: boolean;
  onClick: () => void;
  label: string;
  blink?: boolean;
  forceFocus?: boolean;
};

const MyToggle: React.FC<MyToggleProps> = ({
  active,
  onClick,
  label,
  blink = false,
  forceFocus = false,
}) => {
  return (
    <button
      type='button'
      className={`toggle-button ${active ? 'active' : ''} ${
        blink ? 'blink' : ''
      }`}
      onClick={(e) => {
        onClick();
        // This 'if' statement is the corrected code
        if (!forceFocus) {
          e.currentTarget.blur();
        } 
      }}
    >
      {label}
    </button>
  );
};

export default MyToggle;