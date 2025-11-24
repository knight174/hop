
import blessed from 'blessed';
import { ProxyManager } from '../../core/ProxyManager';
import { ProxyRule, loadConfig, removeProxy } from '../../core/config';
import { ProxyListView } from './ProxyListView';
import { ProxyDetailsView } from './ProxyDetailsView';

export class ManagerView {
  private screen: blessed.Widgets.Screen;
  private proxyManager: ProxyManager;
  private proxies: ProxyRule[] = [];

  // Views
  private listView: ProxyListView;
  private detailsView: ProxyDetailsView;

  // State
  private currentView: 'list' | 'details' = 'list';
  private selectedProxyIndex: number = -1;
  private refreshTimer: NodeJS.Timeout | null = null;

  constructor(screen: blessed.Widgets.Screen, proxyManager: ProxyManager) {
    this.screen = screen;
    this.proxyManager = proxyManager;

    // Initialize Views
    this.listView = new ProxyListView(
        this.screen,
        this.proxyManager,
        (index) => this.showDetails(index),
        () => this.showAddProxyForm(),
        (index) => this.deleteProxy(index),
        (index) => this.toggleProxy(index)
    );

    this.detailsView = new ProxyDetailsView(
        this.screen,
        this.proxyManager,
        () => this.showList(),
        () => this.showEditProxyForm(),
        () => this.toggleProxy(this.selectedProxyIndex)
    );

    // Initial Load
    this.init();

    // Start auto-refresh timer (every 5 seconds)
    this.startRefreshTimer();

    // Subscribe to events
    this.proxyManager.on('start', () => this.refreshCurrentView());
    this.proxyManager.on('stop', () => this.refreshCurrentView());
  }

  public async init() {
    const config = await loadConfig();
    this.proxies = config.proxies;
    this.listView.update(this.proxies);

    // Restore view state if needed, for now default to list
    if (this.currentView === 'list') {
        this.showList();
    } else if (this.currentView === 'details' && this.selectedProxyIndex >= 0) {
        this.showDetails(this.selectedProxyIndex);
    }
  }

  private startRefreshTimer() {
    this.refreshTimer = setInterval(() => {
      this.refreshCurrentView();
    }, 5000); // Refresh every 5 seconds for external changes
  }

  private refreshCurrentView() {
    // Refresh the current view to update status
    if (this.currentView === 'list') {
      this.listView.update(this.proxies);
    } else if (this.currentView === 'details' && this.selectedProxyIndex >= 0) {
      this.detailsView.render();
    }
  }

  private stopRefreshTimer() {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }
  }

  private showList() {
    this.currentView = 'list';
    this.detailsView.hide();
    this.listView.show();
    this.listView.update(this.proxies);
  }

  private showDetails(index: number) {
    if (index < 0 || index >= this.proxies.length) return;

    this.selectedProxyIndex = index;
    this.currentView = 'details';

    this.listView.hide();
    this.detailsView.setProxy(this.proxies[index]);
    this.detailsView.show();
  }

  private async toggleProxy(index: number) {
    if (index < 0 || index >= this.proxies.length) return;
    const proxy = this.proxies[index];

    if (this.proxyManager.isRunning(proxy.name)) {
      this.proxyManager.stop(proxy.name);
    } else {
      try {
        await this.proxyManager.start(proxy);
      } catch (error: any) {
        this.showError('Start Failed', error.message || String(error));
      }
    }

    // Refresh current view
    if (this.currentView === 'details') {
      this.detailsView.render();
    } else {
      this.listView.update(this.proxies);
    }
  }

  private async deleteProxy(index: number) {
    const proxy = this.proxies[index];

    // Show confirmation dialog
    const { showConfirmDialog } = await import('../components/ConfirmDialog');

    showConfirmDialog(
      this.screen,
      `Delete proxy "${proxy.name}" (port ${proxy.port})?`,
      async () => {
        // User confirmed - proceed with deletion
        // Stop if running
        if (this.proxyManager.isRunning(proxy.name)) {
          this.proxyManager.stop(proxy.name);
        }

        try {
          await removeProxy(proxy.name);
          await this.init(); // Reloads config and updates list
        } catch (error: any) {
          this.showError('Delete Failed', error.message || String(error));
        }
      },
      () => {
        // User cancelled - do nothing
        this.listView.show();
      }
    );
  }

  private async showAddProxyForm() {
    await this.handleConfigEdit(() => {
      this.showList();
    });
  }

  private async showEditProxyForm() {
    await this.handleConfigEdit(() => {
      // Try to return to details view if proxy still exists
      if (this.selectedProxyIndex >= 0 && this.selectedProxyIndex < this.proxies.length) {
        this.showDetails(this.selectedProxyIndex);
      } else {
        this.showList();
      }
    });
  }

  private async handleConfigEdit(onSuccess: () => void) {
    try {
      const { openConfigInEditor } = await import('../utils/editor');
      await openConfigInEditor(this.screen);
      // Reload config after editing
      await this.init();
      onSuccess();
    } catch (error: any) {
      this.showError('Editor Error', error.message || String(error));
      // Always return to list on error to be safe
      this.showList();
    }
  }

  private async showError(title: string, message: string) {
    const { showMessageDialog } = await import('../components/MessageDialog');
    showMessageDialog(this.screen, title, message, () => {
      // Ensure we focus back on something appropriate
      if (this.currentView === 'list') {
        this.listView.show();
      } else {
        this.detailsView.show();
      }
    });
  }
  public destroy() {
    this.stopRefreshTimer();
    this.proxyManager.removeAllListeners('start');
    this.proxyManager.removeAllListeners('stop');
    this.listView.destroy();
    this.detailsView.destroy();
  }
}
