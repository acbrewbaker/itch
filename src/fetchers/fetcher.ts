import { ICredentials, Retry, isRetry, ITabData } from "../types";
import * as bluebird from "bluebird";
import { indexBy, pluck } from "underscore";

import { actions } from "../actions";

import defaultApiClient, { AuthenticatedClient, Client } from "../api";
import { isNetworkError } from "../net/errors";

import { sortAndFilter, ISortAndFilterOpts } from "./sort-and-filter";

import Context from "../context";

export enum FetchReason {
  TabChanged,
  TabEvolved,
  TabReloaded,
  WindowFocused,
  TabParamsChanged,
  CommonsChanged,
}

import rootLogger, { Logger } from "../logger";
import { Space } from "../helpers/space";
import { Game } from "node-buse/lib/messages";
import { ICollection } from "../db/models/collection";

interface OptionalFetcherParams {
  apiClient?: Client;
}

/**
 * Fetches all the data a tab needs to display, except webviews.
 * This can be games, users, etc.
 * Should return info from local DB as soon as possible, and fresh data from
 * API afterwards.
 */
export class Fetcher {
  ctx: Context;
  tab: string;
  reason: FetchReason;
  aborted = false;

  startedAt: number;
  logger?: Logger;
  apiClient: Client;

  retryCount = 0;

  hook(
    ctx: Context,
    tab: string,
    reason: FetchReason,
    params: OptionalFetcherParams = {}
  ) {
    this.ctx = ctx;
    this.tab = tab;
    this.reason = reason;
    this.apiClient = params.apiClient || defaultApiClient;

    this.logger = rootLogger.child({
      name: `${this.constructor.name} :: ${this.space().url()}`,
    });

    this.logger.debug(`fetching (${FetchReason[reason]})`);
  }

  tabName(): string {
    return this.space().url();
  }

  private async doWork() {
    if (this.reason === FetchReason.TabEvolved || this.space().isSleepy()) {
      // always show a spinner when getting a new path
      await this.withLoading(async () => {
        await this.work();
      });
    } else {
      await this.work();
    }
  }

  async run() {
    this.startedAt = Date.now();

    const { session } = this.ctx.store.getState();
    if (
      !session ||
      !session.credentials ||
      !session.credentials.me ||
      !session.credentials.me.id
    ) {
      this.logger.info(`No credentials yet, skipping`);
      return;
    }

    let retriableError: Error;
    let first = true;
    while (first || retriableError) {
      first = false;
      retriableError = null;

      try {
        await this.doWork();
      } catch (e) {
        if (isRetry(e)) {
          retriableError = e;
        } else {
          this.logger.error(`Non-retriable error in work:\n${e.stack}`);
          return;
        }
      }

      if (retriableError) {
        this.retryCount++;
        if (this.retryCount > 8) {
          this.logger.error(
            `Too many retries, giving up: ${retriableError.stack}`
          );
          return;
        } else {
          let sleepTime = 100 * Math.pow(2, this.retryCount);
          this.logger.debug(`${retriableError} (${sleepTime}ms)`);
          await bluebird.delay(sleepTime);
        }
      }
    }
  }

  async withApi<T>(cb: (api: AuthenticatedClient) => Promise<T>): Promise<T> {
    const { key } = this.ensureCredentials();
    const api = this.apiClient.withKey(key);
    try {
      return await cb(api);
    } catch (e) {
      if (isNetworkError(e)) {
        this.retry(e.message);
      } else {
        this.logger.error(`API error: ${e.stack}`);
        throw e;
      }
    }
  }

  /**
   * Overriden by sub classes, actual fetch logic goes here
   * Ideally, should listen for "abort" on `this.emitter` and react accordingly
   */
  async work(): Promise<void> {
    throw new Error(`fetchers should override work()!`);
  }

  async withLoading<T>(cb: () => Promise<T>): Promise<T> {
    this.ctx.store.dispatch(
      actions.tabLoading({ tab: this.tab, loading: true })
    );

    try {
      return await cb();
    } finally {
      this.ctx.store.dispatch(
        actions.tabLoading({ tab: this.tab, loading: false })
      );
    }
  }

  /**
   * Called by work when data is available.
   */
  push(data: ITabData, { shallow }: { shallow: boolean } = { shallow: false }) {
    if (this.ctx.isDead()) {
      return;
    }

    const payload = {
      tab: this.tab,
      data,
      shallow,
    };
    const action = actions.tabDataFetched(payload);
    this.ctx.store.dispatch(action);
  }

  pushCollection(c: ICollection) {
    this.push({
      collections: {
        ids: [c.id],
        set: {
          [c.id]: c,
        },
      },
    });
  }

  pushGame(g: Game) {
    this.push({
      games: {
        ids: [g.id],
        set: {
          [g.id]: g,
        },
        totalCount: 1,
      },
    });
  }

  retry(why: string) {
    throw new Retry(why);
  }

  debug(msg: string, ...args: any[]) {
    this.logger.debug(msg, ...args);
  }

  warrantsRemote(reason: FetchReason) {
    switch (reason) {
      case FetchReason.TabParamsChanged:
        return false;
      default:
        return true;
    }
  }

  ensureCredentials(): ICredentials {
    const { credentials } = this.ctx.store.getState().session;
    if (!credentials || !credentials.me) {
      this.retry("missing credentials");
    }

    return credentials;
  }

  private _space: Space;
  space(): Space {
    if (!this._space) {
      this._space = Space.fromStore(this.ctx.store, this.tab);
    }
    return this._space;
  }

  pushUnfilteredGames(input: Game[], opts: ISortAndFilterOpts = {}) {
    let t1 = Date.now();
    const games = this.sortAndFilter(input, opts);
    let t2 = Date.now();
    this.logger.debug(
      `Pushing games, ${input.length} => ${games.length} (in ${(
        t2 - t1
      ).toFixed()}ms)`
    );

    this.push({
      games: {
        set: indexBy(input, "id"),
        allIds: pluck(input, "id"),
        ids: pluck(games, "id"),
        totalCount: input.length,
      },
    });
  }

  pushFilteredGames(input: Game[], totalCount: number) {
    this.push({
      games: {
        set: indexBy(input, "id"),
        ids: pluck(input, "id"),
        totalCount,
      },
    });
  }

  sortAndFilter(input: Game[], opts: ISortAndFilterOpts = {}): Game[] {
    return sortAndFilter(input, this.tab, this.ctx.store, opts);
  }

  clean() {
    this.logger.warn(`clean(): stub!`);
  }
}
