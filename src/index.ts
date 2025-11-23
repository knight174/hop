import { Command } from 'commander';
import { readFileSync } from 'fs';
import { join } from 'path';
import { addCommand } from './commands/add';
import { listCommand } from './commands/list';
import { removeCommand } from './commands/remove';
import { editCommand } from './commands/edit';
import { serveCommand } from './commands/serve';
import { helpCommand } from './commands/help';

const packageJson = JSON.parse(
  readFileSync(join(__dirname, '../package.json'), 'utf-8')
);

const program = new Command();

program
  .name('hop')
  .description('Smart proxying made simple.')
  .version(packageJson.version)
  .helpOption('-h, --help', 'Display help for command')
  .action(async () => {
    const { App } = await import('./tui/App');
    const app = new App();
    app.start();
  });

program
  .command('add')
  .description('Add a new proxy rule (interactive)')
  .helpOption('-h, --help', 'Display help for this command')
  .action(addCommand);

program
  .command('list')
  .alias('ls')
  .description('List all configured proxies')
  .helpOption('-h, --help', 'Display help for this command')
  .action(listCommand);

program
  .command('remove')
  .alias('rm')
  .description('Remove a proxy rule (interactive)')
  .helpOption('-h, --help', 'Display help for this command')
  .action(removeCommand);

program
  .command('edit')
  .description('Edit an existing proxy rule (interactive)')
  .helpOption('-h, --help', 'Display help for this command')
  .action(editCommand);

program
  .command('serve [names...]')
  .alias('start')
  .description('Start the proxy server (optionally specify proxy names)')
  .helpOption('-h, --help', 'Display help for this command')
  .action(serveCommand);

program
  .command('help')
  .description('Display detailed help information')
  .action(helpCommand);

program
  .command('export [name]')
  .description('Export proxy configuration')
  .action(async (name) => {
    const { exportCommand } = await import('./commands/export');
    await exportCommand(name);
  });

program
  .command('import <input>')
  .description('Import proxy configuration (file path or base64 string)')
  .action(async (input) => {
    const { importCommand } = await import('./commands/import');
    await importCommand(input);
  });

program.parse();
