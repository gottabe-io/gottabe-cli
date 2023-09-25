import {DEFAULT_SERVERS, GOTTABE_LOCAL_REPO} from "./constants";
import utils from './utils';

interface ProxyConfig {
    readonly host: string;
    readonly port?: number;
}

interface ServerConfig {
    readonly id?: string;
    readonly url: string;
    readonly description?: string;
}

export interface Config {
    readonly localRepository?: string;
    readonly token?: string;
    readonly proxy?: ProxyConfig;
    readonly servers?: Array<ServerConfig>;
    getPackagesPath() : string;
    getPluginsPath() : string;
}

let config: Config = {
    localRepository: GOTTABE_LOCAL_REPO,
    servers: DEFAULT_SERVERS.map((s: string) => ({url: s})),
    getPackagesPath: () : string => {
        return config.localRepository + '/packages';
    },
    getPluginsPath: () : string => {
        return config.localRepository + '/plugins';
    },
};

export const getConfig = () => config;

export const initConfig = (configFile?: string) => {
    configFile = configFile || (GOTTABE_LOCAL_REPO + '/config.yml');
    let data : any = utils.parseBuild(configFile) || {};
    data = Object.assign({}, data, config);
    config = data;
};
