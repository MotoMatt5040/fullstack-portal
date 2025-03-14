import React, { useState, useRef } from "react";
import { useCreateIssueMutation } from "./githubSlice";
import { Link } from "react-router-dom";
import "./github.css"; 

const labelOptions = ["bug", "enhancement", "question", "documentation"];

const IssueForm = () => {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [selectedLabels, setSelectedLabels] = useState([]);
  const [createIssue, { isLoading, error }] = useCreateIssueMutation();
  const textAreaRef = useRef(null); 

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

    const issueData = {
      title,
      body,
      labels: selectedLabels,
    };

    try {
      const response = await createIssue(issueData).unwrap();
      console.log("Issue Created:", response);

      setTitle("");
      setBody("");
      setSelectedLabels([]);
    } catch (err) {
      console.error("Failed to create issue:", err);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="issue-form">
      <h2>Create Issue or Request Feature Enhancement</h2>

      <label htmlFor="title">
        Title:
        <input
          type="text"
          id="title"
          className="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
      </label>

      <label>
        Body:
        <textarea
          ref={textAreaRef} 
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onInput={handleTextAreaInput} 
        />
      </label>

      <fieldset>
        <legend>Labels:</legend>
        {labelOptions.map((label) => (
          <label key={label}>
            <input
              type="checkbox"
              checked={selectedLabels.includes(label)}
              onChange={() => handleLabelChange(label)}
            />
            &nbsp;{label}
          </label>
        ))}
      </fieldset>

      <button type="submit" disabled={isLoading}>
        {isLoading ? "Creating..." : "Create Issue"}
      </button>
      <Link to='/welcome'>Back to Welcome</Link>

      {error && (
        <p className="error">
          Error: {error.data?.msg || "Something went wrong"}
        </p>
      )}
    </form>
  );
};

export default IssueForm;