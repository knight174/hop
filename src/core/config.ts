import * as fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';
import { HopConfig, ProxyRule } from '../types';

const CONFIG_DIR = path.join(os.homedir(), '.hop');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

const DEFAULT_CONFIG: HopConfig = {
  proxies: []
};

export async function ensureConfigDir(): Promise<void> {
  await fs.ensureDir(CONFIG_DIR);
}

export async function loadConfig(): Promise<HopConfig> {
  try {
    await ensureConfigDir();

    if (!(await fs.pathExists(CONFIG_FILE))) {
      await fs.writeJson(CONFIG_FILE, DEFAULT_CONFIG, { spaces: 2 });
      return DEFAULT_CONFIG;
    }

    const config = await fs.readJson(CONFIG_FILE);
    return config;
  } catch (error) {
    throw new Error(`Failed to load config: ${error}`);
  }
}

export async function saveConfig(config: HopConfig): Promise<void> {
  try {
    await ensureConfigDir();
    await fs.writeJson(CONFIG_FILE, config, { spaces: 2 });
  } catch (error) {
    throw new Error(`Failed to save config: ${error}`);
  }
}

export async function addProxy(proxy: ProxyRule): Promise<void> {
  const config = await loadConfig();

  // Check if port already exists
  const existingIndex = config.proxies.findIndex(p => p.port === proxy.port);
  if (existingIndex !== -1) {
    throw new Error(`Port ${proxy.port} is already configured`);
  }

  config.proxies.push(proxy);
  await saveConfig(config);
}

export async function removeProxy(port: number): Promise<void> {
  const config = await loadConfig();
  const initialLength = config.proxies.length;

  config.proxies = config.proxies.filter(p => p.port !== port);

  if (config.proxies.length === initialLength) {
    throw new Error(`No proxy found for port ${port}`);
  }

  await saveConfig(config);
}

export async function getProxy(port: number): Promise<ProxyRule | undefined> {
  const config = await loadConfig();
  return config.proxies.find(p => p.port === port);
}

export function getConfigPath(): string {
  return CONFIG_FILE;
}
