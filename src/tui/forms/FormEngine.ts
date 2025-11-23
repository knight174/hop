
import blessed from 'blessed';

export interface FormField {
  name: string;
  label: string;
  type: 'text' | 'checkbox' | 'number' | 'textarea';
  default?: any;
}

export class FormEngine {
  private screen: blessed.Widgets.Screen;
  private form: blessed.Widgets.BoxElement;
  private inputs: { [key: string]: blessed.Widgets.BlessedElement } = {};
  private submitCallback: (data: any) => void;
  private cancelCallback: () => void;
  private fields: FormField[];

  constructor(screen: blessed.Widgets.Screen, title: string, fields: FormField[], onSubmit: (data: any) => void, onCancel: () => void) {
    this.screen = screen;
    this.submitCallback = onSubmit;
    this.cancelCallback = onCancel;
    this.fields = fields;

    this.form = blessed.box({
      parent: this.screen,
      keys: true,
      left: 'center',
      top: 'center',
      width: '60%',
      height: '80%',
      label: ` ${title} `,
      border: { type: 'line' },
      style: {
        border: { fg: 'cyan' },
      },
    });

    let currentTop = 1;

    fields.forEach((field) => {
      // Label
      blessed.text({
        parent: this.form,
        top: currentTop,
        left: 2,
        content: `${field.label}:`,
      });

      // Input
      if (field.type === 'text' || field.type === 'number') {
        this.inputs[field.name] = blessed.textbox({
          parent: this.form,
          name: field.name,
          top: currentTop,
          left: 20,
          height: 1,
          width: '60%',
          keys: true,
          vi: false,
          style: {
            bg: 'black',
            focus: { bg: 'blue' },
          },
          value: field.default ? String(field.default) : '',
        });
        this.setupInputHandling(this.inputs[field.name], field.type);
        currentTop += 2;
      } else if (field.type === 'checkbox') {
        this.inputs[field.name] = blessed.checkbox({
          parent: this.form,
          name: field.name,
          top: currentTop,
          left: 20,
          text: 'Enabled',
          checked: !!field.default,
          keys: true,
          vi: false,
          style: {
            focus: { fg: 'blue' },
          },
        });
        currentTop += 2;
      } else if (field.type === 'textarea') {
        this.inputs[field.name] = blessed.textarea({
          parent: this.form,
          name: field.name,
          top: currentTop,
          left: 20,
          height: 5,
          width: '60%',
          keys: true,
          vi: false,
          style: {
            bg: 'black',
            focus: { bg: 'blue' },
          },
          value: field.default ? String(field.default) : '',
        });
        this.setupInputHandling(this.inputs[field.name], field.type);
        currentTop += 6;
      }
    });

    // Buttons
    const submitBtn = blessed.button({
      parent: this.form,
      top: currentTop + 1,
      left: '20%',
      content: ' Submit ',
      style: {
        bg: 'green',
        focus: { bg: 'lightgreen', fg: 'black' },
      },
      keys: true,
      shrink: true,
      padding: { left: 1, right: 1 },
    });

    submitBtn.on('press', () => {
      this.submit();
    });

    const cancelBtn = blessed.button({
      parent: this.form,
      top: currentTop + 1,
      left: '60%',
      content: ' Cancel ',
      style: {
        bg: 'red',
        focus: { bg: 'lightred', fg: 'black' },
      },
      keys: true,
      shrink: true,
      padding: { left: 1, right: 1 },
    });

    cancelBtn.on('press', () => {
      this.destroy();
      this.cancelCallback();
    });

    // Handle ESC to cancel
    this.form.on('element keypress', (el, ch, key) => {
      if (key.name === 'escape') {
        this.destroy();
        this.cancelCallback();
      }
    });

    this.screen.render();

    // Collect all focusable elements
    const focusableElements: blessed.Widgets.BlessedElement[] = [
      ...Object.values(this.inputs),
      submitBtn,
      cancelBtn
    ];

    // Delay focus to ensure elements are rendered and coordinates are calculated
    setTimeout(() => {
      if (fields.length > 0) {
        this.inputs[fields[0].name].focus();
        this.screen.render();
      }
    }, 0);

    // Focus Trapping & Navigation
    focusableElements.forEach((el, index) => {
      // Handle Tab / Down -> Next
      const goNext = () => {
        const nextIndex = (index + 1) % focusableElements.length;
        // Delay focus to avoid conflict with current key event processing
        setTimeout(() => {
          focusableElements[nextIndex].focus();
          this.screen.render();
        }, 0);
      };

      // Handle Shift-Tab / Up -> Prev
      const goPrev = () => {
        const prevIndex = (index - 1 + focusableElements.length) % focusableElements.length;
        setTimeout(() => {
          focusableElements[prevIndex].focus();
          this.screen.render();
        }, 0);
      };

      // We need to override default key handlers for navigation
      // Note: 'element keypress' captures keys before they are handled by the element?
      // Or we use key() method.

      el.key(['down'], () => {
        // For textarea, only move down if we are at the bottom?
        // Or just use Tab for navigation and Arrows for cursor?
        // User specifically complained about Arrow keys returning to list.
        // So we should probably trap arrows to either navigate OR stay in field.
        // If it's a single line textbox, Down should probably go to next field.
        if (el.type !== 'textarea') {
          goNext();
        }
      });

      el.key(['up'], () => {
        if (el.type !== 'textarea') {
          goPrev();
        }
      });

      el.key(['tab'], (ch, key) => {
         // Prevent default tab behavior which might leak focus
         // But blessed might handle tab internally.
         // Let's try to force our navigation.
         goNext();
         return false; // Stop propagation?
      });

      el.key(['S-tab'], (ch, key) => {
         goPrev();
         return false;
      });
    });

    this.screen.render();
  }

  private submit() {
    const result: any = {};
    this.fields.forEach(f => {
      if (f.type === 'checkbox') {
        result[f.name] = (this.inputs[f.name] as blessed.Widgets.CheckboxElement).checked;
      } else if (f.type === 'number') {
         result[f.name] = Number((this.inputs[f.name] as blessed.Widgets.TextboxElement).value);
      } else {
        result[f.name] = (this.inputs[f.name] as blessed.Widgets.TextboxElement).value;
      }
    });

    this.destroy();
    this.submitCallback(result);
  }

  public destroy() {
    this.form.destroy();
    this.screen.render();
  }

  private setupInputHandling(el: blessed.Widgets.BlessedElement, fieldType: string) {
    if (fieldType === 'textarea') {
      // Textarea: Manual input handling to avoid blessed bugs
      const listener = (ch: any, key: any) => {
        if (this.screen.focused !== el) return;

        // Ignore navigation keys
        if (['tab', 'S-tab', 'escape', 'up', 'down'].includes(key.name)) {
          return;
        }

        const val = (el as blessed.Widgets.TextareaElement).value;

        if (key.name === 'return' || key.name === 'enter') {
          (el as blessed.Widgets.TextareaElement).setValue(val + '\n');
          this.screen.render();
          return;
        }

        if (key.name === 'backspace') {
          (el as blessed.Widgets.TextareaElement).setValue(val.slice(0, -1));
          this.screen.render();
          return;
        }

        if (ch && !/^[\x00-\x1F\x7F]$/.test(ch)) {
           (el as blessed.Widgets.TextareaElement).setValue(val + ch);
           this.screen.render();
        }
      };

      el.on('focus', () => {
        if (el.style.border) {
          el.style.border.fg = 'green';
        }
        this.screen.program.on('keypress', listener);
        this.screen.render();
      });

      el.on('blur', () => {
        if (el.style.border) {
          el.style.border.fg = 'cyan';
        }
        this.screen.program.removeListener('keypress', listener);
        this.screen.render();
      });

    } else {
      // Textbox/Number: Auto-edit on focus
      el.on('focus', () => {
        if ((el as any)._reading) return;
        (el as any).readInput((err: any, value: string) => {});
      });

      el.on('blur', () => {
        this.stopReading(el);
      });
    }
  }

  private stopReading(el: blessed.Widgets.BlessedElement) {
    if ((el as any)._reading) {
      (el as any)._reading = false;
      if ((el as any)._listener) {
         this.screen.program.removeListener('keypress', (el as any)._listener);
         (el as any)._listener = null;
      }
      if ((el as any)._done) {
         (el as any)._done = () => {};
      }
    }
  }
}
