require('dotenv').config();
const express = require('express');
const cors = require('cors');
const githubRoutes = require('./routes/githubRoutes');
const errorHandler = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 5014;

// Middleware
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy', service: 'github-service' });
});

// Routes - mounted at /api/github to match monolith route
app.use('/api/github', githubRoutes);

// Error handler
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`GitHub service running on port ${PORT}`);
});
