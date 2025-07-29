// client/src/views/support/ContactSupport.tsx
import React from 'react';
import { Link } from 'react-router-dom';
import { useContactSupportLogic } from './useContactSupportLogic';
import './ContactSupport.css';

const ContactSupport: React.FC = () => {
  const {
    formData,
    errMsg,
    successMsg,
    isLoading,
    textAreaRef,
    handleChange,
    handleTextAreaInput,
    handleSubmit
  } = useContactSupportLogic();

  return (
    <section className="contact-support">
      <div className="support-container">
        <div className="support-header">
          <h1>Contact Support</h1>
          <p>
            Need help? Send us a message and our support team will get back to you as soon as possible.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="support-form">
          {errMsg && (
            <div className="error-message" role="alert">
              {errMsg}
            </div>
          )}

          {successMsg && (
            <div className="success-message" role="alert">
              {successMsg}
            </div>
          )}

          <div className="form-group">
            <label htmlFor="priority">Priority Level *</label>
            <select
              id="priority"
              name="priority"
              value={formData.priority}
              onChange={handleChange}
              required
            >
              <option value="low">Low - General questions</option>
              <option value="normal">Normal - Standard support</option>
              <option value="high">High - Urgent issue</option>
              <option value="critical">Critical - System down</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="subject">Subject *</label>
            <input
              type="text"
              id="subject"
              name="subject"
              value={formData.subject}
              onChange={handleChange}
              placeholder="Brief description of your issue"
              required
              maxLength={150}
            />
            <small className="char-count">
              {formData.subject.length}/150 characters
            </small>
          </div>

          <div className="form-group">
            <label htmlFor="message">Message *</label>
            <textarea
              id="message"
              name="message"
              ref={textAreaRef}
              value={formData.message}
              onChange={handleChange}
              onInput={handleTextAreaInput}
              placeholder="Please provide details about your issue, including any error messages, steps you've taken, and what you were trying to accomplish..."
              required
              rows={6}
              maxLength={2000}
            />
            <small className="char-count">
              {formData.message.length}/2000 characters
            </small>
          </div>

          <div className="form-actions">
            <button 
              type="submit" 
              disabled={isLoading || !formData.subject.trim() || !formData.message.trim()}
              className="submit-btn"
            >
              {isLoading ? 'Sending...' : 'Send Support Request'}
            </button>
            
            <Link to="/welcome" className="back-link">
              ← Back to Welcome
            </Link>
          </div>
        </form>

        <div className="support-info">
          <h3>Other Ways to Get Help</h3>
          <ul>
            <li>📧 Email us directly at: <strong>support@promarkresearch.com</strong></li>
            <li>⚡ For urgent issues, please mark your request as "Critical"</li>
            <li>📋 Include as much detail as possible for faster resolution</li>
          </ul>
        </div>
      </div>
    </section>
  );
};

export default ContactSupport;