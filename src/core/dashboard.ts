import blessed from 'blessed';
import contrib from 'blessed-contrib';
import chalk from 'chalk';
import { IncomingMessage, ServerResponse } from 'http';

export interface DashboardRequest {
  id: string;
  method: string;
  path: string;
  statusCode?: number;
  duration?: number;
  startTime: number;
  reqHeaders: Record<string, any>;
  resHeaders?: Record<string, any>;
}

export class Dashboard {
  private screen: blessed.Widgets.Screen;
  private grid: contrib.grid;
  private requestTable: contrib.Widgets.Table;
  private detailsBox: blessed.Widgets.BoxElement;
  private logBox: blessed.Widgets.Log;
  private footer: blessed.Widgets.BoxElement;
  private requests: DashboardRequest[] = [];
  private selectedRequestIndex: number = -1;
  private autoScroll: boolean = true;

  constructor() {
    this.screen = blessed.screen({
      smartCSR: true,
      title: 'Hop Dashboard'
    });

    this.grid = new contrib.grid({ rows: 12, cols: 12, screen: this.screen });

    // Left Panel: Request List
    this.requestTable = this.grid.set(0, 0, 11, 6, contrib.table, {
      keys: true,
      fg: 'white',
      selectedFg: 'white',
      selectedBg: 'blue',
      interactive: true,
      label: 'Requests',
      width: '50%',
      height: '100%',
      border: { type: 'line' },
      columnSpacing: 2,
      columnWidth: [8, 50, 8, 10] // Method, Path, Status, Duration
    });

    // Right Panel: Details (Top half)
    this.detailsBox = this.grid.set(0, 6, 7, 6, blessed.box, {
      label: 'Details',
      content: 'Select a request to view details',
      border: { type: 'line' },
      scrollable: true,
      alwaysScroll: true,
      scrollbar: {
        ch: ' ',
        inverse: true
      },
      keys: true,
      mouse: true,
      tags: true
    });

    // Right Panel: Logs (Bottom half)
    this.logBox = this.grid.set(7, 6, 4, 6, blessed.log, {
      label: 'System Logs',
      border: { type: 'line' },
      scrollable: true,
      alwaysScroll: true,
      scrollbar: {
        ch: ' ',
        inverse: true
      },
      keys: true,
      mouse: true,
      tags: true
    });

    // Footer: Help
    this.footer = this.grid.set(11, 0, 1, 12, blessed.box, {
      content: ' Keys: ↑/↓: Navigate | Enter: View Details | Tab: Switch Panel | f: Auto-Scroll (On) | q/Ctrl+C: Exit',
      style: { fg: 'white', bg: 'blue' },
      border: false
    });

    this.setupEvents();
    this.screen.render();
  }

  private setupEvents(): void {
    // Quit on q or Control-C.
    this.screen.key(['q', 'C-c'], () => {
      return process.exit(0);
    });

    // Toggle Auto-Scroll
    this.screen.key(['f'], () => {
      this.autoScroll = !this.autoScroll;
      this.footer.setContent(` Keys: ↑/↓: Navigate | Enter: View Details | Tab: Switch Panel | f: Auto-Scroll (${this.autoScroll ? 'On' : 'Off'}) | q/Ctrl+C: Exit`);
      this.screen.render();
    });

    // Handle table selection
    this.requestTable.rows.on('select', (_item: any, index: number) => {
      this.selectedRequestIndex = index;
      // If user manually selects something other than top, disable auto-scroll momentarily?
      // Or just let them toggle it. Let's keep it simple: manual selection doesn't disable it,
      // but next incoming request will jump back to top if Auto-Scroll is On.
      // A smarter way: if user selects index > 0, maybe pause auto-scroll?
      // For now, explicit toggle is clearer.
      this.updateDetails();
      this.screen.render();
    });

    // Handle resize
    this.screen.on('resize', () => {
      this.refreshTable();
      this.screen.render();
    });

    // Focus handling
    const focusable = [this.requestTable, this.detailsBox, this.logBox];
    let focusIndex = 0;

    const updateFocus = () => {
      focusable.forEach((el, i) => {
        if (i === focusIndex) {
          el.focus();
          // Highlight active panel border
          if ((el as any).style && (el as any).style.border) {
            (el as any).style.border.fg = 'magenta';
          }
        } else {
          // Reset inactive panel border
          if ((el as any).style && (el as any).style.border) {
            (el as any).style.border.fg = 'white';
          }
        }
      });
      this.screen.render();
    };

    // Tab to cycle focus
    this.screen.key(['tab'], () => {
      focusIndex = (focusIndex + 1) % focusable.length;
      updateFocus();
    });

    // Initial focus
    updateFocus();
  }

  private updateDetails(): void {
    if (this.selectedRequestIndex === -1 || !this.requests[this.selectedRequestIndex]) {
      this.detailsBox.setContent('Select a request to view details');
      return;
    }

    const req = this.requests[this.selectedRequestIndex];
    const content = [
      `{bold}Request:{/bold}`,
      `Method: ${req.method}`,
      `Path: ${req.path}`,
      `Time: ${new Date(req.startTime).toLocaleTimeString()}`,
      '',
      `{bold}Headers:{/bold}`,
      JSON.stringify(req.reqHeaders, null, 2),
      '',
      '-'.repeat(40),
      '',
      `{bold}Response:{/bold}`,
      `Status: ${req.statusCode || 'Pending...'}`,
      `Duration: ${req.duration ? req.duration + 'ms' : '...'}`,
      '',
      `{bold}Headers:{/bold}`,
      req.resHeaders ? JSON.stringify(req.resHeaders, null, 2) : 'Pending...'
    ].join('\n');

    this.detailsBox.setContent(content);
  }

  public addRequest(req: DashboardRequest): void {
    this.requests.unshift(req); // Add to top
    // Keep only last 100 requests
    if (this.requests.length > 100) {
      this.requests.pop();
    }
    this.refreshTable();

    if (this.autoScroll) {
      // Select the first item (newest)
      this.requestTable.rows.select(0);
      this.selectedRequestIndex = 0;
      this.updateDetails();
      this.screen.render();
    }
  }

  public updateRequest(id: string, updates: Partial<DashboardRequest>): void {
    const index = this.requests.findIndex(r => r.id === id);
    if (index !== -1) {
      this.requests[index] = { ...this.requests[index], ...updates };
      this.refreshTable();

      // If currently selected, update details view
      if (index === this.selectedRequestIndex) {
        this.updateDetails();
      }
    }
  }

  public log(message: string): void {
    if (this.logBox) {
      this.logBox.log(message);
      this.screen.render();
    }
  }

  private refreshTable(): void {
    const width = this.screen.width as number;
    const isCompact = width < 100;

    // Update column widths dynamically
    if (isCompact) {
       this.requestTable.options.columnWidth = [8, width - 20]; // Method, Path (rest)
    } else {
       this.requestTable.options.columnWidth = [8, 50, 8, 10]; // Method, Path, Status, Duration
    }

    const data = this.requests.map(r => {
      let method = r.method;
      switch (method) {
        case 'GET': method = chalk.green(method); break;
        case 'POST': method = chalk.yellow(method); break;
        case 'PUT': method = chalk.blue(method); break;
        case 'DELETE': method = chalk.red(method); break;
        case 'PATCH': method = chalk.magenta(method); break;
        case 'OPTIONS': method = chalk.gray(method); break;
        case 'HEAD': method = chalk.cyan(method); break;
      }

      if (isCompact) {
        return [
          method,
          r.path.length > (width - 25) ? r.path.substring(0, width - 28) + '...' : r.path
        ];
      }

      let statusStr = r.statusCode ? r.statusCode.toString() : '...';
      let statusColorized = statusStr;
      if (r.statusCode) {
        if (r.statusCode >= 200 && r.statusCode < 300) statusColorized = chalk.green(statusStr);
        else if (r.statusCode >= 300 && r.statusCode < 400) statusColorized = chalk.yellow(statusStr);
        else if (r.statusCode >= 400) statusColorized = chalk.red(statusStr);
      }
      // Right align Status (width 8)
      const statusCell = ' '.repeat(Math.max(0, 8 - statusStr.length)) + statusColorized;

      const durationStr = r.duration ? r.duration + 'ms' : '...';
      // Right align Duration (width 10)
      const durationCell = ' '.repeat(Math.max(0, 10 - durationStr.length)) + durationStr;

      return [
        method,
        r.path.length > 45 ? r.path.substring(0, 42) + '...' : r.path,
        statusCell,
        durationCell
      ];
    });

    this.requestTable.setData({
      headers: isCompact ? ['Method', 'Path'] : ['Method', 'Path', '  Status', '  Duration'],
      data: data
    });

    this.screen.render();
  }
}
