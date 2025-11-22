import { loadConfig } from '../core/config';
import { logger } from '../core/logger';
import chalk from 'chalk';

export async function exportCommand(name?: string): Promise<void> {
  try {
    const config = await loadConfig();

    if (config.proxies.length === 0) {
      logger.error('No proxies configured to export.');
      return;
    }

    let proxiesToExport = config.proxies;
    if (name) {
      const proxy = config.proxies.find(p => p.name === name);
      if (!proxy) {
        logger.error(`Proxy "${name}" not found.`);
        return;
      }
      proxiesToExport = [proxy];
    }

    const exportData = JSON.stringify(proxiesToExport);
    const base64Data = Buffer.from(exportData).toString('base64');

    console.log(chalk.bold('\nExported Configuration (Base64):'));
    console.log(chalk.cyan(base64Data));
    console.log(chalk.gray('\nCopy the string above and use "hop import <string>" to import it.\n'));

    // Also show JSON for readability
    if (process.stdout.isTTY) {
      console.log(chalk.bold('JSON Preview:'));
      console.log(JSON.stringify(proxiesToExport, null, 2));
    }

  } catch (error) {
    if (error instanceof Error) {
      logger.error(`Export failed: ${error.message}`);
    }
  }
}
