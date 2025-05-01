import React from 'react';
import { useNavigate } from 'react-router-dom';
import './css/MyGoBackButton.css';

interface MyGoBackButtonProps {
  to: string;
  url?: string;
}

const MyGoBackButton: React.FC<MyGoBackButtonProps> = ({ to, url }) => {
  const navigate = useNavigate();

  const handleNavigate = () => {
    console.log('Navigating to:', url || -1); // Log the URL or -1 for going back
    if (url) {
      navigate(url); // Navigate to the specified URL
    } else {
      navigate(-1); // Go back to the previous page
    }
  }
  // const handleGoBack = () => {
  //   window.history.back(); 
  // };

  return (
    <button className='go-back-button' onClick={handleNavigate}>
      <span className='go-back-text'>← Go Back{to ? ` to ${to}` : ''}</span>
    </button>
  );
};

export default MyGoBackButton;
