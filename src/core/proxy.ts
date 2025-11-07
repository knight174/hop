import * as http from 'http';
import httpProxy from 'http-proxy';
import { ProxyRule } from '../types';
import { logger } from './logger';

export function createProxyServer(rule: ProxyRule): http.Server {
  const proxy = httpProxy.createProxyServer({
    target: rule.target,
    changeOrigin: true,
    secure: false
  });

  proxy.on('error', (err: any, _req: any, res: any) => {
    logger.error(`Proxy error for port ${rule.port}: ${err.message}`);
    if (res instanceof http.ServerResponse && !res.headersSent) {
      res.writeHead(502, { 'Content-Type': 'text/plain' });
      res.end('Bad Gateway: Proxy error');
    }
  });

  proxy.on('proxyReq', (proxyReq: any, req: any) => {
    // Save request start time for duration calculation
    req._startTime = Date.now();

    // Inject custom headers
    if (rule.headers) {
      Object.entries(rule.headers).forEach(([key, value]) => {
        proxyReq.setHeader(key, value);
      });
    }
  });

  proxy.on('proxyRes', (proxyRes: any, req: any) => {
    // Add CORS headers to the response
    proxyRes.headers['access-control-allow-origin'] = req.headers.origin || '*';
    proxyRes.headers['access-control-allow-headers'] = 'Origin, X-Requested-With, Content-Type, Accept, Authorization';
    proxyRes.headers['access-control-allow-methods'] = 'GET, POST, PUT, DELETE, OPTIONS';
    proxyRes.headers['access-control-allow-credentials'] = 'true';

    // Log proxy response with appropriate color based on status code
    const duration = Date.now() - (req._startTime || Date.now());
    const statusCode = proxyRes.statusCode;
    const logMessage = `${req.method} ${req.url} → ${statusCode} (${duration}ms)`;

    if (statusCode >= 200 && statusCode < 300) {
      logger.success(logMessage);
    } else if (statusCode >= 400) {
      logger.error(logMessage);
    } else {
      logger.info(logMessage);
    }
  });

  const server = http.createServer((req, res) => {
    const requestPath = req.url || '/';
    const startTime = Date.now();

    // Log incoming request with cyan color for method
    logger.info(`${req.method} ${requestPath}`);

    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
      res.writeHead(200, {
        'Access-Control-Allow-Origin': req.headers.origin || '*',
        'Access-Control-Allow-Headers': 'Origin, X-Requested-With, Content-Type, Accept, Authorization',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Credentials': 'true'
      });
      res.end();
      logger.success(`${req.method} ${requestPath} → 200 OPTIONS (${Date.now() - startTime}ms)`);
      return;
    }

    // Check path matching if paths are configured
    if (rule.paths && rule.paths.length > 0) {
      const matched = rule.paths.some(path => requestPath === path || requestPath.startsWith(path + '/') || requestPath.startsWith(path + '?'));

      if (!matched) {
        logger.warn(`${req.method} ${requestPath} → 404 Path not matched. Configured: ${rule.paths.join(', ')}`);
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end(`Path not configured for proxy. Allowed paths: ${rule.paths.join(', ')}`);
        return;
      }
    }

    proxy.web(req, res);
  });

  return server;
}

export async function startProxy(rule: ProxyRule): Promise<http.Server> {
  return new Promise((resolve, reject) => {
    const server = createProxyServer(rule);

    server.on('error', (err: NodeJS.ErrnoException) => {
      if (err.code === 'EADDRINUSE') {
        reject(new Error(`Port ${rule.port} is already in use`));
      } else {
        reject(err);
      }
    });

    server.listen(rule.port, () => {
      resolve(server);
    });
  });
}
