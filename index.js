const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const morgan = require('morgan'); // For better request logging

const app = express();

// Configuration
const TARGET_URL = 'http://152.53.37.155/';
const PORT = 3000;

// Middleware to log requests (better logging with morgan)
app.use(morgan('combined')); // Standard Apache combined log format

// Function to create a proxy middleware with more options
const createProxy = (target) => createProxyMiddleware({
  target,
  changeOrigin: true,
  secure: true,
  pathRewrite: { '^/': '/' },
  timeout: 5000, // Timeout after 5 seconds
  onProxyRes(proxyRes, req) {
    // Log the response status code
    console.log(`[PROXY] Response status for ${req.method} ${req.url}: ${proxyRes.statusCode}`);
    const location = proxyRes.headers['location'];
    if (location?.startsWith(target)) {
      proxyRes.headers['location'] = location.replace(target, `${req.protocol}://${req.get('host')}`);
    }
  },
  onError(err, req, res) {
    console.error(`Proxy Error: ${err.message}`);
    res.status(502).json({ error: 'Bad Gateway', details: err.message });
  },
  // Enable CORS support for cross-origin requests
  onProxyReq(proxyReq, req, res) {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  }
});

// Apply proxy middleware
app.use('/', createProxy(TARGET_URL));

// Global error handling
app.use((err, req, res, next) => {
  console.error(`Server Error: ${err.message}`);
  res.status(500).json({ error: 'Internal Server Error', details: err.message });
});

// Start server
app.listen(PORT, () => {
  console.log(`Proxy server running at http://localhost:${PORT}`);
});
