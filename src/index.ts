import { Command } from 'commander';
import { addCommand } from './commands/add';
import { listCommand } from './commands/list';
import { removeCommand } from './commands/remove';
import { serveCommand } from './commands/serve';

const program = new Command();

program
  .name('hop')
  .description('An extensible port proxy + request enhancement CLI tool')
  .version('0.1.0');

program
  .command('add')
  .description('Add a new proxy rule (interactive)')
  .action(addCommand);

program
  .command('list')
  .alias('ls')
  .description('List all configured proxies')
  .action(listCommand);

program
  .command('remove')
  .alias('rm')
  .description('Remove a proxy rule (interactive)')
  .action(removeCommand);

program
  .command('serve')
  .alias('start')
  .description('Start the proxy server')
  .action(serveCommand);

program.parse();
