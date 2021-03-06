import { ICave } from "../../db/models/cave";
import { IDownloadKey } from "../../db/models/download-key";

import { ClassificationAction, ITask, IDownloadItem } from "../../types";
import { Game } from "node-buse/lib/messages";

export interface IActionsInfo {
  cave: ICave;
  game: Game;
  downloadKey: IDownloadKey;

  action: ClassificationAction;

  mayDownload: boolean;
  canBeBought: boolean;

  tasks: ITask[];
  downloads: IDownloadItem[];
}
