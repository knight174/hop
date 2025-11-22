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

export function createProxyServer(rule: ProxyRule): { server: http.Server, proxy: any } {
  const proxy = httpProxy.createProxyServer({
    target: rule.target,
    changeOrigin: true,
    secure: false
  });

  // Load plugins (async loading happens in startProxy, here we just prepare hooks)
  // Note: Since createProxyServer is synchronous but plugin loading is async,
  // we'll attach plugins to the proxy object later in startProxy.
  // This is a slight refactor to allow async plugin loading.

  proxy.on('error', (err: any, _req: any, res: any) => {
    logger.error(`Proxy error for port ${rule.port}: ${err.message}`);
    if (res instanceof http.ServerResponse && !res.headersSent) {
      res.writeHead(502, { 'Content-Type': 'text/plain' });
      res.end('Bad Gateway: Proxy error');
    }
  });

  proxy.on('proxyReq', (proxyReq, req: any, res, options) => {
    // Plugin onRequest hooks are handled in the server callback below

    // Inject custom headers
    if (rule.headers) {
      Object.entries(rule.headers).forEach(([key, value]) => {
        proxyReq.setHeader(key, value);
      });
    }

    // Path rewriting logic
    if (rule.pathRewrite && req.url) {
      // ... (existing rewrite logic is applied before proxy.web, so we don't need to do it here)
    }
  });

  proxy.on('proxyRes', (proxyRes, req: any, res) => {
    // Add CORS headers to the response
    const corsHeaders = getCorsHeaders(rule, req);
    proxyRes.headers['access-control-allow-origin'] = corsHeaders.origin;
    proxyRes.headers['access-control-allow-headers'] = corsHeaders.headers;
    proxyRes.headers['access-control-allow-methods'] = corsHeaders.methods;
    proxyRes.headers['access-control-allow-credentials'] = corsHeaders.credentials;

    // Execute plugin onResponse hooks
    if (req._plugins) {
      req._plugins.forEach((plugin: any) => {
        if (plugin.onResponse) {
          try {
            plugin.onResponse(proxyRes, req, res);
          } catch (err) {
            logger.error(`Plugin onResponse error: ${err}`);
          }
        }
      });
    }

    // Log proxy response
    const duration = Date.now() - (req._startTime || Date.now());
    const statusCode = proxyRes.statusCode;

    // Emit event instead of logging directly if listener exists
    if (proxy.listenerCount('response') > 0) {
      proxy.emit('response', {
        id: req._id,
        statusCode,
        duration,
        headers: proxyRes.headers
      });
    } else {
      logger.request(req.method || 'UNKNOWN', req.url || '/', statusCode, duration);
    }
  });

  const server = http.createServer((req: any, res) => {
    const requestPath = req.url || '/';
    const startTime = Date.now();
    req._id = Math.random().toString(36).substring(7);
    req._startTime = startTime;

    // Emit request event
    if (proxy.listenerCount('request') > 0) {
      proxy.emit('request', {
        id: req._id,
        method: req.method,
        path: requestPath,
        startTime,
        headers: req.headers
      });
    }

    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
      const corsHeaders = getCorsHeaders(rule, req);
      res.writeHead(204, {
        'Access-Control-Allow-Origin': corsHeaders.origin,
        'Access-Control-Allow-Methods': corsHeaders.methods,
        'Access-Control-Allow-Headers': corsHeaders.headers,
        'Access-Control-Allow-Credentials': corsHeaders.credentials
      });
      res.end();
      return;
    }

    // Path matching
    if (rule.paths && rule.paths.length > 0) {
      const isMatch = rule.paths.some(p => requestPath.startsWith(p));
      if (!isMatch) {
        res.writeHead(404);
        res.end(`Not Found: Path ${requestPath} is not proxied.`);
        return;
      }
    }

    // Path Rewriting
    if (rule.pathRewrite) {
      for (const [pattern, replacement] of Object.entries(rule.pathRewrite)) {
        const regex = new RegExp(pattern);
        if (regex.test(req.url || '')) {
          const originalUrl = req.url;
          req.url = req.url?.replace(regex, replacement);
          if (process.env.DEBUG) {
            logger.debug(`Rewrote path: ${originalUrl} -> ${req.url}`);
          }
          break; // Apply only the first matching rule
        }
      }
    }

    // Execute Plugin onRequest hooks
    const executePlugins = (index: number) => {
      if (!req._plugins || index >= req._plugins.length) {
        // All plugins executed, proceed to proxy
        proxy.web(req, res);
        return;
      }

      const plugin = req._plugins[index];
      if (plugin.onRequest) {
        try {
          plugin.onRequest(req, res, () => executePlugins(index + 1));
        } catch (err) {
          logger.error(`Plugin onRequest error: ${err}`);
          // Continue even if plugin fails? Or stop? Let's continue for now.
          executePlugins(index + 1);
        }
      } else {
        executePlugins(index + 1);
      }
    };

    executePlugins(0);
  });

  return { server, proxy };
}

export async function startProxy(rule: ProxyRule): Promise<{ server: http.Server | https.Server, proxy: any }> {
  return new Promise(async (resolve, reject) => {
    let server: http.Server | https.Server;
    let proxyHandler: any;
    let plugins: any[] = [];

    // Load plugins if configured
    if (rule.plugins && rule.plugins.length > 0) {
      try {
        const { loadPlugins } = await import('./plugin-loader');
        plugins = await loadPlugins(rule.plugins);
      } catch (err) {
        logger.error(`Failed to load plugins: ${err}`);
      }
    }

    if (rule.https) {
      try {
        const { getCertificate } = await import('./cert');
        const certs = await getCertificate();

        // Create the proxy handler first
        const result = createProxyServer(rule);
        proxyHandler = result.proxy;

        // Create HTTPS server
        server = https.createServer(certs, (req: any, res) => {
          // Attach plugins to request object so they can be accessed in createProxyServer
          req._plugins = plugins;
          proxyHandler.emit('request', req, res);
        });
      } catch (error) {
        reject(error);
        return;
      }
    } else {
      const result = createProxyServer(rule);
      server = result.server;
      proxyHandler = result.proxy;

      // We need to intercept the request event to attach plugins
      // But http.createServer in createProxyServer already handles the request.
      // A cleaner way is to attach plugins to the server instance or pass them to createProxyServer.
      // However, since we refactored createProxyServer to handle plugins via req._plugins,
      // we need to ensure req._plugins is set.

      // Hack: Wrap the 'request' listener of the server
      const originalListeners = server.listeners('request');
      server.removeAllListeners('request');

      server.on('request', (req: any, res) => {
        req._plugins = plugins;
        originalListeners.forEach((listener: any) => listener(req, res));
      });
    }

    server.on('error', (err: NodeJS.ErrnoException) => {
      if (err.code === 'EADDRINUSE') {
        reject(new Error(`Port ${rule.port} is already in use`));
      } else {
        reject(err);
      }
    });

    server.listen(rule.port, () => {
      resolve({ server, proxy: proxyHandler });
    });
  });
}
