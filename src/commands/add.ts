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
      },
      {
        type: 'confirm',
        name: 'https',
        message: 'Enable HTTPS?',
        default: false
      },
      {
        type: 'input',
        name: 'plugins',
        message: 'Plugins (comma-separated paths, optional):',
        default: ''
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

    const pathRewrites: Record<string, string> = {};
    const addRewrites = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirm',
        message: 'Configure path rewrites?',
        default: false
      }
    ]);

    if (addRewrites.confirm) {
      let addMore = true;
      while (addMore) {
        const rewriteAnswer = await inquirer.prompt([
          {
            type: 'input',
            name: 'pattern',
            message: 'Pattern (regex):',
            validate: (input: string) => {
              if (!input) return 'Pattern is required';
              try {
                new RegExp(input);
                return true;
              } catch {
                return 'Invalid regex pattern';
              }
            }
          },
          {
            type: 'input',
            name: 'replacement',
            message: 'Replacement:',
            default: ''
          },
          {
            type: 'confirm',
            name: 'addAnother',
            message: 'Add another rewrite rule?',
            default: false
          }
        ]);

        pathRewrites[rewriteAnswer.pattern] = rewriteAnswer.replacement;
        addMore = rewriteAnswer.addAnother;
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
      pathRewrite: Object.keys(pathRewrites).length > 0 ? pathRewrites : undefined,
      headers: Object.keys(headers).length > 0 ? headers : undefined,
      https: answers.https,
      plugins: answers.plugins ? answers.plugins.split(',').map((p: string) => p.trim()).filter((p: string) => p.length > 0) : undefined
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
