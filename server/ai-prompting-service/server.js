require('dotenv').config();
const express = require('express');
const cors = require('cors');
const errorHandler = require('./middleware/errorHandler');
const { initializeRoles } = require('./config/rolesConfig');

const app = express();
const PORT = process.env.PORT || 5013;

// Middleware
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy', service: 'ai-prompting-service' });
});

// Initialize roles and start server
const startServer = async () => {
  await initializeRoles();

  const aiPromptingRoutes = require('./routes/aiPromptingRoutes');
  app.use('/api/ai', aiPromptingRoutes);

  app.use(errorHandler);

  app.listen(PORT, () => {
    console.log(`AI Prompting service running on port ${PORT}`);
  });
};

startServer();
