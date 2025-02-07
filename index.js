const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();

// Define the proxy targets
const targetUrlDefault = 'http://152.53.37.155/';
const targetUrlAwesome = 'https://google.com';

// Middleware to handle proxy requests for default target
const defaultProxy = createProxyMiddleware({
  target: targetUrlDefault,
  changeOrigin: true,
  secure: true,
  pathRewrite: {
    '^/': '/',
  },
  onProxyRes(proxyRes, req, res) {
    const location = proxyRes.headers['location'];
    if (location && location.startsWith(targetUrlDefault)) {
      proxyRes.headers['location'] = location.replace(targetUrlDefault, req.protocol + '://' + req.get('host'));
    }
  }
});

// Middleware to handle proxy requests for /awesome
const awesomeProxy = createProxyMiddleware({
  target: targetUrlAwesome,
  changeOrigin: true,
  secure: true,
  pathRewrite: {
    '^/goon': '/', // Rewrite /awesome to /
  }
});

// Apply the middleware
app.use('/awesome', awesomeProxy); // Proxy requests to /awesome
app.use('/', defaultProxy); // Default proxy for all other requests

// Start the server on port 3000
const port = 3000;
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
