import inquirer from 'inquirer';
import { loadConfig, removeProxy } from '../core/config';
import { logger } from '../core/logger';

export async function removeCommand(): Promise<void> {
  try {
    const config = await loadConfig();

    if (config.proxies.length === 0) {
      logger.info('No proxies configured to remove.');
      return;
    }

    const choices = config.proxies.map(proxy => ({
      name: `${proxy.name} (port: ${proxy.port} → ${proxy.target})`,
      value: proxy.name
    }));

    const answer = await inquirer.prompt([
      {
        type: 'list',
        name: 'name',
        message: 'Select proxy to remove:',
        choices
      },
      {
        type: 'confirm',
        name: 'confirm',
        message: 'Are you sure you want to remove this proxy?',
        default: false
      }
    ]);

    if (!answer.confirm) {
      logger.info('Removal cancelled.');
      return;
    }

    await removeProxy(answer.name);
    logger.success(`Proxy removed: ${answer.name}`);
  } catch (error) {
    if (error instanceof Error) {
      logger.error(error.message);
    } else {
      logger.error('Failed to remove proxy');
    }
    process.exit(1);
  }
}
