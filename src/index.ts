import { Command } from 'commander';
import { addCommand } from './commands/add';
import { listCommand } from './commands/list';
import { removeCommand } from './commands/remove';
import { editCommand } from './commands/edit';
import { serveCommand } from './commands/serve';
import { helpCommand } from './commands/help';

const program = new Command();

program
  .name('hop')
  .description('An extensible port proxy + request enhancement CLI tool')
  .version('0.1.0')
  .helpOption('-h, --help', 'Display help for command');

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

program.parse();
