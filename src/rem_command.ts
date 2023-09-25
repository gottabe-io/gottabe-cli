import utils from './utils';
import YAML from "yaml";
import {BuildDescriptor, PackageInfo, PluginConfig} from './base_types';
import packs from './packages';

const removeDependency = async (build: BuildDescriptor, depToAdd: PackageInfo, commandArgs: any[], BUILD_FILE: string, _target?: string) => {
    if (!build.dependencies)
        build.dependencies = [];
    build.dependencies = build.dependencies.filter((depStr) => {
        let dep = packs.parse(depStr);
        if (dep.groupId == depToAdd.groupId && dep.artifactId == depToAdd.artifactId) {
            return false;
        }
        return true;
    });
    let data: string;
    if (BUILD_FILE.endsWith('.json'))
        data = JSON.stringify(build, null, 4);
    else if (BUILD_FILE.endsWith('.yml') || BUILD_FILE.endsWith('.yaml'))
        data = YAML.stringify(build);
    else throw new Error('Invalid file type');
    utils.writeFileSync(BUILD_FILE, data);
}

const removePlugin = async (build: BuildDescriptor, depToAdd: PackageInfo, commandArgs: any[], BUILD_FILE: string, target?: string) => {
    const packStrToPlugin = (cfg: PluginConfig): PackageInfo => packs.parse(cfg.package);
    if (target) {
        let foundTargets = build.targets?.filter(tgt => tgt.name == target);
        if (foundTargets && foundTargets.length > 0) {
            foundTargets[0].plugins = (foundTargets[0].plugins || []).filter((depStr) => {
                let dep = packStrToPlugin(depStr);
                if (dep.groupId == depToAdd.groupId && dep.artifactId == depToAdd.artifactId) {
                    return false;
                }
                return true;
            });
        } else {
            throw new Error("Target not found: " + target);
        }
    } else {
        build.plugins = (build.plugins || []).filter((depStr) => {
            let dep = packStrToPlugin(depStr);
            if (dep.groupId == depToAdd.groupId && dep.artifactId == depToAdd.artifactId) {
                return false;
            }
            return true;
        });
    }
    let data: string;
    if (BUILD_FILE.endsWith('.json'))
        data = JSON.stringify(build, null, 4);
    else if (BUILD_FILE.endsWith('.yml') || BUILD_FILE.endsWith('.yaml'))
        data = YAML.stringify(build);
    else throw new Error('Invalid file type');
    utils.writeFileSync(BUILD_FILE, data);
}


export const removeFromProject = async (commandArgs?: any[], plugin?: boolean, target?: string) => {
    const BUILD_FILE = utils.findBuildFile();

    if (!(BUILD_FILE)) {
        console.error('No build configuration found in the current directory.');
        process.exit(1);
    }

    if (!commandArgs || commandArgs.length == 0)
        throw new Error('Expecting the dependency');

    let build : BuildDescriptor = utils.parseBuild(BUILD_FILE);
    if (!build) throw new Error('Failed to load build descriptor!');
    let depToAdd = packs.parse(commandArgs[0]);
    if (plugin) {
        await removePlugin(build, depToAdd, commandArgs, BUILD_FILE, target);
    } else {
        await removeDependency(build, depToAdd, commandArgs, BUILD_FILE, target);
    }

};
