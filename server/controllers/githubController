require('dotenv').config();
const fetch = require('node-fetch');

const FULLSTACK_PORTAL_ISSUE_TOKEN = process.env.FULLSTACK_PORTAL_ISSUES_TOKEN;
const OWNER = process.env.REPO_OWNER;
const REPO = process.env.REPO_NAME;

const createIssue = async (req, res) => {
    console.log('createIssue');
    const { title, body, labels, assignees, milestone } = req.body;

    if (!title) {
        return res.status(400).json({ msg: 'Title is required' });
    }

    const issueData = {
        title,
        body: body || '',
        labels: labels || [],
        assignees: assignees || [],
        milestone: milestone || null
    };

    try {
        const response = await fetch(`https://api.github.com/repos/${OWNER}/${REPO}/issues`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${FULLSTACK_PORTAL_ISSUE_TOKEN}`,
                'Accept': 'application/vnd.github+json',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(issueData),
        });

        const result = await response.json();

        if (!response.ok) {
            return res.status(response.status).json({ msg: result.message || 'GitHub API error' });
        }

        res.status(201).json(result);
    } catch (error) {
        res.status(500).json({ msg: 'Error creating issue', error: error.message });
    }
};

module.exports = { createIssue };
