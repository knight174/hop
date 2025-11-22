import * as http from 'http';
import * as https from 'https';
import httpProxy from 'http-proxy';
import { ProxyRule } from '../types';
import { logger } from './logger';

/**
 * Get the CORS headers configuration with flexible fallback logic:
 * 1. If cors.allowHeaders is configured, use it (array or '*')
 * 2. Otherwise, mirror the client's requested headers from Access-Control-Request-Headers
 * 3. Fall back to a sensible default if neither is available
 */
function getCorsHeaders(rule: ProxyRule, req: http.IncomingMessage): {
  origin: string;
  headers: string;
  methods: string;
  credentials: string;
} {
  const requestOrigin = req.headers.origin || '*';
  const allowOrigin = rule.cors?.allowOrigin || requestOrigin;

  // Determine allowed headers
  let allowHeaders: string;
  if (rule.cors?.allowHeaders) {
    if (rule.cors.allowHeaders === '*') {
      allowHeaders = '*';
    } else {
      allowHeaders = rule.cors.allowHeaders.join(', ');
    }
  } else {
    // Mirror client's requested headers (dynamic approach)
    const requestedHeaders = req.headers['access-control-request-headers'];
    allowHeaders = requestedHeaders || 'Origin, X-Requested-With, Content-Type, Accept, Authorization';
  }

  const allowMethods = rule.cors?.allowMethods?.join(', ') || 'GET, POST, PUT, DELETE, OPTIONS';
  const allowCredentials = rule.cors?.allowCredentials !== false ? 'true' : 'false';

  return {
    origin: allowOrigin,
    headers: allowHeaders,
    methods: allowMethods,
    credentials: allowCredentials
  };
}

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
    const corsHeaders = getCorsHeaders(rule, req);
    proxyRes.headers['access-control-allow-origin'] = corsHeaders.origin;
    proxyRes.headers['access-control-allow-headers'] = corsHeaders.headers;
    proxyRes.headers['access-control-allow-methods'] = corsHeaders.methods;
    proxyRes.headers['access-control-allow-credentials'] = corsHeaders.credentials;

    // Log proxy response
    const duration = Date.now() - (req._startTime || Date.now());
    const statusCode = proxyRes.statusCode;
    logger.request(req.method || 'UNKNOWN', req.url || '/', statusCode, duration);
  });

  const server = http.createServer((req, res) => {
    const requestPath = req.url || '/';
    const startTime = Date.now();

    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
      const corsHeaders = getCorsHeaders(rule, req);
      res.writeHead(200, {
        'Access-Control-Allow-Origin': corsHeaders.origin,
        'Access-Control-Allow-Headers': corsHeaders.headers,
        'Access-Control-Allow-Methods': corsHeaders.methods,
        'Access-Control-Allow-Credentials': corsHeaders.credentials
      });
      res.end();
      logger.request(req.method || 'OPTIONS', requestPath, 200, Date.now() - startTime);
      return;
    }

    // Check path matching if paths are configured
    if (rule.paths && rule.paths.length > 0) {
      const matched = rule.paths.some(path => requestPath === path || requestPath.startsWith(path + '/') || requestPath.startsWith(path + '?'));

      if (!matched) {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end(`Path not configured for proxy. Allowed paths: ${rule.paths.join(', ')}`);
        logger.request(req.method || 'UNKNOWN', requestPath, 404, Date.now() - startTime);
        return;
      }
    }

    // Apply path rewrites if configured
    if (rule.pathRewrite) {
      Object.entries(rule.pathRewrite).forEach(([pattern, replacement]) => {
        const regex = new RegExp(pattern);
        if (req.url && regex.test(req.url)) {
          const originalUrl = req.url;
          req.url = req.url.replace(regex, replacement);
          logger.debug(`Rewrote path: ${originalUrl} -> ${req.url}`);
        }
      });
    }

    proxy.web(req, res);
  });

  return server;
}

export async function startProxy(rule: ProxyRule): Promise<http.Server | https.Server> {
  return new Promise(async (resolve, reject) => {
    let server: http.Server | https.Server;

    if (rule.https) {
      try {
        const { getCertificate } = await import('./cert');
        const certs = await getCertificate();

        // Create the proxy handler first
        const proxyHandler = createProxyServer(rule);

        // Create HTTPS server
        server = https.createServer(certs, (req, res) => {
          proxyHandler.emit('request', req, res);
        });
      } catch (error) {
        reject(error);
        return;
      }
    } else {
      server = createProxyServer(rule);
    }

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
