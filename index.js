const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const NodeCache = require('node-cache');
const spdy = require('spdy');
const fs = require('fs');
const morgan = require('morgan');

// Create Express app
const app = express();

// Configuration
const TARGET_URL = 'http://152.53.37.155/';
const PORT = 3000;

// In-memory cache for responses
const myCache = new NodeCache();

// HTTP/2 setup (Optional if you want to use HTTP/2)
const options = {
  key: fs.readFileSync('./server.key'),
  cert: fs.readFileSync('./server.crt')
};

// Middleware to log requests
app.use(morgan('combined')); // Standard Apache combined log format

// Rate limiting: Allow 100 requests per 15 minutes per IP
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit to 100 requests
  message: "Too many requests, please try again later."
});

// Apply rate limiter
app.use(limiter);

// Enable compression for responses
app.use(compression()); 

// Function to create a proxy middleware with caching and performance improvements
const createProxy = (target) => createProxyMiddleware({
  target,
  changeOrigin: true,
  secure: true,
  pathRewrite: { '^/': '/' },
  timeout: 5000, // Timeout after 5 seconds
  onProxyRes(proxyRes, req, res) {
    // Cache responses
    const cacheKey = req.originalUrl;
    const cachedResponse = myCache.get(cacheKey);
    if (cachedResponse) {
      // Serve from cache
      res.send(cachedResponse);
      return;
    }

    // Cache the response if it's not in cache
    let responseData = '';
    proxyRes.on('data', chunk => {
      responseData += chunk;
    });

    proxyRes.on('end', () => {
      myCache.set(cacheKey, responseData, 60); // Cache for 60 seconds
      res.send(responseData);
    });

    // Log the response status code
    console.log(`[PROXY] Response status for ${req.method} ${req.url}: ${proxyRes.statusCode}`);
  },
  onProxyReq(proxyReq, req, res) {
    // Set Keep-Alive for persistent connections
    proxyReq.setHeader('Connection', 'keep-alive');
  },
  onError(err, req, res) {
    console.error(`Proxy Error: ${err.message}`);
    res.status(502).json({ error: 'Bad Gateway', details: err.message });
  }
});

// Apply the proxy middleware for all routes
app.use('/', createProxy(TARGET_URL));

// Start HTTP/2 server if you're using it, or fallback to regular HTTP server
if (options.key && options.cert) {
  spdy.createServer(options, app).listen(PORT, () => {
    console.log(`HTTP/2 proxy server running at https://localhost:${PORT}`);
  });
} else {
  app.listen(PORT, () => {
    console.log(`Proxy server running at http://localhost:${PORT}`);
  });
}
