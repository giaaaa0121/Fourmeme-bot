import promptSync from "prompt-sync";
import chalk from "chalk";

const prompt = promptSync();

async function main() {
  console.clear();
  console.log(
    chalk.cyan(`
    ╔══════════════════════════════════════════╗
    ║      Four.meme (BNB) toolkit @v1.0.3     ║
    ╚══════════════════════════════════════════╝
    `)
  );

  const menuOptions = ["1. Volume Bot", "2. Sniper", "3. Exit"];

  while (true) {
    console.log(chalk.green("\nMain Menu\n"));
    menuOptions.forEach((option) => console.log(chalk.white(option)));

    const choice = prompt(chalk.yellow("\nSelect option: "));
    try {
      switch (choice) {
        case "1":
          
          break;

        case "2":
          
          break;

        case "3":
          process.exit(0);

        default:
          console.log(chalk.red("Invalid option"));
      }
    } catch (error: any) {
      console.log(error);
      console.error(chalk.red(`Error: ${error.message}`));
    }
  }
}

main();
