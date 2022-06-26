/* Copyright (C) 2018 Alan N. Lohse

   This file is part of GottaBe.

    GottaBe is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    GottaBe is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
	along with GottaBe.  If not, see <http://www.gnu.org/licenses/> */

import {
    BuildConfig,
    CommandLineOptions,
    PackageManager,
    Phase,
    PhaseParams,
    Plugin,
    PluginConfig,
    PluginContext,
    PluginDescriptor,
    Project,
    TargetConfig
} from "gottabe-plugin-dev";
import {DEFAULT_BUILD_PLUGIN, DEFAULT_SERVER, DEFAULT_TEST_PLUGIN} from "./constants";
import {pluginManager} from "./plugin_manager";
import {CleanPhase} from "./clean_phase";
import {DependenciesPhase} from "./dependencies";
import {PreCompilePhase, PreLinkPhase} from "./build";
import {packageManager, PackagePhase} from "./package_manager";
import {BuildPhase} from "./base_types";
import {InstallPhase} from "./install";

/**
 * Check if the plugin has the specific phases for building
 * @param plugin the plugin descriptor
 */
function isBuilder(plugin: PluginDescriptor): boolean {
    let phases = (plugin.phases || []);
    return phases.indexOf(Phase[Phase.COMPILE].toLowerCase()) != -1
        && phases.indexOf(Phase[Phase.LINK].toLowerCase()) != -1;
}

/**
 * Check if the plugin has the specific phases for testing
 * @param plugin the plugin descriptor
 */
function isTester(plugin: PluginDescriptor): boolean {
    let phases = (plugin.phases || []);
    return phases.indexOf(Phase[Phase.TEST].toLowerCase()) != -1;
}

/**
 * Load all plugins
 * @param plugins
 * @param phases
 * @param servers
 */
async function loadPlugins(plugins: PluginConfig[], phases: Phase[], servers: string[]) {
    let pluginDescs = await pluginManager.mapPlugins(plugins, servers);
    // if no builder plugin configured, load the default
    if (pluginDescs.filter(isBuilder).length == 0 && (phases.indexOf(Phase.COMPILE) != -1 || phases.indexOf(Phase.COMPILE) != -1)) {
        let builder = await pluginManager.mapPlugins([{package: DEFAULT_BUILD_PLUGIN}], servers);
        pluginDescs.push(builder[0]);
    }
    // if no tester plugin configured, load the default
    if (pluginDescs.filter(isTester).length == 0 && phases.indexOf(Phase.TEST) != -1) {
        let tester = await pluginManager.mapPlugins([{package: DEFAULT_TEST_PLUGIN}], servers);
        pluginDescs.push(tester[0]);
    }
    let spec = (plg: PluginDescriptor) =>  plg.groupId + '/' + plg.artifactId + '@' + plg.version;
    let noCachedPlugins = await Promise.all(pluginDescs.filter((plg) => !pluginManager.isInCache(spec(plg))));
    await Promise.all(noCachedPlugins.map((plg) => pluginManager.downloadPlugin(plg, servers)));
    return Promise.all(pluginDescs.map((plg) => pluginManager.loadPlugin(spec(plg))));
}

class EmptyPhase implements BuildPhase {
    async build(phaseParams: PhaseParams): Promise<void> {
    }
}

const EMPTY_PHASE = new EmptyPhase();

/**
 * Convert phase into phase implementations
 * @param phase
 */
function getPhaseInstance(phase: Phase) {
    switch (phase) {
        case Phase.CLEAN:
            return new CleanPhase();
        case Phase.RESOLVE_DEPENDENCIES:
            return new DependenciesPhase();
        case Phase.PRECOMPILE:
            return new PreCompilePhase();
        case Phase.COMPILE:
            return EMPTY_PHASE;
        case Phase.PRELINK:
            return new PreLinkPhase();
        case Phase.LINK:
            return EMPTY_PHASE;
        case Phase.PREPACKAGE:
            return EMPTY_PHASE;
        case Phase.PACKAGE:
            return new PackagePhase();
        case Phase.PREINSTALL:
            return EMPTY_PHASE;
        case Phase.INSTALL:
            return new InstallPhase();
        case Phase.PREPUBLISH:
            return EMPTY_PHASE;
        case Phase.PUBLISH:
            return EMPTY_PHASE;
        case Phase.FINISH:
            return EMPTY_PHASE;
    }
    throw new Error('Phase not implemented: ' + Phase[phase]);
}

/**
 * Create phase parameters
 * @param phase
 * @param commands
 * @param project
 * @param build
 * @param target
 * @param old
 */
function createPhase(phase: Phase, commands: CommandLineOptions, project: Project, build: BuildConfig, target: TargetConfig, old: PhaseParams | undefined): PhaseParams {
    return {
        buildConfig: build,
        currentTarget: target,
        commandOptions: commands,
        inputFiles: old?.inputFiles || [],
        project: project,
        phase: phase,
        previousPhaseParams: old,
        solvedDependencies: old?.solvedDependencies,
        defaultPrevented: false,
        get preventDefault() {
            return () => {
                this.defaultPrevented = true;
            };
        }
    };
}

/**
 * Execute all plugins from a list
 * @param plugins
 * @param phase
 * @param project
 * @param phaseParams
 */
async function callPlugins(plugins: { plugin: Plugin; descriptor: PluginConfig }[], phase: Phase, project: Project, phaseParams: PhaseParams) {
    await Promise.all(plugins
        .filter(plg => !plg.descriptor.phases || plg.descriptor.phases.length == 0 || plg.descriptor.phases.indexOf(Phase[phase].toLowerCase()) != -1)
        .map(async (plg) => {
            let pluginContext: PluginContext = {
                getPackageManager: (): PackageManager => {
                    return packageManager;
                },
                getCurrentProject: (): Project => {
                    return project;
                },
                getPluginConfig: (): any => {
                    return plg.descriptor.config;
                },
            };
            await plg.plugin.process(phaseParams, pluginContext)
        }));
}

/**
 * Do the build
 * @param commands
 * @param phases
 * @param build
 * @param target
 */
export const doTheBuild = async (commands: CommandLineOptions, phases: Phase[], build: BuildConfig, target: TargetConfig) => {
    let pluginDescs = (build.plugins || []).concat(target.plugins || []);
    let servers = (build.servers || []).concat([DEFAULT_SERVER]);

    let phaseRunners = phases.map(phase => ({phase, instance: getPhaseInstance(phase)}));
    let plugins = (await loadPlugins(pluginDescs, phases, servers))
        .map((plg, index) => ({plugin: plg, descriptor: pluginDescs[index]}));

    let project: Project = {
        getBuildConfig: (): BuildConfig => build,
        getGroupId: (): string => build.groupId,
        getArtifactId: (): string => build.artifactId,
        getVersion: (): string => build.version,
        getCurrentTarget: (): TargetConfig => target,
        getBaseDir: (): string => __dirname,
        getBuildDir: (): string => './build',
        getDependencyDir: (): string => './build/deps'

    };

    let phaseParams: PhaseParams | undefined = undefined;

    for (const phase of phaseRunners) {
        phaseParams = createPhase(phase.phase, commands, project, build, target, phaseParams);
        await callPlugins(plugins, phase.phase, project, phaseParams);
        if (!phaseParams.defaultPrevented)
            await phase.instance.build(phaseParams);
    }
};

