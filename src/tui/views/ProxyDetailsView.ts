import blessed from 'blessed';
import { ProxyRule } from '../../core/config';
import { ProxyManager } from '../../core/ProxyManager';

export class ProxyDetailsView {
  private screen: blessed.Widgets.Screen;
  private box: blessed.Widgets.BoxElement;
  private proxy: ProxyRule | null = null;
  private proxyManager: ProxyManager;
  private onBack: () => void;
  private onEdit: () => void;
  private onToggle: () => void;
  private footer: blessed.Widgets.BoxElement;

  constructor(
    screen: blessed.Widgets.Screen,
    proxyManager: ProxyManager,
    onBack: () => void,
    onEdit: () => void,
    onToggle: () => void
  ) {
    this.screen = screen;
    this.proxyManager = proxyManager;
    this.onBack = onBack;
    this.onEdit = onEdit;
    this.onToggle = onToggle;

    this.box = blessed.box({
      parent: this.screen,
      top: 0,
      left: 0,
      width: '100%',
      height: '100%-1',
      hidden: true,
      label: ' Proxy Details ',
      border: { type: 'line' },
      tags: true,
      scrollable: true,
      alwaysScroll: true,
      keys: true,
      vi: true,
      mouse: true,
    });

    this.footer = blessed.box({
      parent: this.screen,
      top: '100%-1',
      left: 0,
      width: '100%',
      height: 1,
      hidden: true,
      content: ' Keys: e: Edit (Config) | s: Start/Stop | Esc/Backspace: Back',
      style: {
        fg: 'white',
        bg: 'blue'
      }
    });

    // Keybindings
    // We bind to the screen but check visibility, or we can bind to the box if we focus it.
    // Binding to box is safer for "local" keys.

    this.box.key(['escape', 'backspace'], () => {
        this.onBack();
    });

    this.box.key(['e'], () => {
        this.onEdit();
    });

    this.box.key(['s'], () => {
        this.onToggle();
    });
  }

  public setProxy(proxy: ProxyRule) {
    this.proxy = proxy;
    this.render();
  }

  public render() {
    if (!this.proxy) return;

    const isRunning = this.proxyManager.isRunning(this.proxy.name);
    const statusColor = isRunning ? '{green-fg}' : '{red-fg}';
    const statusText = isRunning ? 'Running' : 'Stopped';

    const content = `
{bold}Name:{/bold} ${this.proxy.name}
{bold}Port:{/bold} ${this.proxy.port}
{bold}Target:{/bold} ${this.proxy.target}
{bold}HTTPS:{/bold} ${this.proxy.https ? 'Yes' : 'No'}
{bold}Status:{/bold} ${statusColor}${statusText}{/}

{bold}Paths:{/bold}
${this.proxy.paths?.map(p => `  - ${p}`).join('\n') || '  (All)'}

{bold}Headers:{/bold}
${this.proxy.headers ? JSON.stringify(this.proxy.headers, null, 2) : '  (None)'}
    `;

    this.box.setContent(content);
    this.screen.render();
  }

  public show() {
    this.box.show();
    this.footer.show();
    this.box.focus();
    this.screen.render();
  }

  public hide() {
    this.box.hide();
    this.footer.hide();
  }

  public isVisible(): boolean {
      return !this.box.hidden;
  }
}
