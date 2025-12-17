require('dotenv').config();
const express = require('express');
const cors = require('cors');
const errorHandler = require('./middleware/errorHandler');
const projectPublishingRoutes = require('./routes/projectPublishingRoutes');

const app = express();
const PORT = process.env.PORT || 5011;

// Middleware
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy', service: 'project-publishing-service' });
});

// Routes
app.use('/api/project-publishing', projectPublishingRoutes);

// Error handler
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Project Publishing service running on port ${PORT}`);
});
