import React, { useState, useRef, useEffect } from "react";
import { useCreateIssueMutation } from "./githubSlice";
import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import { selectCurrentToken } from "../../features/auth/authSlice";
import { jwtDecode } from "jwt-decode";
import "./github.css"; 

const labelOptions = [
  { value: "bug", label: "🐛 Bug Report", description: "Something isn't working as expected" },
  { value: "enhancement", label: "✨ Feature Request", description: "I'd like to request a new feature" },
  { value: "question", label: "❓ Help & Support", description: "I need help or have a question" },
  { value: "documentation", label: "📚 Documentation", description: "Request for better documentation or guides" }
];

const IssueForm = () => {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [selectedLabels, setSelectedLabels] = useState([]);
  const [successMessage, setSuccessMessage] = useState("");
  const [userInfo, setUserInfo] = useState({ username: "", formattedEmail: "" });
  const [createIssue, { isLoading, error }] = useCreateIssueMutation();
  const token = useSelector(selectCurrentToken);
  const textAreaRef = useRef(null);

  // Extract user info from JWT token
  useEffect(() => {
    if (token) {
      try {
        const decoded = jwtDecode(token);
        const email = decoded?.UserInfo?.username || "";
        
        if (email) {
          // Format email: matt.w@promarkresearch.com -> "matt.w with promarkresearch"
          const [localPart, domain] = email.split('@');
          const domainWithoutExtension = domain ? domain.split('.')[0] : '';
          const formattedEmail = domainWithoutExtension ? `${localPart} with ${domainWithoutExtension}` : localPart;
          
          setUserInfo({
            username: localPart,
            formattedEmail: formattedEmail
          });
        }
      } catch (error) {
        console.error('Error decoding token:', error);
      }
    }
  }, [token]); 

  const handleLabelChange = (label) => {
    const updatedLabels = selectedLabels.includes(label)
      ? selectedLabels.filter((l) => l !== label)
      : [...selectedLabels, label];

    setSelectedLabels(updatedLabels); 
  };

  const handleTextAreaInput = () => {
    if (textAreaRef.current) {
      textAreaRef.current.style.height = "auto"; 
      textAreaRef.current.style.height = `${textAreaRef.current.scrollHeight}px`; 
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Basic validation
    if (!title.trim()) {
      return;
    }

    // Create formatted body with user info
    const userSignature = userInfo.formattedEmail ? `\n\n---\n*Submitted by: ${userInfo.formattedEmail}*` : '';
    const formattedBody = body.trim() + userSignature;

    const issueData = {
      title: title.trim(),
      body: formattedBody,
      labels: selectedLabels,
    };

    try {
      await createIssue(issueData).unwrap();

      // Show success message
      setSuccessMessage("Thank you for your feedback! Your submission has been received and our team will review it soon.");
      
      // Clear form
      setTitle("");
      setBody("");
      setSelectedLabels([]);
      
      // Reset textarea height
      if (textAreaRef.current) {
        textAreaRef.current.style.height = "auto";
      }

      // Hide success message after 8 seconds
      setTimeout(() => setSuccessMessage(""), 8000);
    } catch (err) {
      console.error("Failed to submit feedback:", err);
    }
  };

  return (
    <section className="issue-form-section">
      <form onSubmit={handleSubmit} className="issue-form">
        <h2>Submit Feedback</h2>
        <p style={{ textAlign: 'center', color: 'var(--text-color)', opacity: 0.8, marginBottom: '1rem' }}>
          Help us improve by reporting bugs, requesting features, or asking questions
        </p>
        
        {userInfo.formattedEmail && (
          <p style={{ 
            textAlign: 'center', 
            color: 'var(--text-color)', 
            opacity: 0.6, 
            fontSize: '0.9rem',
            fontStyle: 'italic',
            marginBottom: '1.5rem'
          }}>
            Submitting as: {userInfo.formattedEmail}
          </p>
        )}
        
        {successMessage && (
          <p className="success" role="alert">
            {successMessage}
          </p>
        )}

        <label htmlFor="title">
          What would you like to tell us? *
          <input
            type="text"
            id="title"
            className="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Brief summary of your feedback"
            required
            maxLength={100}
          />
        </label>

        <label htmlFor="body">
          Additional Details (Optional)
          <textarea
            id="body"
            ref={textAreaRef} 
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onInput={handleTextAreaInput}
            placeholder="Please provide any additional details, steps to reproduce (for bugs), or context that would help us understand your request..."
            rows={8}
          />
        </label>

        <fieldset>
          <legend>What type of feedback is this?</legend>
          {labelOptions.map((option) => (
            <label key={option.value}>
              <input
                type="checkbox"
                checked={selectedLabels.includes(option.value)}
                onChange={() => handleLabelChange(option.value)}
              />
              <span>
                {option.label}
                <small style={{ display: 'block', opacity: 0.7, fontSize: '0.9em' }}>
                  {option.description}
                </small>
              </span>
            </label>
          ))}
        </fieldset>

        <button type="submit" disabled={isLoading || !title.trim()}>
          {isLoading ? "Submitting..." : "Submit Feedback"}
        </button>

        {error && (
          <p className="error" role="alert">
            Sorry, we couldn't submit your feedback right now. Please try again in a few moments.
            {error.data?.msg && <small style={{ display: 'block', marginTop: '0.5rem' }}>Technical details: {error.data.msg}</small>}
          </p>
        )}

        <Link to='/welcome' className="back-link">
          ← Back to Welcome
        </Link>
      </form>
    </section>
  );
};

export default IssueForm;