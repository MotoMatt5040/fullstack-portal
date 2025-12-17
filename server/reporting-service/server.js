require('dotenv').config();
const express = require('express');
const cors = require('cors');
const errorHandler = require('./middleware/errorHandler');
const reportRoutes = require('./routes/reportRoutes');

const app = express();
const PORT = process.env.PORT || 5009;

// Middleware
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy', service: 'reporting-service' });
});

// Routes
app.use('/api/reports', reportRoutes);

// Error handler
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Reporting service running on port ${PORT}`);
});
