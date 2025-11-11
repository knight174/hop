import chalk from 'chalk';

function getTimestamp(): string {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  return chalk.gray(`[${hours}:${minutes}:${seconds}]`);
}

function getStatusColor(statusCode: number): chalk.Chalk {
  if (statusCode >= 200 && statusCode < 300) {
    return chalk.green;
  } else if (statusCode >= 300 && statusCode < 400) {
    return chalk.cyan;
  } else if (statusCode >= 400 && statusCode < 500) {
    return chalk.yellow;
  } else {
    return chalk.red;
  }
}

function getMethodColor(method: string): chalk.Chalk {
  switch (method.toUpperCase()) {
    case 'GET':
      return chalk.cyan;
    case 'POST':
      return chalk.green;
    case 'PUT':
      return chalk.yellow;
    case 'DELETE':
      return chalk.red;
    case 'PATCH':
      return chalk.magenta;
    case 'OPTIONS':
      return chalk.blue;
    default:
      return chalk.white;
  }
}

export const logger = {
  success(message: string): void {
    console.log(getTimestamp(), chalk.green('✔'), message);
  },

  error(message: string): void {
    console.log(getTimestamp(), chalk.red('✖'), message);
  },

  info(message: string): void {
    console.log(getTimestamp(), chalk.blue('ℹ'), message);
  },

  warn(message: string): void {
    console.log(getTimestamp(), chalk.yellow('⚠'), message);
  },

  proxy(port: number, target: string): void {
    console.log(getTimestamp(), chalk.cyan('→'), `${port} → ${target}`);
  },

  request(method: string, path: string, statusCode?: number, duration?: number): void {
    const methodColored = getMethodColor(method)(method.padEnd(7));
    const pathColored = chalk.white(path);

    if (statusCode !== undefined && duration !== undefined) {
      const statusColored = getStatusColor(statusCode)(statusCode);
      const durationColored = chalk.gray(`(${duration}ms)`);
      console.log(getTimestamp(), methodColored, pathColored, '→', statusColored, durationColored);
    } else {
      console.log(getTimestamp(), methodColored, pathColored);
    }
  }
};
