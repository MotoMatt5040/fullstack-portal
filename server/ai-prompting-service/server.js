require('dotenv').config();
const express = require('express');
const cors = require('cors');
const aiPromptingRoutes = require('./routes/aiPromptingRoutes');
const errorHandler = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 5013;

// Middleware
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy', service: 'ai-prompting-service' });
});

// Routes - mounted at /api/ai to match monolith route
app.use('/api/ai', aiPromptingRoutes);

// Error handler
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`AI Prompting service running on port ${PORT}`);
});
