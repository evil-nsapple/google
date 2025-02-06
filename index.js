const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const path = require('path');

const app = express();

// The target URL to reverse proxy to
const targetUrl = 'https://quincy-questions.netlify.app';

// Middleware to handle proxy requests
const proxy = createProxyMiddleware({
  target: targetUrl,
  changeOrigin: true, // Ensures the origin header is changed to match the target
  secure: true, // Ensures requests over HTTPS are secure
  pathRewrite: {
    '^/': '/', // Rewrite the URL path to avoid changing the root URL
  },
  onProxyRes(proxyRes, req, res) {
    // Modify headers to ensure redirects happen within your domain
    const location = proxyRes.headers['location'];
    if (location && location.startsWith(targetUrl)) {
      // Change the location to your domain
      proxyRes.headers['location'] = location.replace(targetUrl, req.protocol + '://' + req.get('host'));
    }
  }
});

// Serve the HTML file when the user accesses the root
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Proxy all requests to the target URL
app.use('/', proxy);

// Start the server on port 3000 (or any port you prefer)
const port = 3000;
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
