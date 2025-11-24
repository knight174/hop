import blessed from 'blessed';
import { ProxyRule } from '../../core/config';
import { ProxyManager } from '../../core/ProxyManager';
import { formatProxyStatus } from '../utils/formatting';

export class ProxyListView {
  private screen: blessed.Widgets.Screen;
  private list: blessed.Widgets.ListElement;
  private proxies: ProxyRule[] = [];
  private proxyManager: ProxyManager;
  private onSelect: (index: number) => void;
  private onAdd: () => void;
  private onDelete: (index: number) => void;
  private onToggle: (index: number) => void;
  private footer: blessed.Widgets.BoxElement;

  constructor(
    screen: blessed.Widgets.Screen,
    proxyManager: ProxyManager,
    onSelect: (index: number) => void,
    onAdd: () => void,
    onDelete: (index: number) => void,
    onToggle: (index: number) => void
  ) {
    this.screen = screen;
    this.proxyManager = proxyManager;
    this.onSelect = onSelect;
    this.onAdd = onAdd;
    this.onDelete = onDelete;
    this.onToggle = onToggle;

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
      content: ' Keys: ↑/↓: Navigate | Enter: Details | e: Edit | a: Add | d: Delete | s: Start/Stop | q: Quit',
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

    this.list.key(['e'], () => {
        if (!this.list.hidden) {
            const index = (this.list as any).selected;
            if (index >= 0 && index < this.proxies.length) {
                // Trigger edit directly
                const { openConfigInEditor } = require('../utils/editor');
                openConfigInEditor(this.screen).then(() => {
                    // Reload config after editing
                    const { loadConfig } = require('../../core/config');
                    loadConfig().then((config: any) => {
                        this.update(config.proxies);
                    });
                }).catch(() => {
                    // Error handling - just refresh
                });
            }
        }
    });

    this.list.key(['d'], () => {
        if (!this.list.hidden) {
            const index = (this.list as any).selected;
            if (index >= 0 && index < this.proxies.length) {
                this.onDelete(index);
            }
        }
    });

    this.list.key(['s'], () => {
        if (!this.list.hidden) {
            const index = (this.list as any).selected;
            if (index >= 0 && index < this.proxies.length) {
                this.onToggle(index);
            }
        }
    });
  }

  public update(proxies: ProxyRule[]) {
    this.proxies = proxies;

    if (proxies.length === 0) {
      this.list.setItems(['No proxies configured. Press "a" to add one.']);
      this.screen.render();
      return;
    }

    // Calculate max widths
    const maxNameLen = Math.max(4, ...proxies.map(p => p.name.length));
    const maxPortLen = Math.max(4, ...proxies.map(p => String(p.port).length));
    const maxTargetLen = Math.max(6, ...proxies.map(p => p.target.length));

    const items = proxies.map(p => {
        const status = formatProxyStatus(p, this.proxyManager);

        const name = p.name.padEnd(maxNameLen + 4);
        const port = String(p.port).padEnd(maxPortLen + 4);
        const target = p.target.padEnd(maxTargetLen + 4);
        return `${name}${port}${target}${status}`;
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

  public destroy() {
    this.list.destroy();
    this.footer.destroy();
  }
}
