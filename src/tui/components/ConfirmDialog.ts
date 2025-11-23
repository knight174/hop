import blessed from 'blessed';

export function showConfirmDialog(
  screen: blessed.Widgets.Screen,
  message: string,
  onConfirm: () => void,
  onCancel: () => void
): void {
  const box = blessed.box({
    parent: screen,
    top: 'center',
    left: 'center',
    width: '50%',
    height: 7,
    border: { type: 'line' },
    style: {
      border: { fg: 'red' },
    },
    label: ' Confirm ',
    tags: true,
    keys: true,
    vi: false,
  });

  const text = blessed.text({
    parent: box,
    top: 1,
    left: 2,
    content: message,
  });

  const yesBtn = blessed.button({
    parent: box,
    top: 3,
    left: '20%',
    content: ' Yes ',
    style: {
      bg: 'red',
      focus: { bg: 'lightred', fg: 'black' },
    },
    keys: true,
    shrink: true,
    padding: { left: 1, right: 1 },
  });

  const noBtn = blessed.button({
    parent: box,
    top: 3,
    left: '60%',
    content: ' No ',
    style: {
      bg: 'green',
      focus: { bg: 'lightgreen', fg: 'black' },
    },
    keys: true,
    shrink: true,
    padding: { left: 1, right: 1 },
  });

  yesBtn.on('press', () => {
    box.destroy();
    screen.render();
    onConfirm();
  });

  noBtn.on('press', () => {
    box.destroy();
    screen.render();
    onCancel();
  });

  // Handle Tab to switch between buttons
  yesBtn.key(['tab'], () => {
    noBtn.focus();
    screen.render();
  });

  noBtn.key(['tab'], () => {
    yesBtn.focus();
    screen.render();
  });

  // ESC or 'n' to cancel
  yesBtn.key(['escape', 'n'], () => {
    box.destroy();
    screen.render();
    onCancel();
  });

  noBtn.key(['escape', 'n'], () => {
    box.destroy();
    screen.render();
    onCancel();
  });

  // 'y' to confirm
  yesBtn.key(['y'], () => {
    box.destroy();
    screen.render();
    onConfirm();
  });

  noBtn.key(['y'], () => {
    box.destroy();
    screen.render();
    onConfirm();
  });

  screen.render();
  noBtn.focus(); // Default focus on "No" for safety
}
