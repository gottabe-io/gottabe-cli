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

import {CommandLineOptionsEx, VERSION} from './base_types';
import {getCommandLine} from './command_line';
import utils from './utils';
import {initConfig} from "./config";

console.log('GottaBe v%s is now initiating your project!', VERSION);

const commands = <CommandLineOptionsEx>getCommandLine();

initConfig(commands.settingsFile);

async function noBuildCommands() {
    let execution: Promise<void>;
    switch (commands.nonBuildCommand) {
        case 'init':
            execution = (await import('./init_command')).initProject();
            break;
        case 'add':
            execution = (await import('./add_command')).addToProject(commands.commandArgs, commands.plugin);
            break;
        case 'remove':
            execution = (await import('./rem_command')).removeFromProject(commands.commandArgs, commands.plugin);
            break;
        default:
            throw new Error('Unknown command');
    }
    execution
        .then(() => console.log('Build ended.'))
        .catch((e) => console.error(e));
}

function buildPluginIfExists(pluginDesc: string | undefined) {
    if (!pluginDesc)
        return false;

    import('./plugin_build').then((pluginBuild => pluginBuild.buildPlugin(pluginDesc, commands)));

    return true;
}

function buildIfExists(buildFile: string | undefined) {

    if (!(buildFile))
        return false;

    import('./main_flow').then((mainFlow) => mainFlow.build(buildFile, commands));

    return true;
}

if (commands.nonBuildCommand) {
    noBuildCommands().catch(console.error);
} else if (!buildIfExists(utils.findBuildFile()) && !buildPluginIfExists(utils.findPluginFile())) {
    console.error('No build configuration found in the current directory.');
    process.exit(1);
}

//end of file
