import React from 'react';
import './css/MyToggle.css';

type MyToggleProps = {
  active: boolean;
  onClick: () => void;
  label: string;
};

const MyToggle: React.FC<MyToggleProps> = ({ active, onClick, label }) => {
  return (
    <button
      className={`toggle-button ${active ? 'active' : ''}`}
      onClick={onClick}
    >
      {label}
    </button>
  );
};

export default MyToggle;
