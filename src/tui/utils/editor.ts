import { spawn } from 'child_process';
import { getConfigPath } from '../../core/config';

export async function openConfigInEditor(screen: any): Promise<void> {
  const configPath = getConfigPath();
  const editor = process.env.EDITOR || process.env.VISUAL || 'vim';

  return new Promise((resolve, reject) => {
    // Hide the screen to allow editor to take over terminal
    screen.leave();

    const child = spawn(editor, [configPath], {
      stdio: 'inherit',
      shell: true,
    });

    child.on('exit', (code) => {
      // Restore the screen
      screen.enter();
      screen.render();

      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Editor exited with code ${code}`));
      }
    });

    child.on('error', (err) => {
      screen.enter();
      screen.render();
      reject(err);
    });
  });
}
