import ora from 'ora';
import * as http from 'http';
import { loadConfig } from '../core/config';
import { startProxy } from '../core/proxy';
import { logger } from '../core/logger';
import { ProxyRule } from '../types';
import { registry } from '../core/registry';
import chalk from 'chalk';

interface ServerInfo {
  proxy: ProxyRule;
  server: http.Server | any; // Use any to avoid complex type issues with https.Server
}

export async function serveCommand(proxyNames: string[] = []): Promise<void> {
  const spinner = ora('Loading configuration...').start();

  try {
    const config = await loadConfig();

    if (config.proxies.length === 0) {
      spinner.stop();
      logger.info('No proxies configured. Use "hop add" to add one.');
      return;
    }

    // Filter proxies by names if specified
    let proxiesToStart = config.proxies;
    if (proxyNames.length > 0) {
      proxiesToStart = config.proxies.filter(p => proxyNames.includes(p.name));

      if (proxiesToStart.length === 0) {
        spinner.stop();
        logger.error(`No proxies found with names: ${proxyNames.join(', ')}`);
        process.exit(1);
      }

      // Check for non-existent proxy names
      const foundNames = proxiesToStart.map(p => p.name);
      const notFound = proxyNames.filter(name => !foundNames.includes(name));
      if (notFound.length > 0) {
        spinner.stop();
        logger.error(`Proxy not found: ${notFound.join(', ')}`);
        logger.info(`Available proxies: ${config.proxies.map(p => p.name).join(', ')}`);
        process.exit(1);
      }
    }

    spinner.text = 'Starting proxy servers...';

    const servers: ServerInfo[] = [];
    for (const proxy of proxiesToStart) {
      // Check if already running (via registry)
      if (registry.isRunning(proxy.name)) {
        const entry = registry.getEntry(proxy.name);
        if (entry && entry.pid !== process.pid) {
          spinner.fail();
          logger.error(`Proxy ${proxy.name} is already running in another process (PID: ${entry.pid})`);
          process.exit(1);
        }
      }

      try {
        const { server, proxy: proxyHandler } = await startProxy(proxy);
        servers.push({ proxy, server });

        // Store proxy handler for dashboard
        (server as any)._proxyHandler = proxyHandler;

        // Register in registry
        registry.register(proxy.name, process.pid, proxy.port);
      } catch (error) {
        spinner.fail();
        if (error instanceof Error) {
          logger.error(`Failed to start proxy ${proxy.name} on port ${proxy.port}: ${error.message}`);
        }
        process.exit(1);
      }
    }

    spinner.stop();

    // Initialize Dashboard
    // We need to dynamically import Dashboard to avoid issues if it's not used
    const { Dashboard } = await import('../core/dashboard');

    const dashboard = new Dashboard();

    // Monkey patch console.log to avoid messing up TUI
    // Redirect to dashboard log instead
    const originalConsoleLog = console.log;
    const originalConsoleError = console.error;

    console.log = (...args: any[]) => {
      dashboard.log(args.map(a => typeof a === 'string' ? a : JSON.stringify(a)).join(' '));
    };
    console.error = (...args: any[]) => {
      dashboard.log(chalk.red(args.map(a => typeof a === 'string' ? a : JSON.stringify(a)).join(' ')));
    };
    console.warn = (...args: any[]) => {
      dashboard.log(chalk.yellow(args.map(a => typeof a === 'string' ? a : JSON.stringify(a)).join(' ')));
    };
    console.info = console.log;

    // Connect proxies to dashboard
    servers.forEach(({ server }) => {
      const proxyHandler = (server as any)._proxyHandler;
      if (proxyHandler) {
        proxyHandler.on('request', (data: any) => {
          dashboard.addRequest({
            id: data.id,
            method: data.method,
            path: data.path,
            startTime: data.startTime,
            reqHeaders: data.headers
          });
        });

        proxyHandler.on('response', (data: any) => {
          dashboard.updateRequest(data.id, {
            statusCode: data.statusCode,
            duration: data.duration,
            resHeaders: data.headers
          });
        });
      }
    });

    // Keep process alive
    process.on('SIGINT', () => {
      // Restore console
      console.log = originalConsoleLog;
      console.error = originalConsoleLog;

      servers.forEach(({ server, proxy }) => {
        server.close();
        registry.unregister(proxy.name);
      });
      process.exit(0);
    });

    process.on('SIGTERM', () => {
      servers.forEach(({ server, proxy }) => {
        server.close();
        registry.unregister(proxy.name);
      });
      process.exit(0);
    });

  } catch (error) {
    spinner.fail();
    if (error instanceof Error) {
      logger.error(error.message);
    } else {
      logger.error('Failed to start proxy servers');
    }
    process.exit(1);
  }
}
