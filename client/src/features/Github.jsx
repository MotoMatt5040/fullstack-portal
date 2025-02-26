import React, { useState } from "react";
import { useCreateIssueMutation } from "./slices/githubSlice";

const labelOptions = ["bug", "enhancement", "question", "documentation"];

const IssueForm = () => {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [selectedLabels, setSelectedLabels] = useState([]);
  const [createIssue, { isLoading, error }] = useCreateIssueMutation();

  const handleLabelChange = (label) => {
    const updatedLabels = selectedLabels.includes(label)
      ? selectedLabels.filter((l) => l !== label)
      : [...selectedLabels, label];

    setSelectedLabels(updatedLabels);
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
          value={body}
          onChange={(e) => setBody(e.target.value)}
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
