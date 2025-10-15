import { Command } from "commander";

const program = new Command();

program
  .name("fourdotmeme-bot")
  .description("Four.meme (BNB) toolkit CLI")
  .version("1.0.3");

await program!.parseAsync(process.argv);
