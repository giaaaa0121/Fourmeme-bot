import { Command } from "commander";

const program = new Command();

console.log("Bot is started----->")

program
  .name("fourdotmeme-bot")
  .description("Four.meme (BNB) toolkit CLI")
  .version("1.0.3");

// Volume bot

program!.parseAsync(process.argv);
