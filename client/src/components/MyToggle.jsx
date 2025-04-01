import React from 'react';
import './css/MyToggle.css';

const MyToggle = ({ active, onClick, label }) => {
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
