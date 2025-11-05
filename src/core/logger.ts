import chalk from 'chalk';

export const logger = {
  success(message: string): void {
    console.log(chalk.green('✔'), message);
  },

  error(message: string): void {
    console.log(chalk.red('✖'), message);
  },

  info(message: string): void {
    console.log(chalk.blue('ℹ'), message);
  },

  warning(message: string): void {
    console.log(chalk.yellow('⚠'), message);
  },

  proxy(port: number, target: string): void {
    console.log(chalk.cyan('→'), `${port} → ${target}`);
  }
};
