import blessed from 'blessed';
import { ManagerView } from './views/ManagerView';
import { ProxyManager } from '../core/ProxyManager';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

import { View } from './types';

export class App {
  private screen: blessed.Widgets.Screen;
  private currentView: View | null = null;
  private proxyManager: ProxyManager;

  constructor() {
    // Redirect console output to file to prevent TUI corruption
    const logFile = path.join(os.homedir(), '.hop', 'tui.log');
    try {
      if (!fs.existsSync(path.dirname(logFile))) {
        fs.mkdirSync(path.dirname(logFile), { recursive: true });
      }
      const logStream = fs.createWriteStream(logFile, { flags: 'a' });

      const log = (type: string, args: any[]) => {
        const msg = args.map(a =>
          (typeof a === 'object') ? JSON.stringify(a) : String(a)
        ).join(' ');
        logStream.write(`[${new Date().toISOString()}] [${type}] ${msg}\n`);
      };

      console.log = (...args) => log('INFO', args);
      console.info = (...args) => log('INFO', args);
      console.warn = (...args) => log('WARN', args);
      console.error = (...args) => log('ERROR', args);
    } catch (err) {
      // Fallback if logging fails
      const noop = () => {};
      console.log = noop;
      console.info = noop;
      console.warn = noop;
      console.error = noop;
    }

    this.screen = blessed.screen({
      smartCSR: true,
      title: 'Hop TUI',
      fullUnicode: true,
    });

    this.proxyManager = new ProxyManager();

    this.screen.key(['q', 'C-c'], () => {
      this.proxyManager.stopAll();

      // Proper cleanup sequence:
      // 1. Switch back to normal buffer (this clears the alternate screen)
      this.screen.program.normalBuffer();

      // 2. Show cursor
      this.screen.program.showCursor();

      // 3. Destroy screen
      this.screen.destroy();

      return process.exit(0);
    });
  }

  public start() {
    this.switchToManager();
    this.screen.render();
  }

  private async switchToManager() {
    if (this.currentView) {
      this.currentView.destroy();
    }
    this.currentView = new ManagerView(this.screen, this.proxyManager);
    if (this.currentView.init) {
      await this.currentView.init();
    }
  }
}
