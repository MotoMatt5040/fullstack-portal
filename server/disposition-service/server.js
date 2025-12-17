require('dotenv').config();
const express = require('express');
const cors = require('cors');
const dispositionRoutes = require('./routes/dispositionRoutes');
const errorHandler = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 5012;

// Middleware
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy', service: 'disposition-service' });
});

// Routes - mounted at /api/disposition-report to match monolith route
app.use('/api/disposition-report', dispositionRoutes);

// Error handler
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Disposition service running on port ${PORT}`);
});
