import { Watcher } from "./watcher";

import { installFormula } from "../util/ibrew";

import { IStore, ILocalizedString } from "../types";
import { DB } from "../db";
import Context from "../context";

import { actions } from "../actions";

import rootLogger from "../logger";
const logger = rootLogger.child({ name: "setup" });

async function fetch(ctx: Context, name: string) {
  const opts = {
    ctx,
    logger,
    onStatus: (icon: string, message: ILocalizedString) => {
      ctx.store.dispatch(actions.setupStatus({ icon, message }));
    },
  };

  await installFormula(opts, name);
}

async function setup(store: IStore, db: DB) {
  const ctx = new Context(store, db);

  logger.info("setup starting");
  await fetch(ctx, "butler");
  logger.info("all deps done");
  store.dispatch(actions.setupDone({}));
}

async function doSetup(store: IStore, db: DB) {
  try {
    await setup(store, db);
  } catch (e) {
    logger.error(`setup got error: ${e.stack}`);

    store.dispatch(
      actions.setupStatus({
        icon: "error",
        message: ["login.status.setup_failure", { error: e.message || "" + e }],
        stack: e.stack,
      })
    );
  }
}

export default function(watcher: Watcher, db: DB) {
  watcher.on(actions.boot, async (store, action) => {
    await doSetup(store, db);
  });

  watcher.on(actions.retrySetup, async (store, action) => {
    await doSetup(store, db);
  });
}
