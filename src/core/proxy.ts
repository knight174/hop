import * as http from 'http';
import httpProxy from 'http-proxy';
import { ProxyRule } from '../types';
import { logger } from './logger';
import * as dotenv from 'dotenv';

dotenv.config();

function replaceEnvVariables(value: string): string {
  return value.replace(/\$([A-Z_][A-Z0-9_]*)/g, (_, varName) => {
    return process.env[varName] || `$${varName}`;
  });
}

export function createProxyServer(rule: ProxyRule): http.Server {
  const proxy = httpProxy.createProxyServer({
    target: rule.target,
    changeOrigin: true,
    secure: false
  });

  proxy.on('error', (err: any, req: any, res: any) => {
    logger.error(`Proxy error for port ${rule.port}: ${err.message}`);
    if (res instanceof http.ServerResponse && !res.headersSent) {
      res.writeHead(502, { 'Content-Type': 'text/plain' });
      res.end('Bad Gateway: Proxy error');
    }
  });

  proxy.on('proxyReq', (proxyReq: any, req: any, res: any) => {
    // Inject custom headers
    if (rule.headers) {
      Object.entries(rule.headers).forEach(([key, value]) => {
        const processedValue = replaceEnvVariables(value);
        proxyReq.setHeader(key, processedValue);
      });
    }
  });

  const server = http.createServer((req, res) => {
    // Check path matching if paths are configured
    if (rule.paths && rule.paths.length > 0) {
      const requestPath = req.url || '/';
      const matched = rule.paths.some(path => requestPath === path || requestPath.startsWith(path + '/') || requestPath.startsWith(path + '?'));

      if (!matched) {
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
