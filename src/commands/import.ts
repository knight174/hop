import * as fs from 'fs-extra';
import { loadConfig, saveConfig, addProxy } from '../core/config';
import { logger } from '../core/logger';
import { ProxyRule } from '../types';
import inquirer from 'inquirer';
import chalk from 'chalk';

export async function importCommand(input: string): Promise<void> {
  try {
    let proxies: ProxyRule[] = [];

    // Try to read as file
    if (await fs.pathExists(input)) {
      const content = await fs.readFile(input, 'utf-8');
      try {
        proxies = JSON.parse(content);
      } catch {
        // Maybe it's a file containing base64?
        try {
          const decoded = Buffer.from(content.trim(), 'base64').toString('utf-8');
          proxies = JSON.parse(decoded);
        } catch {
          throw new Error('Invalid file content. Expected JSON or Base64.');
        }
      }
    } else {
      // Try to decode as base64 string
      try {
        const decoded = Buffer.from(input, 'base64').toString('utf-8');
        proxies = JSON.parse(decoded);
      } catch {
        // Maybe it's raw JSON string?
        try {
          proxies = JSON.parse(input);
        } catch {
          throw new Error('Invalid input. Expected file path, Base64 string, or JSON string.');
        }
      }
    }

    if (!Array.isArray(proxies)) {
      // Maybe it was a full config object?
      if ((proxies as any).proxies && Array.isArray((proxies as any).proxies)) {
        proxies = (proxies as any).proxies;
      } else {
        // Or single proxy object?
        if ((proxies as any).name && (proxies as any).target) {
          proxies = [proxies as any];
        } else {
           throw new Error('Invalid config format.');
        }
      }
    }

    if (proxies.length === 0) {
      logger.warn('No proxies found in input.');
      return;
    }

    const config = await loadConfig();
    let addedCount = 0;
    let updatedCount = 0;

    for (const proxy of proxies) {
      const existingIndex = config.proxies.findIndex(p => p.name === proxy.name);

      if (existingIndex !== -1) {
        const { overwrite } = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'overwrite',
            message: `Proxy "${proxy.name}" already exists. Overwrite?`,
            default: false
          }
        ]);

        if (overwrite) {
          config.proxies[existingIndex] = proxy;
          updatedCount++;
          logger.success(`Updated proxy: ${proxy.name}`);
        } else {
          logger.info(`Skipped proxy: ${proxy.name}`);
        }
      } else {
        config.proxies.push(proxy);
        addedCount++;
        logger.success(`Imported proxy: ${proxy.name}`);
      }
    }

    if (addedCount > 0 || updatedCount > 0) {
      await saveConfig(config);
      logger.success(`Import completed. Added: ${addedCount}, Updated: ${updatedCount}`);
    } else {
      logger.info('No changes made.');
    }

  } catch (error) {
    if (error instanceof Error) {
      logger.error(`Import failed: ${error.message}`);
    }
  }
}
