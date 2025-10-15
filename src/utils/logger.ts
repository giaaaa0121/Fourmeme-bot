import chalk from "chalk";

export const logInfo = (message?: any, ...optionalParams: any[]) => {
  console.info(chalk.bgGreen(message, optionalParams));
}

export const logWarn = (message?: any, ...optionalParams: any[]) => {
  console.debug(chalk.bgYellow(message, optionalParams));
}

export const logError = (message?: any, ...optionalParams: any[]) => {
  console.error(chalk.bgRed(message, optionalParams));
}