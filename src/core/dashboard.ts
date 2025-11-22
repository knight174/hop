import blessed from 'blessed';
import contrib from 'blessed-contrib';
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
  private requests: DashboardRequest[] = [];
  private selectedRequestIndex: number = -1;

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
      border: { type: 'line', fg: 'cyan' },
      columnSpacing: 2,
      columnWidth: [8, 40, 8, 10] // Method, Path, Status, Duration
    });

    // Right Panel: Details
    this.detailsBox = this.grid.set(0, 6, 11, 6, blessed.box, {
      label: 'Details',
      content: 'Select a request to view details',
      border: { type: 'line', fg: 'yellow' },
      scrollable: true,
      alwaysScroll: true,
      scrollbar: {
        ch: ' ',
        inverse: true
      },
      keys: true,
      mouse: true
    });

    // Footer: Help
    this.grid.set(11, 0, 1, 12, blessed.box, {
      content: ' Keys: ↑/↓: Navigate | Enter: View Details | q/Ctrl+C: Exit',
      style: { bg: 'blue', fg: 'white' }
    });

    this.setupEvents();
    this.screen.render();
  }

  private setupEvents(): void {
    // Quit on Escape, q, or Control-C.
    this.screen.key(['escape', 'q', 'C-c'], () => {
      return process.exit(0);
    });

    // Handle table selection
    this.requestTable.rows.on('select', (_item: any, index: number) => {
      this.selectedRequestIndex = index;
      this.updateDetails();
      this.screen.render();
    });

    // Focus table by default
    this.requestTable.focus();
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

  private refreshTable(): void {
    const data = this.requests.map(r => [
      r.method,
      r.path.length > 35 ? r.path.substring(0, 32) + '...' : r.path,
      r.statusCode ? r.statusCode.toString() : '...',
      r.duration ? r.duration + 'ms' : '...'
    ]);

    this.requestTable.setData({
      headers: ['Method', 'Path', 'Status', 'Time'],
      data: data
    });

    this.screen.render();
  }
}
