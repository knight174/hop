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
      head: ['Name', 'Port', 'Target', 'Paths', 'Headers'],
      colWidths: [20, 10, 35, 25, 20]
    });

    config.proxies.forEach(proxy => {
      const pathsStr = proxy.paths && proxy.paths.length > 0
        ? proxy.paths.join(', ')
        : '(all)';

      const headersStr = proxy.headers
        ? Object.keys(proxy.headers).join(', ')
        : '-';

      table.push([
        proxy.name,
        proxy.port.toString(),
        proxy.target,
        pathsStr,
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
