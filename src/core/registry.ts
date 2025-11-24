import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { logger } from './logger';

export interface RegistryEntry {
  name: string;
  pid: number;
  port: number;
  startTime: number;
}

export class Registry {
  private registryPath: string;

  constructor() {
    const homeDir = os.homedir();
    const hopDir = path.join(homeDir, '.hop');
    const runDir = path.join(hopDir, 'run');

    if (!fs.existsSync(runDir)) {
      fs.mkdirSync(runDir, { recursive: true });
    }

    this.registryPath = path.join(runDir, 'registry.json');
  }

  private load(): RegistryEntry[] {
    try {
      if (fs.existsSync(this.registryPath)) {
        const data = fs.readFileSync(this.registryPath, 'utf-8');
        return JSON.parse(data);
      }
    } catch (error) {
      logger.error(`Failed to load registry: ${error}`);
    }
    return [];
  }

  private save(entries: RegistryEntry[]): void {
    try {
      fs.writeFileSync(this.registryPath, JSON.stringify(entries, null, 2));
    } catch (error) {
      logger.error(`Failed to save registry: ${error}`);
    }
  }

  public getRunningProxies(): RegistryEntry[] {
    const entries = this.load();
    const activeEntries: RegistryEntry[] = [];
    let changed = false;

    for (const entry of entries) {
      if (this.isProcessRunning(entry.pid)) {
        activeEntries.push(entry);
      } else {
        changed = true;
      }
    }

    if (changed) {
      this.save(activeEntries);
    }

    return activeEntries;
  }

  public register(name: string, pid: number, port: number): void {
    const entries = this.getRunningProxies();

    // Remove any existing entry for this name (shouldn't happen if checked before, but safety first)
    const filtered = entries.filter(e => e.name !== name);

    filtered.push({
      name,
      pid,
      port,
      startTime: Date.now()
    });

    this.save(filtered);
  }

  public unregister(name: string): void {
    const entries = this.load(); // Don't filter by running here, just remove by name
    const filtered = entries.filter(e => e.name !== name);
    this.save(filtered);
  }

  public isRunning(name: string): boolean {
    const entries = this.getRunningProxies();
    return entries.some(e => e.name === name);
  }

  public getEntry(name: string): RegistryEntry | undefined {
    const entries = this.getRunningProxies();
    return entries.find(e => e.name === name);
  }

  private isProcessRunning(pid: number): boolean {
    try {
      process.kill(pid, 0);
      return true;
    } catch (e) {
      return false;
    }
  }
}

export const registry = new Registry();
