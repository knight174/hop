
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

  constructor(screen: blessed.Widgets.Screen, proxyManager: ProxyManager) {
    this.screen = screen;
    this.proxyManager = proxyManager;

    // Initialize Views
    this.listView = new ProxyListView(
        this.screen,
        this.proxyManager,
        (index) => this.showDetails(index),
        () => this.showAddProxyForm(),
        (index) => this.deleteProxy(index)
    );

    this.detailsView = new ProxyDetailsView(
        this.screen,
        this.proxyManager,
        () => this.showList(),
        () => this.showEditProxyForm(),
        () => this.toggleProxy()
    );

    // Initial Load
    this.init();
  }

  private async init() {
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

  private async toggleProxy() {
    if (this.selectedProxyIndex < 0) return;
    const proxy = this.proxies[this.selectedProxyIndex];

    if (this.proxyManager.isRunning(proxy.name)) {
      this.proxyManager.stop(proxy.name);
    } else {
      try {
        await this.proxyManager.start(proxy);
      } catch (error) {
        // TODO: Show error
      }
    }

    // Refresh current view
    this.detailsView.render();
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
        } catch (error) {
          // TODO: Show error
        }
      },
      () => {
        // User cancelled - do nothing
        this.listView.show();
      }
    );
  }

  private async showAddProxyForm() {
    try {
      const { openConfigInEditor } = await import('../utils/editor');
      await openConfigInEditor(this.screen);
      // Reload config after editing
      await this.init();
      this.showList();
    } catch (error) {
      // TODO: Show error message
      this.showList();
    }
  }

  private async showEditProxyForm() {
    try {
      const { openConfigInEditor } = await import('../utils/editor');
      await openConfigInEditor(this.screen);
      // Reload config after editing
      await this.init();
      // Try to return to details view if proxy still exists
      if (this.selectedProxyIndex >= 0 && this.selectedProxyIndex < this.proxies.length) {
        this.showDetails(this.selectedProxyIndex);
      } else {
        this.showList();
      }
    } catch (error) {
      // TODO: Show error message
      if (this.selectedProxyIndex >= 0) {
        this.showDetails(this.selectedProxyIndex);
      } else {
        this.showList();
      }
    }
  }
}
