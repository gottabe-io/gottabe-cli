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

var arch = process.arch,
    plat = process.platform,
    build, target, targetName, commands = [];

(function(){
    var args = process.argv.splice(2,Number.MAX_VALUE);
    function syntaxCheck(i){
        if (i >= args.length) {
            console.error('Syntax error\nTry to call "gonnabe help" to see help.');
            process.exit(1);
        }
    }
    
    for (var i = 0; i < args.length; ++i) {
        if (args[i].startsWith('-')) {
            var option = args[i].substring(1);
            if (option == 'T') {
                syntaxCheck(++i);
                targetName = args[i];
            }
        } else {
            commands.push(args[i]);
        }
    }
})();

var fs = require('fs');
var pathmod = require('path');

var rjson = require("./relaxed-json.js");

var data = fs.readFileSync('./build.json');
data = rjson.transform(data.toString());
build = JSON.parse(data);

var defaultBuild = {
    name : '',
    description: '',
    author:'',
    version: '0.0.1',
    type : 'executable', // shared library, static library or executable 
    dependencies : [],
    includeDirs : [],
    sources:[],
    targets : [],
    package : {},
    outputDir : '',
    repositories : []
};

var defaultTarget = {
    name:'',
    arch: '',
    platform: '',
    toolchain: '',
    includeDirs : [],
    sources:[],
    options: '',
    defines:{},
    libraryPaths : [],
    libraries : [],
    linkoptions : ''
};

build = Object.assign(defaultBuild, build);

function determinetarget() {
    if (!targetName)
        console.log('Trying to find a target for arch: ' + arch + ' and platform ' + plat);
    build.targets.every(function(conf){
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

function isOutdated(sources, dest) {
    if (typeof sources == 'string')
        sources = [sources];
	try {
		var i = 0, len = sources.length;
		var mtimed = new Date(fs.statSync(dest));
		for (; i < len; i++) {
			var mtimes = new Date(fs.statSync(sources[i]));
			if (mtimed.getTime() < mtimes.getTime())
				return true;
		}
		return false;
	} catch (e) {
		return true;
	}
}

function getFiles(path, rfiles){
    var idxCard = 0;
    if ((idxCard = path.indexOf('*')) != -1) {
        var folder;
        if (idxCard > 0)
            folder = path.substring(0,idxCard);
        else
            folder = './';
        var filter = idxCard < path.length ? path.substring(idxCard + 1) : '';
        var files = fs.readdirSync(folder);
        files.forEach(function(fname){
            if (fs.lstatSync(folder + fname).isFile()) {
                if ((!filter || fname.endsWith(filter)) && rfiles.indexOf(folder + fname) == -1)
                rfiles.push(folder + fname);
            }
        });
    } else {
        if (fs.lstatSync(path).isFile() && sourceFiles.indexOf(path) == -1) {
            rfiles.push(path);
        }
    }
}

function isDir(path) {
    try {
        return fs.lstatSync(inc).isDirectory();
    } catch (e) {
        return false;
    }
}

// resolve command dependencies
var cmds = commands;
commands = [];
cmds.forEach(cmd => {
    if (cmd == 'install') {
        if (cmds.indexOf('build') == -1)
            commands.push('build');
        if (cmds.indexOf('package') == -1)
            commands.push('package');
        commands.push(cmd);
    } else if (cmd == 'package') {
        if (cmds.indexOf('build') == -1)
            commands.push('build');
        if (commands.indexOf(cmd) == -1)
            commands.push(cmd);
    } else {
        if (commands.indexOf(cmd) == -1)
            commands.push(cmd);
    }
});

commands.forEach(command => {

    if (command == 'build') {

        var tool = require('./' + target.toolchain + '.js');

        var sources = build.sources;
        if (target.sources)
            sources = sources.concat(target.sources);

        var sourceFiles = [];

        sources.forEach(path => getFiles(path, sourceFiles));

        var destFolder = './build/' + target.name + '/';

        var destFiles = sourceFiles.map(function(src){
            return destFolder + src.replace(/^.*?\/([a-z0-9_~-]+)\.[a-z0-9_~-]+$/i,'$1.o');
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
            if (!isOutdated(sourceFiles[i], destFiles[i]))
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
		
        if (isOutdated(destFiles, destFolder + 'bin/' + artifactName)) {
            var cmd = tool.link(build.type, destFiles, destFolder + 'bin/' + artifactName, target.libraryPaths, target.libraries, target.linkoptions)
            console.log(cmd);
            try {
                execSync(cmd);
            } catch (e) {
            }
        }
    } // end of build command
    else if (command == 'clean') {

        const { execSync } = require('child_process');

        if (fs.existsSync('./build')) {
            if (plat == 'win32')
                execSync('rmdir /S /Q .\\build');
            else
                execSync('rm -f ./build');
        }

    } else if (command == 'package') {

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
            if (isDir(inc)) {
                fsx.copySync(inc,destFolder + 'package/include');
            } else {
                var files = [];
                getFiles(inc, files);
                files.forEach(src => {
                    var idxBar = src.replace('[/\]','/').lastIndexOf('/');
                    var dest = destFolder + 'package/include/' + 
                            (idxBar != -1 ? src.substring(idxBar+1) : src);
                    fsx.copySync(src, dest);
                });
            }
        });

        console.log('Copying binaries to package');
        fsx.copySync(destFolder + 'bin', destFolder + 'package');

    } else {
        console.error('Syntax error\nTry to call "gonnabe help" to see help.');
        process.exit(1);
    }
});

//end of file