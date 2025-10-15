import inquirer from "inquirer";
import chalk from "chalk";
import dotenv from "dotenv";
dotenv.config();

import { getWalletAndProvider } from "./utils/ethers";
import { VolumeBot } from "./lib/volumebot";
import { Sniper } from "./lib/sniper";

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

  const rpcUrl = process.env.RPC_URL;
  const chaindId = process.env.CHAIN_ID;
  const privateKey = process.env.PRIVATE_KEY;
  const { wallet, provider } = getWalletAndProvider({
    rpcUrl,
    chaindId,
    privateKey,
  });

  console.log(chalk.green("\nMain Menu"));
  menuOptions.forEach((option) => console.log(chalk.white(option)));

  await inquirer
    .prompt([
      {
        type: "input",
        name: "choice",
        message: chalk.yellow("\nSelect option: "),
      },
    ])
    .then(async (answers) => {
      const choice = Number(answers.choice);
      switch (choice) {
        case 1:
          const volumeBot = new VolumeBot({ wallet, provider });
          await volumeBot.run();
          break;

        case 2:
          const sniper = new Sniper({ wallet, provider });
          await sniper.run();
          break;

        case 3:
          process.exit(0);

        default:
          console.log(chalk.red("Invalid option"));
      }
    })
    .catch((error) => {
      if (error.isTtyError) {
        // Prompt couldn't be rendered in the current environment
      } else {
        // Something else went wrong
      }
    });
}

main().catch((err) => {
  console.error("Error:", err);
});
