import * as React from "react";

import Icon from "../../basics/icon";
import Button from "../../basics/button";
import LoadingCircle from "../../basics/loading-circle";

import format from "../../format";
import styled from "../../styles";

import { connect, Dispatchers, actionCreatorsList } from "../../connect";
import { ISetupOperation } from "../../../types";

import { reportIssue } from "../../../util/crash-reporter";

class BlockingOperation extends React.PureComponent<IProps & IDerivedProps> {
  render() {
    const { retrySetup, blockingOperation } = this.props;

    const { message, icon } = blockingOperation;
    const hasError = icon === "error";
    let iconElement: JSX.Element;
    if (hasError) {
      iconElement = <Icon icon={icon} />;
    } else {
      iconElement = <LoadingCircle wide progress={-1} />;
    }

    return (
      <BlockingOperationDiv>
        {iconElement}
        {format(message)}
        {hasError ? (
          <div className="error-actions">
            <Button
              discreet
              icon="repeat"
              label={format(["login.action.retry_setup"])}
              onClick={() => retrySetup({})}
            />
            <Button
              discreet
              icon="bug"
              label={format(["grid.item.report_problem"])}
              onClick={() =>
                reportIssue({
                  type: "Trouble in setup",
                  body: blockingOperation.stack,
                })
              }
            />
          </div>
        ) : null}
      </BlockingOperationDiv>
    );
  }
}

const BlockingOperationDiv = styled.div`
  font-size: ${props => props.theme.fontSizes.huge};
`;

// props

interface IProps {
  blockingOperation: ISetupOperation;
}

const actionCreators = actionCreatorsList("retrySetup");

type IDerivedProps = Dispatchers<typeof actionCreators>;

export default connect<IProps>(BlockingOperation, { actionCreators });