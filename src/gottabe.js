/*
 *
 */

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

// resolve command dependencies
var cmds = commands;
commands = [];
cmds.forEach(cmd => {
    if (cmd == 'install') {
        if (cmds.indexOf('build') == -1)
            commands.push('build');
        commands.push(cmd);
    } else {
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

        function getSourceFile(path){
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
                        if ((!filter || fname.endsWith(filter)) && sourceFiles.indexOf(folder + fname) == -1)
                            sourceFiles.push(folder + fname);
                    }
                });
            } else {
                if (fs.lstatSync(path).isFile() && sourceFiles.indexOf(path) == -1) {
                    sourceFiles.push(path);
                }
            }
        }

        sources.forEach(getSourceFile);

        var destFiles = sourceFiles.map(function(src){
            return './' + target.name + '/' + src.replace(/^.*?\/([a-z0-9_~-]+)\.[a-z0-9_~-]+$/i,'$1\.o');
        });

        const { execSync } = require('child_process');

        if (!fs.existsSync('./' + target.name)) {
            fs.mkdirSync('./' + target.name);
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
		
        if (isOutdated(destFiles, './' + target.name + '/' + artifactName)) {
            var cmd = tool.link(build.type, destFiles, './' + target.name + '/' + artifactName, target.libraryPaths, target.libraries, target.linkoptions)
            console.log(cmd);
            try {
                execSync(cmd);
            } catch (e) {
            }
        }
    } // end of build command
    else if (command == 'clean') {

        const { execSync } = require('child_process');

        if (fs.existsSync('./' + target.name)) {
            if (plat == 'win32')
                execSync('rmdir /S /Q .\\' + target.name);
            else
                execSync('rm -f ./' + target.name);
        }

    } else {
        console.error('Syntax error\nTry to call "gonnabe help" to see help.');
        process.exit(1);
    }
});

//end of file