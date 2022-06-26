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

import {BuildConfig, Phase, TargetConfig, VERSION} from './base_types';
import {getCommandLine} from './command_line';
import fs from 'fs';
import utils from './utils';
import {doTheBuild} from './main_flow';
import {initConfig} from "./config";

let build : BuildConfig, target : TargetConfig | undefined;

const commands = getCommandLine();

initConfig(commands.settingsFile);

const BUILD_FILES = ['./build.yml', './build.yaml', './build.json'];

const findBuildFile = () : (string | undefined) => {
	return BUILD_FILES.filter(fs.existsSync)[0];
};

const BUILD_FILE = findBuildFile();

if (!(BUILD_FILE)) {
    console.error('No build configuration found in the current directory.');
    process.exit(1);
}

build = utils.parseBuild(BUILD_FILE);
try {
	utils.validateBuild(build);
} catch(e:any) {
    console.error(e.message);
    process.exit(1);
}

const defaultTarget: TargetConfig = {
    name: '',
    arch: '',
    platform: '',
    toolchain: '',
    includeDirs: [],
    sources: [],
    options: { optimization: 0, debug: 3, warnings: 'all', other: '' },
    defines: {},
    libraryPaths: [],
    libraries: [],
    linkOptions: { debugInformation: true }
};

const defaultBuild: BuildConfig = {
    groupId: '',
    artifactId: '',
    version: '',
    type: 'executable',
    description: '',
    author: '',
    source: '',
    sources: [],
    targets: [defaultTarget],
    package: {},
    servers: []
};

build = Object.assign(defaultBuild, build);

console.log('GottaBe v%s is now building your project!', VERSION);

function determineTarget() {
    let targetName = commands.target;
    if (!targetName)
        console.log('Trying to find a target for arch: ' + commands.arch + ' and platform ' + commands.platform);
    build.targets?.every(function(conf : any) {
        if (targetName) {
            if (targetName == conf.name) {
                target = Object.assign(defaultTarget, conf);
                return false;
            }
        } else if (conf.arch == commands.arch && conf.platform == commands.platform) {
            target = Object.assign(defaultTarget, conf);
            return false;
        }
        return true;
    });
    if (!target) {
        console.error('Target ' + (targetName ? targetName + ' ' : '') + 'not found.');
        process.exit(1);
    } else {
        console.log('Target found: ' + target.name);
    }
}

determineTarget();

commands.package = commands.package || commands.install || commands.publish;
commands.test = (commands.test || commands.package) && !commands.noTests;
commands.build = commands.build || commands.package || commands.test;

let phases : Phase[] = [];

if (commands.clean) {
	phases.push(Phase.CLEAN);
}
if (commands.build) {
	phases.push(Phase.RESOLVE_DEPENDENCIES);
    phases.push(Phase.PRECOMPILE);
	phases.push(Phase.COMPILE);
    phases.push(Phase.PRELINK);
	phases.push(Phase.LINK);
}
if (commands.test) {
	phases.push(Phase.TEST);
}
if (commands.package) {
	phases.push(Phase.PREPACKAGE);
    phases.push(Phase.PACKAGE);
}
if (commands.install) {
    phases.push(Phase.PREINSTALL);
	phases.push(Phase.INSTALL);
}
if (commands.publish) {
    phases.push(Phase.PREPUBLISH);
    phases.push(Phase.PUBLISH);
}
phases.push(Phase.FINISH);

if (target)
    doTheBuild(commands, phases, build, target)
        .catch((e) => console.error(e));

process.nextTick(() => console.log('Build ended.'));

//end of file
