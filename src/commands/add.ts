import inquirer from 'inquirer';
import { addProxy } from '../core/config';
import { logger } from '../core/logger';
import { ProxyRule } from '../types';

export async function addCommand(): Promise<void> {
  try {
    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'name',
        message: 'Proxy name:',
        validate: (input: string) => {
          if (!input) {
            return 'Proxy name is required';
          }
          if (!/^[a-zA-Z0-9_-]+$/.test(input)) {
            return 'Name must contain only letters, numbers, hyphens, and underscores';
          }
          return true;
        }
      },
      {
        type: 'number',
        name: 'port',
        message: 'Enter local port:',
        validate: (input: number) => {
          if (!input || input < 1 || input > 65535) {
            return 'Please enter a valid port number (1-65535)';
          }
          return true;
        }
      },
      {
        type: 'input',
        name: 'target',
        message: 'Enter target URL:',
        validate: (input: string) => {
          if (!input) {
            return 'Target URL is required';
          }
          try {
            new URL(input);
            return true;
          } catch {
            return 'Please enter a valid URL (e.g., https://api.example.com)';
          }
        }
      },
      {
        type: 'input',
        name: 'paths',
        message: 'Paths to proxy (comma-separated, leave empty for all):',
        default: ''
      },
      {
        type: 'confirm',
        name: 'addHeaders',
        message: 'Add custom headers?',
        default: false
      }
    ]);

    const headers: Record<string, string> = {};

    if (answers.addHeaders) {
      let addMore = true;

      while (addMore) {
        const headerAnswer = await inquirer.prompt([
          {
            type: 'input',
            name: 'name',
            message: 'Header name:',
            validate: (input: string) => {
              if (!input) return 'Header name is required';
              return true;
            }
          },
          {
            type: 'input',
            name: 'value',
            message: 'Header value:',
            validate: (input: string) => {
              if (!input) return 'Header value is required';
              return true;
            }
          },
          {
            type: 'confirm',
            name: 'addAnother',
            message: 'Add another header?',
            default: false
          }
        ]);

        headers[headerAnswer.name] = headerAnswer.value;
        addMore = headerAnswer.addAnother;
      }
    }

    const proxy: ProxyRule = {
      name: answers.name,
      port: answers.port,
      target: answers.target,
      paths: (() => {
        if (!answers.paths || !answers.paths.trim()) {
          return undefined;
        }
        const parsed = answers.paths.split(',').map((p: string) => p.trim()).filter((p: string) => p.length > 0);
        return parsed.length > 0 ? parsed : undefined;
      })(),
      headers: Object.keys(headers).length > 0 ? headers : undefined
    };

    await addProxy(proxy);
    logger.success(`Proxy added: ${proxy.name} (${proxy.port} → ${proxy.target})`);
  } catch (error) {
    if (error instanceof Error) {
      logger.error(error.message);
    } else {
      logger.error('Failed to add proxy');
    }
    process.exit(1);
  }
}
