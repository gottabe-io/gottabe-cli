const fs = require('fs');
const utils = require('./utils.js');
const Set = require('es6-set');

const install = require('./dependencies.js');

function uniqueArray(array) {
    return Array.from(new Set(array));
}

function build_target(target, arch, plat, build, config, success, nobin) {

    const tool = require('./' + target.toolchain + '.js');

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
        packages.push(install.getPackage(dep, arch, plat, target.toolchain, packages, build.servers.concat(config.servers).concat(defaultServers)));
    });
    var includeDeps = uniqueArray(packages.map(pack => pack.includeDir));

    var promisses = [true];
    packages.forEach(pack => {
        promisses = promisses.concat(pack.promisses);
    });

    Promise.all(promisses)
        .then(a => {
            destFolder = './build/' + target.name + '/';
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

            var apt = arch + '_' + plat + '_' + target.toolchain;
            // get the library paths and libraries from dependencies
            var libraryPathDeps = uniqueArray(packages.map(pack => pack[apt])),
                libraryDeps = packages.map(pack => pack.build.package.name);

            // get all libraries from dependencies for the target
            packages.forEach(pack => {
                var target2 = findTarget(pack.build, arch, plat, target.toolchain);
                libraryDeps = libraryDeps.concat(target2.libraries);
            });

            if (utils.isOutdated(destFiles.map(s => s + '.' + tool.OBJECT_EXTENSION), destFolder + 'bin/' + artifactName)) {
                var cmd = tool.link(build.type, destFiles, destFolder + (nobin ? '' : 'bin/') + artifactName, target.libraryPaths.concat(libraryPathDeps),
                    uniqueArray(libraryDeps.concat(target.libraries)), target.linkoptions);
                console.log(cmd);
                try {
                    execSync(cmd);
                } catch (e) {
                    console.log(e.output.toString());
                    console.error('Errors found when building ' + target.name);
                    process.exit(1);
                }
            }
            if (success) success(destFolder + artifactName);
        }).catch(err => console.error(err));

}

module.exports = build_target;