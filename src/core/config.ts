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

  // Check if name already exists
  const existingByName = config.proxies.findIndex(p => p.name === proxy.name);
  if (existingByName !== -1) {
    throw new Error(`Proxy name "${proxy.name}" is already configured`);
  }

  // Check if port already exists
  const existingByPort = config.proxies.findIndex(p => p.port === proxy.port);
  if (existingByPort !== -1) {
    throw new Error(`Port ${proxy.port} is already configured`);
  }

  config.proxies.push(proxy);
  await saveConfig(config);
}

export async function removeProxy(nameOrPort: string | number): Promise<void> {
  const config = await loadConfig();
  const initialLength = config.proxies.length;

  if (typeof nameOrPort === 'string') {
    config.proxies = config.proxies.filter(p => p.name !== nameOrPort);
  } else {
    config.proxies = config.proxies.filter(p => p.port !== nameOrPort);
  }

  if (config.proxies.length === initialLength) {
    throw new Error(`No proxy found: ${nameOrPort}`);
  }

  await saveConfig(config);
}

export async function getProxy(nameOrPort: string | number): Promise<ProxyRule | undefined> {
  const config = await loadConfig();
  if (typeof nameOrPort === 'string') {
    return config.proxies.find(p => p.name === nameOrPort);
  } else {
    return config.proxies.find(p => p.port === nameOrPort);
  }
}

export function getConfigPath(): string {
  return CONFIG_FILE;
}
