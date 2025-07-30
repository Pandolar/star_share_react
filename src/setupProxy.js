const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function (app) {
  // 代理 /star 到后端 /star
  app.use(
    '/star',
    createProxyMiddleware({
      target: 'http://localhost:8080', // 后端服务地址
      changeOrigin: true,
      logLevel: 'debug',
    })
  );
  
  // 代理 /u 到后端 /u  
  app.use(
    '/u',
    createProxyMiddleware({
      target: 'http://localhost:8080', // 后端服务地址
      changeOrigin: true,
      logLevel: 'debug',
    })
  );
};