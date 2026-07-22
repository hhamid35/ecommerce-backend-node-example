'use strict';

const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const swaggerUi = require('swagger-ui-express');

const { config } = require('./config/env');
const logger = require('./utils/logger');
const routes = require('./routes');
const openapiSpec = require('./docs/openapi');
const { notFoundHandler, errorHandler } = require('./middleware/error.middleware');

const app = express();

// Trust the first proxy (needed for correct client IPs behind load balancers,
// and for express-rate-limit to work correctly in containerized deployments).
app.set('trust proxy', 1);

// --- Security & core middleware -------------------------------------------
// CSP is disabled because this is a JSON API and it interferes with Swagger UI.
app.use(helmet({ contentSecurityPolicy: false }));

const corsOptions =
  config.corsOrigin === '*'
    ? {}
    : { origin: config.corsOrigin.split(',').map((o) => o.trim()) };
app.use(cors(corsOptions));

app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: false }));

if (!config.isTest) {
  app.use(morgan(config.isProduction ? 'combined' : 'dev'));
}

// Basic rate limiting to protect against abuse.
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX, 10) || 1000,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// --- Static files ----------------------------------------------------------
// Serves uploaded images at /uploads/<filename> (client builds URLs from this).
app.use(express.static(path.join(__dirname, '..', 'public')));

// --- API documentation -----------------------------------------------------
app.get('/api-docs.json', (req, res) => res.json(openapiSpec));
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(openapiSpec, {
  customSiteTitle: 'Ecommerce API Docs',
}));

// --- Root & API routes ------------------------------------------------------
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Ecommerce Backend API',
    documentation: '/api-docs',
    health: '/health',
  });
});

app.use('/', routes);

// --- Error handling ---------------------------------------------------------
app.use(notFoundHandler);
app.use(errorHandler);

logger.debug('Express app configured');

module.exports = app;
