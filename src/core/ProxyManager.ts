import * as http from 'http';
import * as https from 'https';
import * as httpProxy from 'http-proxy';
import { ProxyRule } from '../types';
import { logger } from './logger';
import { startProxy } from './proxy';

export class ProxyManager {
  private servers: Map<string, http.Server | https.Server> = new Map();
  private proxies: Map<string, any> = new Map();

  constructor() {}

  public async start(rule: ProxyRule): Promise<void> {
    if (this.servers.has(rule.name)) {
      logger.warn(`Proxy ${rule.name} is already running`);
      return;
    }

    try {
      const { server, proxy } = await startProxy(rule);

      this.servers.set(rule.name, server);
      this.proxies.set(rule.name, proxy);

      logger.info(`Proxy ${rule.name} started on port ${rule.port} -> ${rule.target}`);
    } catch (error: any) {
      logger.error(`Failed to start proxy ${rule.name}: ${error.message}`);
      throw error;
    }
  }

  public stop(name: string): void {
    const server = this.servers.get(name);
    const proxy = this.proxies.get(name);

    if (server) {
      server.close();
      this.servers.delete(name);
    }

    if (proxy) {
      proxy.close();
      this.proxies.delete(name);
    }

    logger.info(`Proxy ${name} stopped`);
  }

  public isRunning(name: string): boolean {
    return this.servers.has(name);
  }

  public stopAll(): void {
    for (const name of this.servers.keys()) {
      this.stop(name);
    }
  }
}
