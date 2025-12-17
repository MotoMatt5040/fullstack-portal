// Allowed origins for CORS
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'http://localhost',
  process.env.FRONTEND_URL,
  process.env.VITE_DOMAIN_NAME ? `https://${process.env.VITE_DOMAIN_NAME}` : null,
].filter(Boolean);

// CORS options
const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl, postman)
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`CORS blocked origin: ${origin}`);
      callback(null, true); // Allow for development - change to callback(new Error('Not allowed by CORS')) for strict mode
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
};

// Credentials middleware
const credentials = (req, res, next) => {
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Credentials', true);
  }
  next();
};

module.exports = { corsOptions, credentials };
