require('dotenv').config();
const express = require('express');
const cors = require('cors');
const errorHandler = require('./middleware/errorHandler');
const projectInfoRoutes = require('./routes/projectInfoRoutes');

const app = express();
const PORT = process.env.PORT || 5010;

// Middleware
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy', service: 'project-info-service' });
});

// Routes
app.use('/api/project-info', projectInfoRoutes);

// Error handler
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Project Info service running on port ${PORT}`);
});
