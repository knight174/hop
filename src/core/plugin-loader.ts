import * as path from 'path';
import * as fs from 'fs-extra';
import { logger } from './logger';
import { HopPlugin } from '../types';

export async function loadPlugins(pluginPaths: string[]): Promise<HopPlugin[]> {
  const plugins: HopPlugin[] = [];

  for (const pluginPath of pluginPaths) {
    try {
      const absolutePath = path.resolve(process.cwd(), pluginPath);

      if (!(await fs.pathExists(absolutePath))) {
        logger.warn(`Plugin not found: ${pluginPath}`);
        continue;
      }

      // Dynamic import
      // Note: In a real-world scenario, we might want to sandbox this
      const pluginModule = await import(absolutePath);

      // Support both default export and named export 'plugin'
      const plugin = pluginModule.default || pluginModule.plugin;

      if (plugin) {
        plugins.push(plugin);
        logger.info(`Loaded plugin: ${path.basename(pluginPath)}`);
      } else {
        logger.warn(`Invalid plugin format: ${pluginPath}. Expected default export.`);
      }

    } catch (error) {
      if (error instanceof Error) {
        logger.error(`Failed to load plugin ${pluginPath}: ${error.message}`);
      }
    }
  }

  return plugins;
}
