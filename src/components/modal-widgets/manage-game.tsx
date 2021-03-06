import * as React from "react";

import { ModalWidgetDiv } from "./modal-widget";
import { Game, Upload } from "node-buse/lib/messages";
import { ICave } from "../../db/models/cave";

import IconButton from "../basics/icon-button";
import Button from "../basics/button";
import Filler from "../basics/filler";
import styled from "../styles";

import { map, find, filter } from "underscore";
import { fileSize } from "../../format/filesize";
import { connect, Dispatchers, actionCreatorsList } from "../connect";
import PlatformIcons from "../basics/platform-icons";

import { actions } from "../../actions";
import format from "../format";
import LoadingCircle from "../basics/loading-circle";
import { formatUploadTitle } from "../../format/upload";
import { showInExplorerString } from "../../format/show-in-explorer";
import TotalPlaytime from "../total-playtime";
import LastPlayed from "../last-played";
import { IModalWidgetProps } from "./index";

const CaveItemList = styled.div`
  margin: 8px 0;
`;

const CaveItem = styled.div`
  margin: 12px 4px;
  padding: 4px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: ${props => props.theme.itemBackground};
  border-radius: 2px;

  display: flex;
  flex-direction: row;
  align-items: center;
`;

const CaveDetails = styled.div`
  display: flex;
  flex-direction: column;
`;

const CaveDetailsRow = styled.div`
  padding: 6px 0;

  display: flex;
  flex-direction: row;
  align-items: center;

  .platform-icons {
    margin-left: 8px;
  }

  &.smaller {
    font-size: 90%;
  }
`;

const Spacer = styled.div`
  height: 1px;
  width: 8px;
`;

const CaveItemActions = styled.div`
  display: flex;
  flex-direction: row;
`;

const Title = styled.div`
  margin-left: 8px;
  font-weight: bold;
`;

const FileSize = styled.div`
  color: ${props => props.theme.secondaryText};
  margin-left: 8px;
`;

class ManageGame extends React.PureComponent<IProps & IDerivedProps> {
  render() {
    const params = this.props.modal.widgetParams;
    const { game, caves, allUploads, loadingUploads } = params;

    const installedUploadIds = {};
    for (const cave of caves) {
      if (cave.upload) {
        installedUploadIds[cave.upload.id] = true;
      }
    }

    const uninstalledUploads = filter(
      allUploads,
      u => !installedUploadIds[u.id]
    );

    return (
      <ModalWidgetDiv>
        <p>{format(["prompt.manage_game.installed_uploads"])}</p>

        <CaveItemList>
          {map(caves, (cave, i) => {
            const u = cave.upload;
            return (
              <CaveItem>
                <CaveDetails>
                  <CaveDetailsRow>
                    <Title>{formatUploadTitle(u)}</Title>
                  </CaveDetailsRow>
                  <CaveDetailsRow className="smaller">
                    {cave.installedSize ? (
                      <FileSize>{fileSize(cave.installedSize)}</FileSize>
                    ) : null}
                    {u ? (
                      <PlatformIcons className="platform-icons" target={u} />
                    ) : null}
                    <Spacer />
                    <LastPlayed game={game} cave={cave} />
                    <Spacer />
                    <TotalPlaytime game={game} cave={cave} />
                  </CaveDetailsRow>
                </CaveDetails>
                <Filler />
                <CaveItemActions>
                  <IconButton
                    data-cave-id={cave.id}
                    hint={showInExplorerString()}
                    icon="folder-open"
                    onClick={this.onExplore}
                  />
                  <IconButton
                    data-cave-id={cave.id}
                    hint={["prompt.uninstall.reinstall"]}
                    icon="repeat"
                    onClick={this.onReinstall}
                    className="manage-reinstall"
                  />
                  <IconButton
                    data-cave-id={cave.id}
                    hint={["prompt.uninstall.uninstall"]}
                    icon="uninstall"
                    onClick={this.onUninstall}
                    className="manage-uninstall"
                  />
                </CaveItemActions>
              </CaveItem>
            );
          })}
        </CaveItemList>

        {uninstalledUploads.length > 0 ? (
          <p>{format(["prompt.manage_game.available_uploads"])}</p>
        ) : (
          <p>
            {loadingUploads ? (
              <LoadingCircle progress={0} />
            ) : (
              format(["prompt.manage_game.no_other_uploads"])
            )}
          </p>
        )}
        {uninstalledUploads.length > 0 ? (
          <CaveItemList>
            {map(uninstalledUploads, u => {
              return (
                <CaveItem>
                  <CaveDetails>
                    <CaveDetailsRow>
                      <Title>{formatUploadTitle(u)}</Title>
                    </CaveDetailsRow>
                    <CaveDetailsRow className="smaller">
                      {u.size > 0 ? (
                        <FileSize>{fileSize(u.size)}</FileSize>
                      ) : null}
                      <PlatformIcons className="platform-icons" target={u} />
                    </CaveDetailsRow>
                  </CaveDetails>
                  <Filler />
                  <CaveItemActions>
                    <Button
                      data-upload-id={u.id}
                      icon="install"
                      discreet
                      primary
                      onClick={this.onInstall}
                    >
                      {format(["grid.item.install"])}
                    </Button>
                  </CaveItemActions>
                </CaveItem>
              );
            })}
          </CaveItemList>
        ) : null}
      </ModalWidgetDiv>
    );
  }

  onInstall = (ev: React.MouseEvent<HTMLElement>) => {
    const uploadId = parseInt(ev.currentTarget.dataset.uploadId, 10);
    const params = this.props.modal.widgetParams;
    const { game, allUploads } = params;
    const upload = find(allUploads, { id: uploadId });
    this.props.closeModal({
      action: actions.queueGameInstall({ game, upload }),
    });
  };

  onUninstall = (ev: React.MouseEvent<HTMLElement>) => {
    const caveId = ev.currentTarget.dataset.caveId;
    this.props.closeModal({
      action: actions.queueCaveUninstall({ caveId }),
    });
  };

  onReinstall = (ev: React.MouseEvent<HTMLElement>) => {
    const caveId = ev.currentTarget.dataset.caveId;
    this.props.closeModal({
      action: actions.queueCaveReinstall({ caveId }),
    });
  };

  onExplore = (ev: React.MouseEvent<HTMLElement>) => {
    const caveId = ev.currentTarget.dataset.caveId;
    this.props.exploreCave({ caveId });
  };
}

export interface IManageGameParams {
  game: Game;
  caves: ICave[];
  allUploads: Upload[];
  loadingUploads: boolean;
}

export interface IManageGameResponse {}

interface IProps
  extends IModalWidgetProps<IManageGameParams, IManageGameResponse> {}

const actionCreators = actionCreatorsList("closeModal", "exploreCave");

type IDerivedProps = Dispatchers<typeof actionCreators>;

export default connect<IProps>(ManageGame, { actionCreators });
