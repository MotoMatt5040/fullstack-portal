require('dotenv').config();
const express = require('express');
const cors = require('cors');
const errorHandler = require('./middleware/errorHandler');
const promarkEmployeesRoutes = require('./routes/promarkEmployeesRoutes');

const app = express();
const PORT = process.env.PORT || 5015;

// Middleware
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy', service: 'promark-employees-service' });
});

// Routes
app.use('/api/promark-employees', promarkEmployeesRoutes);

// Error handler
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Promark Employees Service running on port ${PORT}`);
});
