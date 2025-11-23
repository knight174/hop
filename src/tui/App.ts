import blessed from 'blessed';
import { ManagerView } from './views/ManagerView';
import { ProxyManager } from '../core/ProxyManager';

export class App {
  private screen: blessed.Widgets.Screen;
  private currentView: any; // TODO: Define a View interface
  private proxyManager: ProxyManager;

  constructor() {
    // Suppress console output to prevent TUI corruption
    // We do this before creating the screen
    const noop = () => {};
    console.log = noop;
    console.info = noop;
    console.warn = noop;
    console.error = noop;

    this.screen = blessed.screen({
      smartCSR: true,
      title: 'Hop TUI',
      fullUnicode: true,
    });

    this.proxyManager = new ProxyManager();

    this.screen.key(['q', 'C-c'], () => {
      this.proxyManager.stopAll();
      return process.exit(0);
    });
  }

  public start() {
    this.switchToManager();
    this.screen.render();
  }

  private async switchToManager() {
    if (this.currentView) {
      // this.currentView.destroy(); // TODO: Implement destroy
    }
    this.currentView = new ManagerView(this.screen, this.proxyManager);
    await this.currentView.init();
  }
}
