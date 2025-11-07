import inquirer from 'inquirer';
import { loadConfig, saveConfig } from '../core/config';
import { logger } from '../core/logger';
import { ProxyRule } from '../types';

export async function editCommand(): Promise<void> {
  try {
    const config = await loadConfig();

    if (config.proxies.length === 0) {
      logger.info('No proxies configured to edit.');
      return;
    }

    // Select which proxy to edit
    const choices = config.proxies.map(proxy => ({
      name: `${proxy.name} (port: ${proxy.port} → ${proxy.target})`,
      value: proxy.name
    }));

    const selectAnswer = await inquirer.prompt([
      {
        type: 'list',
        name: 'name',
        message: 'Select proxy to edit:',
        choices
      }
    ]);

    const proxyIndex = config.proxies.findIndex(p => p.name === selectAnswer.name);
    const proxy = config.proxies[proxyIndex];

    // Select what to edit
    const editChoices = [
      { name: 'Name', value: 'name' },
      { name: 'Port', value: 'port' },
      { name: 'Target URL', value: 'target' },
      { name: 'Paths', value: 'paths' },
      { name: 'Headers', value: 'headers' },
      { name: 'Edit all', value: 'all' }
    ];

    const whatToEdit = await inquirer.prompt([
      {
        type: 'checkbox',
        name: 'fields',
        message: 'What would you like to edit?',
        choices: editChoices,
        validate: (input: string[]) => {
          if (input.length === 0) {
            return 'Please select at least one field to edit';
          }
          return true;
        }
      }
    ]);

    const fieldsToEdit = whatToEdit.fields.includes('all')
      ? ['name', 'port', 'target', 'paths', 'headers']
      : whatToEdit.fields;

    const updates: Partial<ProxyRule> = {};

    // Edit name
    if (fieldsToEdit.includes('name')) {
      const answer = await inquirer.prompt([
        {
          type: 'input',
          name: 'name',
          message: 'New proxy name:',
          default: proxy.name,
          validate: (input: string) => {
            if (!input) {
              return 'Proxy name is required';
            }
            if (!/^[a-zA-Z0-9_-]+$/.test(input)) {
              return 'Name must contain only letters, numbers, hyphens, and underscores';
            }
            // Check if name already exists (and is not the current one)
            if (input !== proxy.name && config.proxies.some(p => p.name === input)) {
              return `Proxy name "${input}" is already in use`;
            }
            return true;
          }
        }
      ]);
      updates.name = answer.name;
    }

    // Edit port
    if (fieldsToEdit.includes('port')) {
      const answer = await inquirer.prompt([
        {
          type: 'number',
          name: 'port',
          message: 'New local port:',
          default: proxy.port,
          validate: (input: number) => {
            if (!input || input < 1 || input > 65535) {
              return 'Please enter a valid port number (1-65535)';
            }
            // Check if port already exists (and is not the current one)
            if (input !== proxy.port && config.proxies.some(p => p.port === input)) {
              return `Port ${input} is already in use`;
            }
            return true;
          }
        }
      ]);
      updates.port = answer.port;
    }

    // Edit target
    if (fieldsToEdit.includes('target')) {
      const answer = await inquirer.prompt([
        {
          type: 'input',
          name: 'target',
          message: 'New target URL:',
          default: proxy.target,
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
        }
      ]);
      updates.target = answer.target;
    }

    // Edit paths
    if (fieldsToEdit.includes('paths')) {
      const currentPaths = proxy.paths ? proxy.paths.join(', ') : '';
      const answer = await inquirer.prompt([
        {
          type: 'input',
          name: 'paths',
          message: 'Paths to proxy (comma-separated, leave empty for all):',
          default: currentPaths
        }
      ]);
      updates.paths = answer.paths
        ? answer.paths.split(',').map((p: string) => p.trim()).filter((p: string) => p.length > 0)
        : undefined;
    }

    // Edit headers
    if (fieldsToEdit.includes('headers')) {
      const manageHeaders = await inquirer.prompt([
        {
          type: 'list',
          name: 'action',
          message: 'How would you like to manage headers?',
          choices: [
            { name: 'Keep existing and add more', value: 'add' },
            { name: 'Remove specific headers', value: 'remove' },
            { name: 'Replace all headers', value: 'replace' },
            { name: 'Clear all headers', value: 'clear' }
          ]
        }
      ]);

      const headers: Record<string, string> = { ...(proxy.headers || {}) };

      if (manageHeaders.action === 'clear') {
        updates.headers = undefined;
      } else if (manageHeaders.action === 'replace') {
        const newHeaders: Record<string, string> = {};
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

          newHeaders[headerAnswer.name] = headerAnswer.value;
          addMore = headerAnswer.addAnother;
        }

        updates.headers = Object.keys(newHeaders).length > 0 ? newHeaders : undefined;
      } else if (manageHeaders.action === 'remove') {
        if (Object.keys(headers).length === 0) {
          logger.info('No headers to remove.');
        } else {
          const removeAnswer = await inquirer.prompt([
            {
              type: 'checkbox',
              name: 'toRemove',
              message: 'Select headers to remove:',
              choices: Object.keys(headers).map(key => ({
                name: `${key}: ${headers[key]}`,
                value: key
              }))
            }
          ]);

          removeAnswer.toRemove.forEach((key: string) => {
            delete headers[key];
          });

          updates.headers = Object.keys(headers).length > 0 ? headers : undefined;
        }
      } else if (manageHeaders.action === 'add') {
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

        updates.headers = Object.keys(headers).length > 0 ? headers : undefined;
      }
    }

    // Apply updates
    config.proxies[proxyIndex] = {
      ...proxy,
      ...updates
    };

    await saveConfig(config);
    logger.success(`Proxy updated: ${config.proxies[proxyIndex].name}`);
  } catch (error) {
    if (error instanceof Error) {
      logger.error(error.message);
    } else {
      logger.error('Failed to edit proxy');
    }
    process.exit(1);
  }
}
