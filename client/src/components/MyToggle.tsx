import React from 'react';
import './css/MyToggle.css';

type MyToggleProps = {
  active: boolean;
  onClick: () => void;
  label: string;
  blink?: boolean;
};

const MyToggle: React.FC<MyToggleProps> = ({ active, onClick, label, blink = false }) => {
  return (
    <button
      type='button'
      className={`toggle-button ${active ? 'active' : ''} ${blink ? 'blink' : ''}`}
      onClick={onClick}
    >
      {label}
    </button>
  );
};

export default MyToggle;
