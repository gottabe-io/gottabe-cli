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
    .option('-xs, --export-sources', 'Export the sources when build a package.');

program.parse(process.argv);

if (!(commands.clean || commands.build || commands.package || commands.install || commands.test)) {
    program.help();
}

var fs = require('fs');
var pathmod = require('path');
var utils = require('./utils.js');

var rjson = require("relaxed-json");

const BUILD_FILE = './build.json';

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
    options: '',
    defines: {},
    libraryPaths: [],
    libraries: [],
    linkoptions: ''
};

build = Object.assign(defaultBuild, build);

console.log('GottaBe v%s is now building your project!', VERSION);

function determinetarget() {
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
        console.error('Target ' + targetName + ' not found.');
        process.exit(1);
    } else {
        console.log('Target found: ' + target.name);
    }
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
        return destFolder + src.replace(/^.*?\/([a-z0-9_~-]+)\.[a-z0-9_~-]+$/i, '$1.o');
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

    for (var i = 0; i < sourceFiles.length; i++) {
        if (!utils.isOutdated(sourceFiles[i], destFiles[i]))
            continue;
        var cmd = tool.compile(sourceFiles[i], destFiles[i], build.includeDirs.concat(target.includeDirs), target.defines, target.options);
        console.log(cmd);
        try {
            execSync(cmd);
        } catch (e) {
            hasErrors = true;
        }
    }

    if (hasErrors) {
        console.error('Errors found when building ' + target.name);
        process.exit(1);
    }

    var artifactName = tool.artifactName(build, target);

    if (utils.isOutdated(destFiles, destFolder + 'bin/' + artifactName)) {
        var cmd = tool.link(build.type, destFiles, destFolder + 'bin/' + artifactName, target.libraryPaths, target.libraries, target.linkoptions)
        console.log(cmd);
        try {
            execSync(cmd);
        } catch (e) {}
    }
} // end of build command

if (commands.package) {

    var destFolder = './build/' + target.name + '/';

    if (!fs.existsSync(destFolder + 'package')) {
        fs.mkdirSync(destFolder + 'package');
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
            files.forEach(src => {
                var idxBar = src.replace('[/\]', '/').lastIndexOf('/');
                var dest = destFolder + 'package/include/' +
                    (idxBar != -1 ? src.substring(idxBar + 1) : src);
                fsx.copySync(src, dest);
            });
        }
    });

    if (program.exportSources) {
        // TODO export sources
    }

    console.log('Copying binaries to package');
    fsx.copySync(destFolder + 'bin', destFolder + 'package');

}

if (commands.install) {
    const os = require('os');
    var gottabe_packages = os.homedir() + '/.gottabe/packages';

}


//end of file