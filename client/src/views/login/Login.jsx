import { useRef, useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import React from 'react';
import { setCredentials } from '../../features/auth/authSlice';
import { useLoginMutation } from '../../features/auth/authApiSlice';
import { useForgotPasswordMutation } from '../../features/resetPasswordApiSlice';
import useInput from '../../hooks/useInput';
import useToggle from '../../hooks/useToggle';
// import { useState } from 'react';
import { Link } from 'react-router-dom';
import './Login.css';

const Login = () => {
  const userRef = useRef();
  const errRef = useRef();
  const [user, setUser, userAttribs] = useInput('user', '');
  const [pwd, setPwd] = useState('');
  const [errMsg, setErrMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  // const [check, toggleCheck] = useToggle('persist', false);
  const [persist, setPersist] = useState(false);

  const [login, { isLoading }] = useLoginMutation();
  const [forgotPassword, { isLoading: forgotLoading }] =
    useForgotPasswordMutation();
  const dispatch = useDispatch();

  // State for forgot password modal
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  // const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotMessage, setForgotMessage] = useState('');

  // Helper function to get cookie value
  const getCookieValue = (name) => {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
    return null;
  };

  useEffect(() => {
    userRef.current?.focus();
    
    // Check if persist cookie exists and set the checkbox accordingly
    const persistCookie = getCookieValue('persist');
    if (persistCookie === 'true') {
      setPersist(true);
    }
  }, []);

  useEffect(() => {
    setErrMsg('');
    setSuccessMsg('');
  }, [user, pwd]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const userData = await login({ user, pwd }).unwrap();
      dispatch(setCredentials({ ...userData, user }));
      // document.cookie = `persist=${check}; path=/`;
      document.cookie = `persist=${persist}; path=/`;
      setUser('');
      setPwd('');
    } catch (err) {
      if (!err?.status) {
        setErrMsg('No Server Response');
      } else if (err.status === 400) {
        setErrMsg('Missing Email or Password');
      } else if (err.status === 401) {
        setErrMsg('Unauthorized');
      } else {
        setErrMsg('Login Failed');
      }
      errRef.current?.focus();
    }
  };

  const handlePwdInput = (e) => setPwd(e.target.value);

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    if (!forgotEmail) {
      setForgotMessage('Please enter your email address');
      return;
    }

    setForgotMessage('');

    try {
      const result = await forgotPassword({ email: forgotEmail }).unwrap();

      // Handle success
      setForgotMessage('If an account with that email exists, a password reset link has been sent.');
      setSuccessMsg('If an account with that email exists, a password reset link has been sent.');
      setTimeout(() => {
        setShowForgotPassword(false);
        setForgotEmail('');
        setForgotMessage('');
      }, 3000);
    } catch (error) {
      // Handle error - RTK Query provides structured error handling
      const errorMessage = error?.data?.message || 'Failed to send reset link';
      setForgotMessage(errorMessage);
    }
  };

  const closeForgotPasswordModal = () => {
    setShowForgotPassword(false);
    setForgotEmail('');
    setForgotMessage('');
  };

  if (isLoading) {
    return (
      <section className='login'>
        <div className='loading-container'>
          <h1>Loading...</h1>
        </div>
      </section>
    );
  }

  return (
    <section className='login'>
      <form onSubmit={handleSubmit}>
        <h1>Sign In</h1>

        {errMsg && (
          <p ref={errRef} className='errmsg' aria-live='assertive'>
            {errMsg}
          </p>
        )}

        {successMsg && (
          <p className='successmsg' aria-live='polite'>
            {successMsg}
          </p>
        )}

        <label htmlFor='username'>Email:</label>
        <input
          type='text'
          id='username'
          ref={userRef}
          {...userAttribs}
          required
        />

        <label htmlFor='password'>Password:</label>
        <input
          type='password'
          id='password'
          onChange={handlePwdInput}
          value={pwd}
          required
        />

        <button type='submit'>Sign In</button>

        <div className='persistCheck'>
          <input
            type='checkbox'
            id='persist'
            // onChange={toggleCheck}
            onChange={(e) => setPersist(e.target.checked)}
            // checked={check}
            checked={persist}
          />
          <label htmlFor='persist'>Keep me logged in</label>
        </div>

        <div className='forgot-password-link'>
          <button
            type='button'
            onClick={() => setShowForgotPassword(true)}
            className='forgot-password-btn'
          >
            Forgot Password?
          </button>
        </div>
      </form>

      {/* Forgot Password Modal */}
      {showForgotPassword && (
        <>
          <div
            className='modal-overlay'
            onClick={closeForgotPasswordModal}
          ></div>
          <div className='modal-content'>
            <div className='modal-header'>
              <h3>Reset Password</h3>
              <button
                type='button'
                className='modal-close'
                onClick={closeForgotPasswordModal}
              >
                ×
              </button>
            </div>

            <form className='forgot-password-form' onSubmit={handleForgotPassword}>
              <label htmlFor='forgot-email'>Email Address:</label>
              <input
                type='email'
                id='forgot-email'
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                required
                placeholder='Enter your email address'
                autoFocus
              />

              {forgotMessage && (
                <p
                  className={
                    forgotMessage.includes('sent') ? 'successmsg' : 'errmsg'
                  }
                >
                  {forgotMessage}
                </p>
              )}

              <div className='modal-buttons'>
                <button
                  type='submit'
                  disabled={forgotLoading}
                  className='btn-primary'
                >
                  {forgotLoading ? 'Sending...' : 'Send Reset Link'}
                </button>
                <button
                  type='button'
                  onClick={closeForgotPasswordModal}
                  disabled={forgotLoading}
                  className='btn-secondary'
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </>
      )}
    </section>
  );
};

export default Login;