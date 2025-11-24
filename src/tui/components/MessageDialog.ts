import blessed from 'blessed';

export function showMessageDialog(
  screen: blessed.Widgets.Screen,
  title: string,
  message: string,
  onClose?: () => void
): void {
  const box = blessed.box({
    parent: screen,
    top: 'center',
    left: 'center',
    width: '50%',
    height: 'shrink',
    border: { type: 'line' },
    style: {
      border: { fg: 'white' },
    },
    label: ` ${title} `,
    tags: true,
    keys: true,
    vi: false,
    padding: 1,
  });

  const text = blessed.text({
    parent: box,
    top: 0,
    left: 0,
    width: '100%-2',
    content: message,
    align: 'center',
  });

  const okBtn = blessed.button({
    parent: box,
    top: 2,
    left: 'center',
    content: ' OK ',
    style: {
      bg: 'blue',
      focus: { bg: 'lightblue', fg: 'black' },
    },
    keys: true,
    shrink: true,
    padding: { left: 1, right: 1 },
  });

  const close = () => {
    box.destroy();
    screen.render();
    if (onClose) onClose();
  };

  okBtn.on('press', close);

  // Handle keys on the box and button
  box.key(['escape', 'enter', 'space'], close);
  okBtn.key(['escape', 'enter', 'space'], close);

  screen.render();
  okBtn.focus();
}
