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
      try {
        const server = await startProxy(proxy);
        servers.push({ proxy, server });
      } catch (error) {
        spinner.fail();
        if (error instanceof Error) {
          logger.error(`Failed to start proxy ${proxy.name} on port ${proxy.port}: ${error.message}`);
        }
        process.exit(1);
      }
    }

    spinner.succeed(chalk.green('Hop proxy server running!'));

    console.log();
    servers.forEach(({ proxy }) => {
      const pathsInfo = proxy.paths && proxy.paths.length > 0
        ? ` (paths: ${proxy.paths.join(', ')})`
        : '';
      console.log(chalk.green('✓') + ` Started ${chalk.cyan(proxy.name)} on port ${chalk.yellow(proxy.port)} → ${chalk.blue(proxy.target)}${pathsInfo}`);
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
