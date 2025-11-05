import Table from 'cli-table3';
import { loadConfig } from '../core/config';
import { logger } from '../core/logger';

export async function listCommand(): Promise<void> {
  try {
    const config = await loadConfig();

    if (config.proxies.length === 0) {
      logger.info('No proxies configured yet. Use "hop add" to add one.');
      return;
    }

    const table = new Table({
      head: ['Port', 'Target', 'Headers'],
      colWidths: [10, 40, 30]
    });

    config.proxies.forEach(proxy => {
      const headersStr = proxy.headers
        ? Object.keys(proxy.headers).join(', ')
        : '-';

      table.push([
        proxy.port.toString(),
        proxy.target,
        headersStr
      ]);
    });

    console.log(table.toString());
  } catch (error) {
    if (error instanceof Error) {
      logger.error(error.message);
    } else {
      logger.error('Failed to list proxies');
    }
    process.exit(1);
  }
}
