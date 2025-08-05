require('dotenv').config()
const environment = process.env.NODE_ENV || 'production'; //|| process.env.APP_ENV

let envPath;
switch (environment) {
  case 'testing':
    envPath = '.env.testing';
    break;
  case 'development':
    envPath = '.env.development';
    break;
  case 'production':
    envPath = '.env.production';
    break;
  default:
    envPath = '.env.dev';
    break;
}

console.log(`🚀 Loading environment: ${environment}`);
console.log(`📁 Environment file: ${envPath}`);

require('dotenv').config({ path: envPath });
const express = require('express');
const app = express();
const { initializeRoles } = require('./config/rolesConfig');
const path = require('path');
const cors = require('cors');
const corsOptions = require('./config/corsOptions');
const { logger } = require('./middleware/logEvents');
const auditLogger = require('./middleware/auditor');
const errorHandler = require('./middleware/errorHandler');
const verifyJWT = require('./middleware/verifyJWT');
const cookieParser = require('cookie-parser');
const credentials = require('./middleware/credentials');
const PORT = process.env.PORT || 5000;

app.use(logger);

// TO FIX SAME SITE ISSUES NAVIGATE TO controllers/authControllers.js and look at where the cookie is set

app.use(credentials); //THIS MUST BE BEFORE CORS
app.use(cors(corsOptions));
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(cookieParser());

//styling
app.use(express.static(path.join(__dirname, 'public')));

// We create an async function to handle startup tasks.
const startServer = async () => {
  try {
    await initializeRoles();

    // Public API routes (no JWT required)
    app.use('/api', require('./routes/publicRoutes'));

    // Everything after this line requires a JWT
    app.use(verifyJWT);

    // Protected API routes (JWT required)
    app.use('/api', require('./routes/privateRoutes'));

    app.all('*', (req, res) => {
      res.status(404);
      if (req.accepts('html')) {
        res.sendFile(path.join(__dirname, 'views', '404.html'));
      } else if (req.accepts('json')) {
        res.json({ error: '404 Not Found' });
      } else {
        res.type('txt').send('404 Not Found');
      }
    });

    app.use(errorHandler);
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
    
  } catch (error) {
    console.error('A critical error occurred during server startup:', error);
    process.exit(1);
  }
};

// Call the function to start the application.
startServer();
