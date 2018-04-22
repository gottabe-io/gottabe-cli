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
const pathmod = require('path');
const utils = require('./utils.js');
const rjson = require("relaxed-json");
const install = require('./install.js');
const Set = require('es6-set');

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

function uniqueArray(array) {
    return Array.from(new Set(array));
}

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
    repositories: []
};

var defaultTarget = {
    name: '',
    arch: '',
    platform: '',
    toolchain: '',
    includeDirs: [],
    sources: [],
    options: {optimization : 0, debug : 3, warnings : 'all', other :''},
    defines: {},
    libraryPaths: [],
    libraries: [],
    linkoptions: {debugInformation : true}
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

function findTarget(build, arch, plat, toolchain) {
    var targs = build.targets.filter(conf =>
        conf.arch == arch && conf.platform == plat && conf.toolchain == toolchain
    );
    if (targs.length > 0)
        return targs[0];
    throw new Error('No target found for the dependency');
}

determinetarget();

commands.package |= commands.install;
commands.build |= commands.package;

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

    var tool = require('./' + target.toolchain + '.js');

    var sources = build.sources;
    if (target.sources)
        sources = sources.concat(target.sources);

    var sourceFiles = [];

    sources.forEach(path => utils.getFiles(path, sourceFiles));

    var destFolder = './build/' + target.name + '/';

    var destFiles = sourceFiles.map(function(src) {
        return destFolder + src.replace(/^.*?\/([a-z0-9_~-]+)\.[a-z0-9_~-]+$/i, '$1');
    });

    const { execSync } = require('child_process');

    if (!fs.existsSync('./build')) {
        fs.mkdirSync('./build');
    }

    if (!fs.existsSync('./build/' + target.name)) {
        fs.mkdirSync('./build/' + target.name);
    }

    if (!fs.existsSync(destFolder + 'bin')) {
        fs.mkdirSync(destFolder + 'bin');
    }

    var hasErrors = false;

    var packages = [];
    build.dependencies.forEach(dep => {
        install.getPackage(dep, arch, plat, target.toolchain, packages);
    });
    var includeDeps = uniqueArray(packages.map(pack => pack.includeDir));

    for (var i = 0; i < sourceFiles.length; i++) {
        if (!utils.isOutdated(sourceFiles[i], destFiles[i] + '.' + tool.OBJECT_EXTENSION))
            continue;
        var cmd = tool.compile(sourceFiles[i], destFiles[i], build.includeDirs.concat(target.includeDirs).concat(includeDeps), target.defines, target.options);
        console.log(cmd);
        try {
            execSync(cmd);
        } catch (e) {
            hasErrors = true;
            console.log(e.output.toString());
        }
    }

    if (hasErrors) {
        console.error('Errors found when building ' + target.name);
        process.exit(1);
    }

    var artifactName = tool.artifactName(build, target);

    var apt = arch + '_' + plat + '_' + build.toolchain;
    // get the library paths and libraries from dependencies
    var libraryPathDeps = uniqueArray(packages.map(pack => pack[apt])), 
        libraryDeps = packages.map(pack => pack.build.package.name);

    // get all libraries from dependencies for the target
    packages.forEach(pack => {
        var target = findTarget(pack.build, arch, plat, toolchain);
        libraryDeps = libraryDeps.concat(target.libraries);
    });

    if (utils.isOutdated(destFiles.map(s => s + '.' + tool.OBJECT_EXTENSION), destFolder + 'bin/' + artifactName)) {
        var cmd = tool.link(build.type, destFiles, destFolder + 'bin/' + artifactName, target.libraryPaths.concat(libraryPathDeps), 
                uniqueArray(target.libraries.concat(libraryDeps)), target.linkoptions)
        console.log(cmd);
        try {
            execSync(cmd);
        } catch (e) {
            console.log(e.output.toString());
        }
    }
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

    install.installPackage(build);

}


//end of file