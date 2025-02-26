import React from 'react';
import { useState } from "react";
import { useCreateIssueMutation } from "./slices/githubSlice";

const IssueForm = () => {
    const [title, setTitle] = useState("");
    const [body, setBody] = useState("");
    const [labels, setLabels] = useState("");
    const [createIssue, { isLoading, error }] = useCreateIssueMutation();

    const handleSubmit = async (e) => {
        e.preventDefault();

        const issueData = {
            title,
            body,
            labels: labels.split(",").map(label => label.trim()), // Convert comma-separated labels to an array
        };

        try {
            const response = await createIssue(issueData).unwrap();
            console.log("Issue Created:", response);

            // Reset form fields after submission
            setTitle("");
            setBody("");
            setLabels("");
        } catch (err) {
            console.error("Failed to create issue:", err);
        }
    };

    return (
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "10px", maxWidth: "400px" }}>
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

            <label>
                Labels (comma-separated):
                <input
                    type="text"
                    value={labels}
                    onChange={(e) => setLabels(e.target.value)}
                />
            </label>

            <button type="submit" disabled={isLoading}>
                {isLoading ? "Creating..." : "Create Issue"}
            </button>

            {error && <p style={{ color: "red" }}>Error: {error.data?.msg || "Something went wrong"}</p>}
        </form>
    );
};

export default IssueForm;
