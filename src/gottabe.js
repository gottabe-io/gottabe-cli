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

const VERSION = '0.0.1-dev';
const defaultServers = [];

var arch = process.arch,
    plat = process.platform,
    build, target, targetName,
    commands = { clean: false, build: false, package: false, install: false, test: false };

const program = require('commander');

program
    .command('clean')
    .description('Clean the files generated in a build.')
    .action(function() {
        commands.clean = true;
    });
program
    .command('build')
    .description('Build the project.')
    .action(function() {
        commands.build = true;
    });
program
    .command('package')
    .description('Package a project previously built.')
    .action(function() {
        commands.package = true;
    });
program
    .command('install')
    .description('Install a project previously packaged.')
    .action(function() {
        commands.install = true;
    });
program
    .command('test')
    .description('Test a project.')
    .action(function() {
        commands.test = true;
    });
program
    .version(VERSION, '-v, --version')
    .option('-T, --target <targetName>', 'Choose a target.')
    .option('-nt, --no-tests', 'No tests will be called after building.')
    .option('--arch <arch>', 'Override the default architecture.')
    .option('--platform <platform>', 'Override the default platform.');

program.parse(process.argv);

if (!(commands.clean || commands.build || commands.package || commands.install || commands.test)) {
    program.help();
}

const fs = require('fs');
const utils = require('./utils.js');
const rjson = require("relaxed-json");
const path = require('path');

const BUILD_FILE = './build.json';

arch = program.arch || arch;

plat = program.platform || plat;

if (!fs.existsSync(BUILD_FILE)) {
    console.error('No ' + BUILD_FILE.substring(2) + ' found in the current directory.');
    process.exit(1);
}

var data = fs.readFileSync(BUILD_FILE);
data = rjson.transform(data.toString());
build = JSON.parse(data);

var defaultBuild = {
    name: '',
    description: '',
    author: '',
    version: '0.0.1',
    type: 'executable', // shared library, static library or executable 
    dependencies: [],
    includeDirs: [],
    sources: [],
    testSources: [],
    targets: [],
    package: {},
    outputDir: '',
    servers: []
};

var defaultTarget = {
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
    linkoptions: { debugInformation: true }
};

build = Object.assign(defaultBuild, build);

console.log('GottaBe v%s is now building your project!', VERSION);

function determinetarget() {
    var targetName = program.target;
    if (!targetName)
        console.log('Trying to find a target for arch: ' + arch + ' and platform ' + plat);
    build.targets.every(function(conf) {
        if (targetName) {
            if (targetName == conf.name) {
                target = Object.assign(defaultTarget, conf);
                return false;
            }
        } else if (conf.arch == arch && conf.platform == plat) {
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

determinetarget();

commands.package |= commands.install;
commands.test |= commands.package && !program.noTests;
commands.build |= commands.package || commands.test;

if (commands.clean) {

    const { execSync } = require('child_process');

    if (fs.existsSync('./build')) {
        if (plat == 'win32')
            execSync('rmdir /S /Q .\\build');
        else
            execSync('rm -f ./build');
    }

}

if (commands.build) {

    const buildjs = require('./build');

    buildjs(target, arch, plat, build, {servers:[]}, function() {
        if (commands.test) {

            if (build.testSources && build.testSources.length > 0) {

                const { execSync } = require('child_process');

                var test_build = Object.assign(build, {
                    type: 'executable',
                    sources: build.testSources.concat(build.sources),
                    package: {
                        name: build.package.name + '_test'
                    }
                });

                var tests_failed = false;

                buildjs(target, arch, plat, test_build, {servers:[]}, function(cmdTest) {
                    try {
                        execSync(path.normalize(cmdTest));
                    } catch (e) {
                        if (e.status != 0) {
                            tests_failed = true;
                            console.log('Tests failed: ' + e.message);
                        }
                    }
                }, true);

                if (tests_failed) {
                    process.exit(1);
                }
                console.log('Tests finished with success.');
            } else {
                console.log('No tests to build.');
            }
        }
    });

} // end of build command

if (commands.package) {

    var destFolder = './build/';
    var targetFolder = './build/' + target.name + '/';

    if (!fs.existsSync(destFolder + 'package')) {
        fs.mkdirSync(destFolder + 'package');
    }
    var destBinFolder = destFolder + 'package/' + target.arch + '_' + target.platform + '_' + target.toolchain;
    if (!fs.existsSync(destBinFolder)) {
        fs.mkdirSync(destBinFolder);
    }
    var indludes = build.package.includes || [];
    if (indludes.length > 0 && !fs.existsSync(destFolder + 'package/include')) {
        fs.mkdirSync(destFolder + 'package/include');
    }
    var tool = require('./' + target.toolchain + '.js');
    var artifactName = tool.artifactName(build, target);

    var fsx = require('fs-extra');
    // copy includes
    indludes.forEach(inc => {
        console.log('Copying ' + inc + ' to package');
        if (utils.isDir(inc)) {
            fsx.copySync(inc, destFolder + 'package/include');
        } else {
            var files = [];
            utils.getFiles(inc, files);
            console.log(files);
            files.forEach(src => {
                var idxBar = src.replace(/\//g, '/').lastIndexOf('/');
                var dest = destFolder + 'package/include/' +
                    (idxBar != -1 ? src.substring(idxBar + 1) : src);
                console.log(src + ' => ' + dest);
                fsx.copySync(src, dest);
            });
        }
    });

    console.log('Copying binaries to package');
    fsx.copySync(targetFolder + 'bin', destBinFolder);

}

if (commands.install) {
    const install = require('./install.js');

    install.installPackage(build);

}

process.nextTick(() => console.log('Build ended.'));

//end of file