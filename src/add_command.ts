import utils from './utils';
import YAML from "yaml";
import {BuildDescriptor, PackageInfo, PluginConfig} from './base_types';
import packs from './packages';
import client from './client';
import {DEFAULT_SERVERS} from './constants';

const packageService = client.packageService;

const addToDependencyBuild = async (build: BuildDescriptor, depToAdd: PackageInfo, commandArgs: any, BUILD_FILE: string, _target?: string) => {
    let foundIndex = -1;
    let found: PackageInfo | undefined;
    if (!build.dependencies)
        build.dependencies = [];
    let packDesc: string = typeof commandArgs == 'string' ? commandArgs : commandArgs[0];
    build.dependencies.map(packs.parse).every((dep, index) => {
        if (dep.groupId == depToAdd.groupId && dep.artifactId == depToAdd.artifactId) {
            foundIndex = index;
            found = dep;
            return false;
        }
        return true;
    });
    let foundInServer = false;
    for (let server in DEFAULT_SERVERS) {
        try {
            await packageService.packageReleases(depToAdd.groupId, depToAdd.artifactId, depToAdd.version, undefined, {baseUrl: server});
            foundInServer = true;
            break;
        } catch (e) {
        }
    }
    if (!foundInServer) {
        throw new Error('can\'t find');
    }
    let dependencies = build.dependencies;
    if (found) {
        if (utils.compareVersion(depToAdd.version, found.version) > 0) {
            console.log('Found dependency in version %s, upgrading to %s', found.version, depToAdd.version);
            dependencies[foundIndex] = packDesc;
        } else {
            console.log('Found dependency in version %s. Using newer version.', found.version);
        }
    } else {
        dependencies.push(packDesc);
    }
    let data: string;
    if (BUILD_FILE.endsWith('.json'))
        data = JSON.stringify(build, null, 4);
    else if (BUILD_FILE.endsWith('.yml') || BUILD_FILE.endsWith('.yaml'))
        data = YAML.stringify(build);
    else throw new Error('Invalid file type');
    utils.writeFileSync(BUILD_FILE, data);
}

const addToPlugin = async (build: BuildDescriptor, depToAdd: PackageInfo, commandArgs: any[], BUILD_FILE: string, target?: string) => {
    let foundIndex = -1;
    let found: PackageInfo | undefined;
    let plugins: PluginConfig[];
    const packStrToPlugin = (cfg: PluginConfig): PackageInfo => packs.parse(cfg.package);
    if (target) {
        let foundTargets = build.targets?.filter(tgt => tgt.name == target);
        if (foundTargets && foundTargets.length > 0) {
            if (!foundTargets[0].plugins) foundTargets[0].plugins = [];
            plugins = foundTargets[0].plugins;
        } else {
            throw new Error("Target not found: " + target);
        }
    } else {
        if (!build.plugins)
            build.plugins = [];
        plugins = build.plugins;
    }
    plugins.map(packStrToPlugin).every((dep, index) => {
        if (dep.groupId == depToAdd.groupId && dep.artifactId == depToAdd.artifactId) {
            foundIndex = index;
            found = dep;
            return false;
        }
        return true;
    });
    if (!found && target) {
        (build.plugins || []).map(packStrToPlugin).every((dep, index) => {
            if (dep.groupId == depToAdd.groupId && dep.artifactId == depToAdd.artifactId) {
                foundIndex = index;
                found = dep;
                return false;
            }
            return true;
        });
    }
    let foundInServer = false;
    for (let server in DEFAULT_SERVERS) {
        try {
            await packageService.packageReleases(depToAdd.groupId, depToAdd.artifactId, depToAdd.version, "plugin", {baseUrl: server});
            foundInServer = true;
            break;
        } catch (e) {
        }
    }
    if (!foundInServer) {
        throw new Error('can\'t find');
    }
    if (found) {
        if (utils.compareVersion(depToAdd.version, found.version) > 0) {
            console.log('Found dependency in version %s, upgrading to %s', found.version, depToAdd.version);
            plugins[foundIndex] = {package: commandArgs[0]};
        } else {
            console.log('Found dependency in version %s. Using newer version.', found.version);
        }
    } else {
        plugins.push({package: commandArgs[0]});
    }
    let data: string;
    if (BUILD_FILE.endsWith('.json'))
        data = JSON.stringify(build, null, 4);
    else if (BUILD_FILE.endsWith('.yml') || BUILD_FILE.endsWith('.yaml'))
        data = YAML.stringify(build);
    else throw new Error('Invalid file type');
    utils.writeFileSync(BUILD_FILE, data);
}


export const addToProject = async (commandArgs?: any, plugin?: boolean, target?: string) => {
    const BUILD_FILE = utils.findBuildFile();

    if (!(BUILD_FILE)) {
        console.error('No build configuration found in the current directory.');
        process.exit(1);
    }

    if (!commandArgs || commandArgs.length == 0)
        throw new Error('Expecting the dependency');

    let build : BuildDescriptor = utils.parseBuild(BUILD_FILE);
    if (!build) throw new Error('Failed to load build descriptor!');
    let depToAdd = packs.parse(typeof commandArgs == 'string' ? commandArgs : commandArgs[0]);
    if (plugin) {
        await addToPlugin(build, depToAdd, commandArgs, BUILD_FILE, target);
    } else {
        await addToDependencyBuild(build, depToAdd, commandArgs, BUILD_FILE, target);
    }

};
