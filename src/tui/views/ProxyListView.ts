import blessed from 'blessed';
import { ProxyRule } from '../../core/config';
import { ProxyManager } from '../../core/ProxyManager';

export class ProxyListView {
  private screen: blessed.Widgets.Screen;
  private list: blessed.Widgets.ListElement;
  private proxies: ProxyRule[] = [];
  private proxyManager: ProxyManager;
  private onSelect: (index: number) => void;
  private onAdd: () => void;
  private onDelete: (index: number) => void;
  private footer: blessed.Widgets.BoxElement;

  constructor(
    screen: blessed.Widgets.Screen,
    proxyManager: ProxyManager,
    onSelect: (index: number) => void,
    onAdd: () => void,
    onDelete: (index: number) => void
  ) {
    this.screen = screen;
    this.proxyManager = proxyManager;
    this.onSelect = onSelect;
    this.onAdd = onAdd;
    this.onDelete = onDelete;

    this.list = blessed.list({
      parent: this.screen,
      top: 0,
      left: 0,
      width: '100%',
      height: '100%-1',
      keys: true,
      vi: true,
      mouse: true,
      style: {
        selected: { bg: 'blue', fg: 'white' },
        item: { fg: 'white' }
      },
      label: ' Proxies ',
      border: { type: 'line' },
      tags: true,
    });

    this.footer = blessed.box({
      parent: this.screen,
      top: '100%-1',
      left: 0,
      width: '100%',
      height: 1,
      content: ' Keys: ↑/↓: Navigate | Enter: Details | a: Add | d: Delete | s: Start/Stop | q: Quit',
      style: {
        fg: 'white',
        bg: 'blue'
      }
    });

    this.list.on('select', (item, index) => {
      this.onSelect(index);
    });

    // Keybindings specific to List View
    this.list.key(['a'], () => {
        if (!this.list.hidden) this.onAdd();
    });

    this.list.key(['d'], () => {
        if (!this.list.hidden) {
            const index = (this.list as any).selected;
            if (index >= 0 && index < this.proxies.length) {
                this.onDelete(index);
            }
        }
    });

    this.list.key(['s'], async () => {
        if (!this.list.hidden) {
            const index = (this.list as any).selected;
            if (index >= 0 && index < this.proxies.length) {
                const proxy = this.proxies[index];
                if (this.proxyManager.isRunning(proxy.name)) {
                    this.proxyManager.stop(proxy.name);
                } else {
                    try {
                        await this.proxyManager.start(proxy);
                    } catch (err) {
                        // TODO: Show error
                    }
                }
                this.update(this.proxies); // Refresh list to show new status
            }
        }
    });
  }

  public update(proxies: ProxyRule[]) {
    this.proxies = proxies;
    const items = proxies.map(p => {
        const isRunning = this.proxyManager.isRunning(p.name);
        const status = isRunning ? '{green-fg}Running{/}' : '{red-fg}Stopped{/}';
        // Simple column alignment
        const name = p.name.padEnd(20);
        const port = String(p.port).padEnd(8);
        const target = p.target.padEnd(30);
        return `${name} ${port} ${target} ${status}`;
    });
    this.list.setItems(items);
    this.screen.render();
  }

  public show() {
    this.list.show();
    this.footer.show();
    this.list.focus();
    this.screen.render();
  }

  public hide() {
    this.list.hide();
    this.footer.hide();
  }

  public isVisible(): boolean {
      return !this.list.hidden;
  }
}
