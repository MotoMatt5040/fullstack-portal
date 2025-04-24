import React from 'react';
import './css/MyGoBackButton.css';

interface MyGoBackButtonProps {
  to: string;
}

const MyGoBackButton: React.FC<MyGoBackButtonProps> = ({ to }) => {
  const handleGoBack = () => {
    window.history.back(); 
  };

  return (
    <button className='go-back-button' onClick={handleGoBack}>
      <span className='go-back-text'>← Go Back{to ? ` to ${to}` : ''}</span>
    </button>
  );
};

export default MyGoBackButton;
