import { Watcher } from "./watcher";
import { actions } from "../actions";

import { each, findWhere } from "underscore";

import { IStore, ModalResponse } from "../types";

import modalResolves from "./modals-persistent-state";
import { ITypedModal } from "../components/modal-widgets/index";

// look, so this probably breaks the spirit of redux, not denying it,
// but also, redux has a pretty strong will, I'm sure it'll recover.

export async function promisedModal<Params, Response>(
  store: IStore,
  payload: ITypedModal<Params, Response>
): Promise<Response> {
  const modalAction = actions.openModal(payload);
  const { id } = modalAction.payload;

  const p = new Promise<any>(resolve => {
    modalResolves[id] = resolve;
  });

  store.dispatch(modalAction);
  return await p;
}

export default function(watcher: Watcher) {
  watcher.on(actions.closeModal, async (store, outerAction) => {
    const { payload = {} } = outerAction;
    const { action, id } = payload;

    const modals = store.getState().modals;
    let modal = modals[0];
    if (id) {
      modal = findWhere(modals, { id });
    }

    let response: ModalResponse = null;
    if (action) {
      if (Array.isArray(action)) {
        each(action, a => store.dispatch(a));
      } else {
        store.dispatch(action);
        if (action.type === "modalResponse") {
          response = action.payload;
        }
      }
    }

    store.dispatch(
      actions.modalClosed({
        id: modal ? modal.id : id,
        response,
      })
    );
  });

  watcher.on(actions.modalClosed, async (store, outerAction) => {
    const { id, response } = outerAction.payload;

    const resolve = modalResolves[id];
    if (resolve) {
      resolve(response);
    }
  });
}
