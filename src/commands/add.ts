import inquirer from 'inquirer';
import { addProxy } from '../core/config';
import { logger } from '../core/logger';
import { ProxyRule } from '../types';

export async function addCommand(): Promise<void> {
  try {
    const answers = await inquirer.prompt([
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
      port: answers.port,
      target: answers.target,
      headers: Object.keys(headers).length > 0 ? headers : undefined
    };

    await addProxy(proxy);
    logger.success(`Proxy added: ${proxy.port} → ${proxy.target}`);
  } catch (error) {
    if (error instanceof Error) {
      logger.error(error.message);
    } else {
      logger.error('Failed to add proxy');
    }
    process.exit(1);
  }
}
