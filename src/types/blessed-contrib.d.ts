declare module 'blessed-contrib' {
  import * as blessed from 'blessed';

  export namespace Widgets {
    interface TableOptions extends blessed.Widgets.BoxOptions {
      columnWidth?: number[];
      columnSpacing?: number;
      selectedFg?: string;
      selectedBg?: string;
      fg?: string;
      keys?: boolean;
      interactive?: boolean;
    }

    interface Table extends blessed.Widgets.BoxElement {
      setData(data: { headers: string[]; data: string[][] }): void;
      rows: any;
    }
  }

  export class grid {
    constructor(options: { rows: number; cols: number; screen: blessed.Widgets.Screen });
    set(row: number, col: number, rowSpan: number, colSpan: number, element: any, options?: any): any;
  }

  export const table: any;
}
