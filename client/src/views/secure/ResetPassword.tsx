import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  useVerifyResetTokenQuery,
  useResetPasswordMutation,
} from '../../features/resetPasswordApiSlice';
import './ResetPassword.css';

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const token = searchParams.get('token');
  const emailParam = searchParams.get('email');

  const {
    data: verifyData,
    isLoading: isVerifying,
    error: verifyError,
  } = useVerifyResetTokenQuery(
    { token, email: emailParam },
    { skip: !token || !emailParam }
  );

  const [resetPassword, { isLoading: isResetting }] = useResetPasswordMutation();

  const [state, setState] = useState({
    isLoading: true,
    isValidToken: false,
    error: null,
    success: null,
    email: emailParam || '',
  });

  const [passwordForm, setPasswordForm] = useState({
    newPassword: '',
    confirmPassword: '',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Check token validity on component mount
  useEffect(() => {
    if (!token || !emailParam) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: 'Invalid reset link. Token or email is missing.',
      }));
      return;
    }

    // Wait for the query result
    if (!isVerifying && verifyData) {
      if (verifyData.valid) {
        setState((prev) => ({
          ...prev,
          isLoading: false,
          isValidToken: true,
          email: verifyData.email || emailParam,
        }));
      } else {
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: verifyData.message || 'Invalid or expired reset token',
        }));
      }
    } else if (!isVerifying && verifyError) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: verifyError?.data?.message || 'Failed to verify reset token',
      }));
    }
  }, [token, emailParam, isVerifying, verifyData, verifyError]);

  const validatePassword = (password) => {
    const errors = [];

    if (password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }
    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }
    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }
    if (!/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    }
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }

    return errors;
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordForm((prev) => ({
      ...prev,
      [name]: value,
    }));

    if (state.error && (name === 'newPassword' || name === 'confirmPassword')) {
      setState((prev) => ({ ...prev, error: null }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!token || !emailParam) {
      setState((prev) => ({ ...prev, error: 'Invalid reset token' }));
      return;
    }

    const passwordErrors = validatePassword(passwordForm.newPassword);
    if (passwordErrors.length > 0) {
      setState((prev) => ({
        ...prev,
        error: passwordErrors.join('. '),
      }));
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setState((prev) => ({
        ...prev,
        error: 'Passwords do not match',
      }));
      return;
    }

    setIsSubmitting(true);
    setState((prev) => ({ ...prev, error: null }));

    try {
  console.log('🔍 Frontend: About to call resetPassword...');
  const response = await resetPassword({
    token,
    email: emailParam,
    newPassword: passwordForm.newPassword,
  }).unwrap();
  
  setState((prev) => ({
    ...prev,
    success: response.success || 'Password reset successfully!',
  }));
} catch (error) {
  console.error('❌ Frontend: Error caught:', error);
  console.error('❌ Frontend: Error data:', error?.data);
  console.error('❌ Frontend: Error message:', error?.data?.message);
  setState((prev) => ({
    ...prev,
    error: error?.data?.message || 'Network error. Please try again.',
  }));
}

    // try {
    //   const response = await resetPassword({
    //     token,
    //     email: emailParam,
    //     newPassword: passwordForm.newPassword,
    //   }).unwrap();

    //   setState((prev) => ({
    //     ...prev,
    //     success: response.success || 'Password reset successfully!',
    //   }));

    //   setTimeout(() => {
    //     navigate('/login');
    //   }, 3000);
    // } catch (error) {
    //   console.error('Error resetting password:', error);
    //   setState((prev) => ({
    //     ...prev,
    //     error: error?.data?.message || 'Network error. Please try again.',
    //   }));
    // } finally {
    //   setIsSubmitting(false);
    // }
  };

  // Loading state
  if (state.isLoading || isVerifying) {
    return (
      <div className="reset-password-container">
        <div className="reset-password-form">
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>Verifying reset token...</p>
          </div>
        </div>
      </div>
    );
  }

  // Success state
  if (state.success) {
    return (
      <div className="reset-password-container">
        <div className="reset-password-form">
          <div className="success-container">
            <div className="success-icon">✓</div>
            <h2>Password Reset Successful!</h2>
            <p>{state.success}</p>
            <p className="redirect-text">Redirecting to login page in 3 seconds...</p>
            <button
              onClick={() => navigate('/login')}
              className="add-user-submit"
            >
              Go to Login Now
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Error state or invalid token
  if (!state.isValidToken || (state.error && !state.isValidToken)) {
    return (
      <div className="reset-password-container">
        <div className="reset-password-form">
          <div className="error-container">
            <div className="error-icon">⚠</div>
            <h2>Reset Link Invalid</h2>
            <p className="error-message">{state.error}</p>
            <button
              onClick={() => navigate('/login')}
              className="add-user-submit"
            >
              Back to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Password reset form
  return (
    <div className="reset-password-container">
      <div className="reset-password-form">
        <h2>Set Your New Password</h2>
        <p className="email-display">
          for <span className="email-highlight">{state.email}</span>
        </p>

        <form onSubmit={handleSubmit}>
          <label className="add-user-label" htmlFor="newPassword">
            New Password
          </label>
          <div className="password-input-container">
            <input
              id="newPassword"
              name="newPassword"
              type={showPassword ? 'text' : 'password'}
              required
              value={passwordForm.newPassword}
              onChange={handlePasswordChange}
              className="add-user-input"
              placeholder="Enter your new password"
            />
            <button
              type="button"
              className="password-toggle"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? '👁️' : '👁️‍🗨️'}
            </button>
          </div>

          <label className="add-user-label" htmlFor="confirmPassword">
            Confirm New Password
          </label>
          <input
            id="confirmPassword"
            name="confirmPassword"
            type={showPassword ? 'text' : 'password'}
            required
            value={passwordForm.confirmPassword}
            onChange={handlePasswordChange}
            className="add-user-input"
            placeholder="Confirm your new password"
          />

          <div className="password-requirements">
            <p className="requirements-title">Password requirements:</p>
            <ul className="requirements-list">
              <li>At least 8 characters long</li>
              <li>Contains uppercase and lowercase letters</li>
              <li>Contains at least one number</li>
              <li>Contains at least one special character</li>
            </ul>
          </div>

          {state.error && (
            <div className="error-display">
              {state.error}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="add-user-submit"
          >
            {isSubmitting ? 'Updating Password...' : 'Update Password'}
          </button>
        </form>

        <div className="back-to-login">
          <button
            onClick={() => navigate('/login')}
            className="back-link"
          >
            Back to Login
          </button>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;