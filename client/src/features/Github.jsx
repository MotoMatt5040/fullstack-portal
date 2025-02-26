import React, { useState, useRef } from "react";
import { useCreateIssueMutation } from "./slices/githubSlice";

const labelOptions = ["bug", "enhancement", "question", "documentation"];

const IssueForm = () => {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [selectedLabels, setSelectedLabels] = useState([]);
  const [createIssue, { isLoading, error }] = useCreateIssueMutation();
  const textAreaRef = useRef(null); // Create a ref for the textarea

  // Handle label change
  const handleLabelChange = (label) => {
    const updatedLabels = selectedLabels.includes(label)
      ? selectedLabels.filter((l) => l !== label)
      : [...selectedLabels, label];

    setSelectedLabels(updatedLabels); // Update selected labels
  };

  // Adjust textarea height dynamically based on content
  const handleTextAreaInput = () => {
    if (textAreaRef.current) {
      textAreaRef.current.style.height = "auto"; // Reset the height to auto
      textAreaRef.current.style.height = `${textAreaRef.current.scrollHeight}px`; // Set the height to scrollHeight
    }
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    const issueData = {
      title,
      body,
      labels: selectedLabels, // Pass selected labels directly
    };

    try {
      const response = await createIssue(issueData).unwrap();
      console.log("Issue Created:", response);

      // Reset form fields after submission
      setTitle("");
      setBody("");
      setSelectedLabels([]);
    } catch (err) {
      console.error("Failed to create issue:", err);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "10px",
        maxWidth: "400px",
      }}
    >
      <h2>Create GitHub Issue</h2>

      <label>
        Title:
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
      </label>

      <label>
        Body:
        <textarea
          ref={textAreaRef} // Attach the ref to the textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onInput={handleTextAreaInput} // Call the function to resize
          style={{ resize: "none", height: 200, width: 500 }} // Disable manual resizing
        />
      </label>

      <fieldset>
        <legend>Labels:</legend>
        {labelOptions.map((label) => (
          <label key={label} style={{ display: "block" }}>
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

      {error && (
        <p style={{ color: "red" }}>
          Error: {error.data?.msg || "Something went wrong"}
        </p>
      )}
    </form>
  );
};

export default IssueForm;
