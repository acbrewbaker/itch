
export type GameType = "default" | "html" | "download";

/**
 * Contains information about a game, retrieved via the itch.io API,
 * and saved to the local database.
 */
export interface IGameRecord {
    /** itch.io-generated unique identifier */
    id: number;

    /** human-friendly title (may contain any character) */
    title: string;

    /** human-friendly short description */
    shortText: string;

    /** non-GIF cover url */
    stillCoverUrl?: string;

    /** cover url (might be a GIF) */
    coverUrl: string;

    /** downloadable game, html game, etc. */
    type: GameType;

    /** Only present for HTML5 games, otherwise null */
    embed?: IGameEmbedInfo;
}

/**
 * Presentation information for HTML5 games
 */
export interface IGameEmbedInfo {
    width: number;
    height: number;

    // for itch.io website, whether or not a fullscreen button should be shown
    fullscreen: boolean;
}

export interface IUserRecord {
    /** itch.io-generated unique identifier */
    id: number;

    /** human-friendly account name (may contain any character) */
    displayName: string;

    /** used for login, may be changed */
    username: string;

    /** avatar URL, may be gif */
    coverUrl: string;

    /** non-GIF avatar */
    stillCoverUrl?: string;
}

export interface ICollectionRecord {
    /** itch.io-generated unique identifier */
    id: number;

    /** human-friendly title, may contain any character */
    title: string;

    /** total number of games in collection */
    gamesCount: number;
}

export interface IInstallLocationRecord {
    /** UUID or 'default' */
    id: string;

    /** path on disk, null for 'default' (since it's computed) */
    path?: string;
}

export interface ITabDataSet {
    [key: string]: ITabData;
}

export interface IGameRecordSet {
    [id: number]: IGameRecord;
}

export interface ITabData {
    /** path of tab, something like `collections/:id`, etc. */
    path?: string;

    /** title of web page displayed by tab, if any */
    webTitle?: string;

    /** name of tab as shown in sidebar */
    label: string;

    /** subtitle shown under label when tab is shown */
    subtitle?: string;

    /** used for game tabs or collection tabs */
    games?: IGameRecordSet;

    /** image to show before label when tab is shown */
    image?: string;

    /** do we have enough duplicate image properties already? */
    iconImage?: string;

    /** special CSS class applied to image shown in tab */
    imageClass?: string;
}

/** Describes an installed item, that can be launched or opened */
export interface ICaveRecord {
    /* unique GUID generated locally */
    id: string;

    /** name of the install location: 'default' or a GUID */
    installLocation?: string;

    /** name of the install folder in the install location, derived from the game's title */
    installFolder?: string;

    /** scheme used for computing paths: see util/pathmaker */
    pathScheme: number;
}

export interface IUploadRecord {
    /** numeric identifier generated by itch.io */
    id: number;

    /** name of the uploaded file - null for external uploads */
    filename?: string;

    /** if this is a wharf-enabled upload, identifier of the latest build */
    buildId: number;

    /** set to 'html' for HTML5 games */
    type: string;
}

export interface IMarket {
    saveEntity: (table: string, id: string, payload: any) => void;
}

// see https://itch.io/docs/itch/integrating/manifest.html
export interface IManifestAction {
    name: string;
    path: string;
    icon: string;
    args: Array<string>;
    sandbox: boolean;
    scope: string;
}

export interface IManifest {
    actions: Array<IManifestAction>;
}
