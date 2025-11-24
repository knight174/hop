import { spawn } from 'child_process';
import { getConfigPath } from '../../core/config';

export async function openConfigInEditor(screen: any): Promise<void> {
  const configPath = getConfigPath();

  // Detect editor in order of preference:
  // 1. EDITOR/VISUAL env vars
  // 2. code (VS Code)
  // 3. nano
  // 4. vim
  // 5. System default (open/xdg-open)

  let editor = process.env.EDITOR || process.env.VISUAL;
  let args: string[] = [configPath];
  let shell = true;

  if (!editor) {
    // Check for VS Code
    if (hasCommand('code')) {
      editor = 'code';
      // For VS Code, we need to wait for the file to close
      args = ['--wait', configPath];
    } else if (hasCommand('nano')) {
      editor = 'nano';
    } else if (hasCommand('vim')) {
      editor = 'vim';
    } else {
      // Fallback to system default
      if (process.platform === 'darwin') {
        editor = 'open';
        args = ['-W', '-n', configPath]; // -W waits, -n opens new instance
      } else if (process.platform === 'linux') {
        if (hasCommand('xdg-open')) {
          editor = 'xdg-open';
          // xdg-open doesn't support waiting easily, so we might have issues here
          // but it's a last resort
          shell = false;
        }
      }
    }
  }

  if (!editor) {
    // Absolute fallback
    editor = 'vim';
  }

  return new Promise((resolve, reject) => {
    // Hide the screen to allow editor to take over terminal
    screen.leave();

    try {
      const child = spawn(editor!, args, {
        stdio: 'inherit',
        shell: shell,
      });

      child.on('exit', (code) => {
        // Restore the screen with a small delay
        setTimeout(() => {
          screen.enter();
          screen.render();

          if (code === 0) {
            resolve();
          } else {
            reject(new Error(`Editor exited with code ${code}`));
          }
        }, 100);
      });

      child.on('error', (err) => {
        setTimeout(() => {
          screen.enter();
          screen.render();
          reject(err);
        }, 100);
      });
    } catch (err) {
      setTimeout(() => {
        screen.enter();
        screen.render();
        reject(err);
      }, 100);
    }
  });
}

function hasCommand(command: string): boolean {
  try {
    const result = require('child_process').spawnSync('which', [command], { encoding: 'utf8' });
    return result.status === 0;
  } catch (e) {
    return false;
  }
}
