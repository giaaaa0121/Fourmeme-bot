import chalk from "chalk";

type Meta = Record<string, unknown> | unknown;

function format(message: string, meta?: Meta): string {
  const ts = new Date().toISOString();
  const metaStr = meta === undefined ? "" : ` ${JSON.stringify(meta)}`;
  return `[${ts}] ${message}${metaStr}`;
}

export const logInfo = (message: string, meta?: Meta) => {
  console.info(chalk.green(format(message, meta)));
};

export const logWarn = (message: string, meta?: Meta) => {
  console.warn(chalk.yellow(format(message, meta)));
};

export const logError = (message: string, meta?: Meta) => {
  console.error(chalk.red(format(message, meta)));
};