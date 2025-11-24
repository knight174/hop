import * as http from 'http';
import * as https from 'https';
import * as httpProxy from 'http-proxy';
import { EventEmitter } from 'events';
import { ProxyRule } from '../types';
import { logger } from './logger';
import { startProxy } from './proxy';
import { registry } from './registry';

export class ProxyManager extends EventEmitter {
  private servers: Map<string, http.Server | https.Server> = new Map();
  private proxies: Map<string, any> = new Map();

  constructor() {
    super();
  }

  public async start(rule: ProxyRule): Promise<void> {
    // Check if running locally
    if (this.servers.has(rule.name)) {
      logger.warn(`Proxy ${rule.name} is already running locally`);
      return;
    }

    // Check if running externally via registry
    if (registry.isRunning(rule.name)) {
      const entry = registry.getEntry(rule.name);
      // Double check if it's actually this process (should have been caught by local check, but just in case)
      if (entry && entry.pid !== process.pid) {
        throw new Error(`Proxy ${rule.name} is already running in another process (PID: ${entry.pid})`);
      }
    }

    try {
      const { server, proxy } = await startProxy(rule);

      this.servers.set(rule.name, server);
      this.proxies.set(rule.name, proxy);

      // Register in registry
      registry.register(rule.name, process.pid, rule.port);

      logger.info(`Proxy ${rule.name} started on port ${rule.port} -> ${rule.target}`);
      this.emit('start', rule.name);
    } catch (error: any) {
      logger.error(`Failed to start proxy ${rule.name}: ${error.message}`);
      throw error;
    }
  }

  public stop(name: string): void {
    const server = this.servers.get(name);
    const proxy = this.proxies.get(name);

    // Stop local server if exists
    if (server) {
      server.close();
      this.servers.delete(name);
    }

    if (proxy) {
      proxy.close();
      this.proxies.delete(name);
    }

    // Check registry for external process
    const entry = registry.getEntry(name);
    if (entry) {
      if (entry.pid === process.pid) {
        // It was us, just unregister
        registry.unregister(name);
      } else {
        // It's an external process, try to kill it
        try {
          process.kill(entry.pid, 'SIGTERM');
          logger.info(`Sent SIGTERM to external proxy ${name} (PID: ${entry.pid})`);
          // Give it a moment to clean up, but we can unregister it from our view
          // Ideally the process itself unregisters, but we can force it if needed
          // For now, let's assume the process handles its own cleanup via signal handlers
          // But we can optimistically unregister if we want to be aggressive
          // Let's wait a bit and check? No, let's just unregister it from registry to free the name
          // The external process should handle its own shutdown
          registry.unregister(name);
        } catch (e: any) {
          logger.error(`Failed to stop external proxy ${name}: ${e.message}`);
          // If process doesn't exist, unregister it
          if (e.code === 'ESRCH') {
            registry.unregister(name);
          }
        }
      }
    }



    logger.info(`Proxy ${name} stopped`);
    this.emit('stop', name);
  }

  public isRunning(name: string): boolean {
    // Check local
    if (this.servers.has(name)) return true;

    // Check registry
    return registry.isRunning(name);
  }

  public isRunningLocally(name: string): boolean {
    return this.servers.has(name);
  }

  public stopAll(): void {
    // Stop all local servers
    for (const name of this.servers.keys()) {
      this.stop(name);
    }

    // We don't automatically stop external processes on stopAll() unless explicitly requested
    // usually stopAll is called on exit.
    // But if we want to be clean, we should unregister everything we own.
    // The loop above calls stop() which handles unregistering.
  }
}
