import ora from 'ora';
import * as http from 'http';
import { loadConfig } from '../core/config';
import { startProxy } from '../core/proxy';
import { logger } from '../core/logger';
import { ProxyRule } from '../types';
import chalk from 'chalk';

interface ServerInfo {
  proxy: ProxyRule;
  server: http.Server;
}

export async function serveCommand(): Promise<void> {
  const spinner = ora('Loading configuration...').start();

  try {
    const config = await loadConfig();

    if (config.proxies.length === 0) {
      spinner.stop();
      logger.info('No proxies configured. Use "hop add" to add one.');
      return;
    }

    spinner.text = 'Starting proxy servers...';

    const servers: ServerInfo[] = [];
    for (const proxy of config.proxies) {
      try {
        const server = await startProxy(proxy);
        servers.push({ proxy, server });
      } catch (error) {
        spinner.fail();
        if (error instanceof Error) {
          logger.error(`Failed to start proxy on port ${proxy.port}: ${error.message}`);
        }
        process.exit(1);
      }
    }

    spinner.succeed(chalk.green('Hop proxy server running!'));

    console.log();
    servers.forEach(({ proxy }) => {
      logger.proxy(proxy.port, proxy.target);
    });
    console.log();

    logger.info('Press Ctrl+C to stop');

    // Keep process alive
    process.on('SIGINT', () => {
      console.log();
      logger.info('Stopping proxy servers...');
      servers.forEach(({ server }) => {
        server.close();
      });
      logger.success('Proxy servers stopped');
      process.exit(0);
    });

    process.on('SIGTERM', () => {
      servers.forEach(({ server }) => {
        server.close();
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
