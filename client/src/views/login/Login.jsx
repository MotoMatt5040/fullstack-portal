import { useRef, useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { useLocation, useNavigate } from 'react-router-dom';
import React from 'react';
import { setCredentials } from '../../features/auth/authSlice';
import { useLoginMutation } from '../../features/auth/authApiSlice';
import { useForgotPasswordMutation } from '../../features/resetPasswordApiSlice';
import useInput from '../../hooks/useInput';
import Icon from '@mdi/react';
import {
  mdiEmailOutline,
  mdiLockOutline,
  mdiEyeOutline,
  mdiEyeOffOutline,
  mdiLoading,
  mdiClose,
  mdiAlertCircleOutline,
  mdiCheckCircleOutline,
} from '@mdi/js';
import './Login.css';

const Login = () => {
  const userRef = useRef();
  const errRef = useRef();
  const [user, setUser, userAttribs] = useInput('user', '');
  const [pwd, setPwd] = useState('');
  const [errMsg, setErrMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [persist, setPersist] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [login, { isLoading }] = useLoginMutation();
  const [forgotPassword, { isLoading: forgotLoading }] =
    useForgotPasswordMutation();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  // Get the full URL (pathname + search params) they were trying to access before being redirected to login
  const fromLocation = location.state?.from;
  const from = fromLocation
    ? `${fromLocation.pathname}${fromLocation.search || ''}${fromLocation.hash || ''}`
    : '/welcome';

  // State for forgot password modal
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
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
      document.cookie = `persist=${persist}; path=/`;
      setUser('');
      setPwd('');
      // Navigate to the page they were trying to access, or /welcome as default
      navigate(from, { replace: true });
    } catch (err) {
      if (!err?.status) {
        setErrMsg('No Server Response');
      } else if (err.status === 400) {
        setErrMsg('Missing Email or Password');
      } else if (err.status === 401) {
        setErrMsg('Invalid email or password');
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
      await forgotPassword({ email: forgotEmail }).unwrap();
      setForgotMessage(
        'If an account with that email exists, a password reset link has been sent.'
      );
      setSuccessMsg(
        'If an account with that email exists, a password reset link has been sent.'
      );
      setTimeout(() => {
        setShowForgotPassword(false);
        setForgotEmail('');
        setForgotMessage('');
      }, 3000);
    } catch (error) {
      const errorMessage = error?.data?.message || 'Failed to send reset link';
      setForgotMessage(errorMessage);
    }
  };

  const closeForgotPasswordModal = () => {
    setShowForgotPassword(false);
    setForgotEmail('');
    setForgotMessage('');
  };

  return (
    <div className='login-page'>
      <div className='login-container'>
        {/* Left side - Branding */}
        <div className='login-branding'>
          <div className='branding-content'>
            <h1 className='brand-title'>Portal</h1>
            <p className='brand-subtitle'>Streamlined project management</p>
          </div>
          <div className='branding-decoration'>
            <div className='decoration-circle decoration-circle-1'></div>
            <div className='decoration-circle decoration-circle-2'></div>
            <div className='decoration-circle decoration-circle-3'></div>
          </div>
        </div>

        {/* Right side - Login Form */}
        <div className='login-form-container'>
          <div className='login-form-wrapper'>
            <div className='login-header'>
              <h2>Welcome back</h2>
              <p>Sign in to your account to continue</p>
            </div>

            {errMsg && (
              <div ref={errRef} className='message message-error' aria-live='assertive'>
                <Icon path={mdiAlertCircleOutline} size={0.8} />
                <span>{errMsg}</span>
              </div>
            )}

            {successMsg && (
              <div className='message message-success' aria-live='polite'>
                <Icon path={mdiCheckCircleOutline} size={0.8} />
                <span>{successMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className='login-form'>
              <div className='form-group'>
                <label htmlFor='username'>Email</label>
                <div className='input-wrapper'>
                  <Icon path={mdiEmailOutline} size={0.9} className='input-icon' />
                  <input
                    type='email'
                    id='username'
                    ref={userRef}
                    {...userAttribs}
                    placeholder='Enter your email'
                    required
                    autoComplete='email'
                  />
                </div>
              </div>

              <div className='form-group'>
                <label htmlFor='password'>Password</label>
                <div className='input-wrapper'>
                  <Icon path={mdiLockOutline} size={0.9} className='input-icon' />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id='password'
                    onChange={handlePwdInput}
                    value={pwd}
                    placeholder='Enter your password'
                    required
                    autoComplete='current-password'
                    className='has-toggle'
                  />
                  <button
                    type='button'
                    className='password-toggle'
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                  >
                    <Icon
                      path={showPassword ? mdiEyeOffOutline : mdiEyeOutline}
                      size={0.9}
                    />
                  </button>
                </div>
              </div>

              <div className='form-options'>
                <label className='checkbox-wrapper'>
                  <input
                    type='checkbox'
                    id='persist'
                    onChange={(e) => {
                      setPersist(e.target.checked);
                      document.cookie = `persist=${e.target.checked}; path=/`;
                    }}
                    checked={persist}
                  />
                  <span className='checkmark'></span>
                  <span className='checkbox-label'>Keep me signed in</span>
                </label>

                <button
                  type='button'
                  onClick={() => setShowForgotPassword(true)}
                  className='forgot-link'
                >
                  Forgot password?
                </button>
              </div>

              <button type='submit' className='submit-btn' disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Icon path={mdiLoading} size={0.9} className='spinning' />
                    <span>Signing in...</span>
                  </>
                ) : (
                  <span>Sign In</span>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {showForgotPassword && (
        <div className='modal-overlay' onClick={closeForgotPasswordModal}>
          <div className='modal' onClick={(e) => e.stopPropagation()}>
            <div className='modal-header'>
              <h3>Reset Password</h3>
              <button
                type='button'
                className='modal-close-btn'
                onClick={closeForgotPasswordModal}
              >
                <Icon path={mdiClose} size={1} />
              </button>
            </div>

            <form className='modal-form' onSubmit={handleForgotPassword}>
              <p className='modal-description'>
                Enter your email address and we'll send you a link to reset your
                password.
              </p>

              <div className='form-group'>
                <label htmlFor='forgot-email'>Email</label>
                <div className='input-wrapper'>
                  <Icon path={mdiEmailOutline} size={0.9} className='input-icon' />
                  <input
                    type='email'
                    id='forgot-email'
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    required
                    placeholder='Enter your email'
                    autoFocus
                  />
                </div>
              </div>

              {forgotMessage && (
                <div
                  className={`message ${
                    forgotMessage.includes('sent')
                      ? 'message-success'
                      : 'message-error'
                  }`}
                >
                  <Icon
                    path={
                      forgotMessage.includes('sent')
                        ? mdiCheckCircleOutline
                        : mdiAlertCircleOutline
                    }
                    size={0.8}
                  />
                  <span>{forgotMessage}</span>
                </div>
              )}

              <div className='modal-actions'>
                <button
                  type='button'
                  onClick={closeForgotPasswordModal}
                  disabled={forgotLoading}
                  className='btn-secondary'
                >
                  Cancel
                </button>
                <button
                  type='submit'
                  disabled={forgotLoading}
                  className='btn-primary'
                >
                  {forgotLoading ? (
                    <>
                      <Icon path={mdiLoading} size={0.8} className='spinning' />
                      <span>Sending...</span>
                    </>
                  ) : (
                    <span>Send Reset Link</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Login;
