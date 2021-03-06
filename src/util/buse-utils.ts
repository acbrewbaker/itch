import { IGameCredentials } from "../types/index";
import { GameCredentials } from "node-buse/lib/messages";
import urls from "../constants/urls";
import { Client, messages, Instance } from "node-buse";
import { Logger } from "../logger/index";
import { MinimalContext } from "../context/index";
import * as ospath from "path";
import { getBinPath } from "./ibrew";

export async function makeButlerInstance(): Promise<Instance> {
  // TODO: respect global lock when we're updating butler
  return new Instance({
    butlerExecutable: ospath.join(getBinPath(), "butler"),
  });
}

export function buseGameCredentials(
  credentials: IGameCredentials
): GameCredentials {
  return {
    apiKey: credentials.apiKey,
    downloadKey: credentials.downloadKey ? credentials.downloadKey.id : null,
    server: urls.itchioApi,
  };
}

export function setupClient(
  client: Client,
  parentLogger: Logger,
  ctx: MinimalContext
) {
  client.onNotification(messages.OperationProgress, ({ params }) => {
    ctx.emitProgress(params);
  });

  const logger = parentLogger.child({ name: "butler" });

  client.onNotification(messages.Log, ({ params }) => {
    switch (params.level) {
      case "debug":
        logger.debug(params.message);
        break;
      case "info":
        logger.info(params.message);
        break;
      case "warning":
        logger.warn(params.message);
        break;
      case "error":
        logger.error(params.message);
        break;
      default:
        logger.info(`[${params.level}] ${params.message}`);
        break;
    }
  });
}
