"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = require("commander");
const program = new commander_1.Command();
program
    .name("fourdotmeme-bot")
    .description("Four.meme (BNB) toolkit CLI")
    .version("1.0.3");
// Volume bot
await program.parseAsync(process.argv);
