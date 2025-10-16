import { TContext } from "../../utils/types";
import { BaseContract } from "../base";

export class Bundler extends BaseContract {
  constructor(ctx: TContext) {
    super(ctx.wallet, ctx.provider, ctx.simulationOnly);
  }
}
