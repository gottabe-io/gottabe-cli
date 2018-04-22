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

const os = require('os');
const fs = require('fs');
const Set = require('es6-set');
const targz = require('targz');


/**
 * Local directory for caching installed packages
 */
const gottabe_packages = os.homedir() + '/.gottabe/packages';

/**
 * Setup the cache directory
 */
function setup() {
    if (!fs.existsSync(os.homedir() + '/.gottabe'))
        fs.mkdirSync(os.homedir() + '/.gottabe');
    if (!fs.existsSync(gottabe_packages))
        fs.mkdirSync(gottabe_packages);
}

/**
 * Download the whole structure of files
 * @param {*} request 
 * @param {*} packageinfo 
 * @param {*} destFolder 
 */
function downloadPackageFiles(request, packageinfo, destFolder) {
    var build = JSON.parse(fs.readFileSync( destFolder + '/build.json'));
}

/**
 * Loads the package files into the build directory.
 * @param {*} packageinfo 
 * @param {*} arch 
 * @param {*} platform 
 * @param {*} toolchain 
 * @param {*} packages 
 */
function loadPackage(packageinfo, arch, platform, toolchain, packages) {
    var descriptor = JSON.parse(
        fs.readFileSync(gottabe_packages + '/' + packageInfo.name + '/' + packageInfo.version + '/build.json').toString());
    if (descriptor.type != 'shared library' && descriptor.type != 'static library')
        throw new Error('The dependencies must be libraries.');
    var apt = arch + '_' + platform + '_' + toolchain;
    if (fs.existsSync('./build/deps/' + packageinfo.name + '/' + packageinfo.version + '/' + apt))
        return packages;
    if (!fs.existsSync('./build/deps/' + packageinfo.name))
        fs.mkdirSync('./build/deps/' + packageinfo.name);
    if (!fs.existsSync('./build/deps/' + packageinfo.name + '/' + packageinfo.version))
        fs.mkdirSync('./build/deps/' + packageinfo.name + '/' + packageinfo.version);
    function untar(src,dest) {
        targz.decompress({
            src: src,
            dest: dest
        }, function(err){
            if(err) {
                throw err;
            } else {
                console.log("Extracted " + src);
            }
        });        
    }
    if (!fs.existsSync('./build/deps/' + packageinfo.name + '/' + packageinfo.version + '/include')
        && fs.existsSync(gottabe_packages + '/' + packageInfo.name + '/' + packageInfo.version + '/includes.tar.gz')) {
        fs.mkdirSync('./build/deps/' + packageinfo.name + '/' + packageinfo.version + '/include');
        untar(gottabe_packages + '/' + packageInfo.name + '/' + packageInfo.version + '/includes.tar.gz',
            './build/deps/' + packageinfo.name + '/' + packageinfo.version + '/include');
        packageinfo.includeDir = './build/deps/' + packageinfo.name + '/' + packageinfo.version + '/include';
    }
    if (!fs.existsSync('./build/deps/' + packageinfo.name + '/' + packageinfo.version + '/' + apt)) {
        fs.mkdirSync('./build/deps/' + packageinfo.name + '/' + packageinfo.version + '/' + apt);
        untar(gottabe_packages + '/' + packageInfo.name + '/' + packageInfo.version + '/' + packageinfo.name + apt + '.tar.gz',
            './build/deps/' + packageinfo.name + '/' + packageinfo.version + '/' + apt);
        packageinfo[apt] = './build/deps/' + packageinfo.name + '/' + packageinfo.version + '/' + apt;
    }
    packageinfo.build = descriptor;
    descriptor.dependencies.forEach(dep => {
        packages.push(getPackage(dep, arch, platform, toolchain, packages));
    });
    return packages;
}

/**
 * Try downloading a package
 * @param {*} packageinfo 
 */
function tryDownloadPackage(packageinfo, arch, platform, toolchain, packages) {
    if (packages.filter(pack => pack.name == packageinfo.name && pack.version == packageinfo.version).length == 0)
        return packages;
    // When server is implemented it must be changed to download from it
    if (!packageInfo.remote)
        throw new Error('Can\'t download the package');

    if (!fs.existsSync(gottabe_packages + '/' + packageInfo.name))
        fs.mkdirSync(gottabe_packages + '/' + packageInfo.name);
    if (!fs.existsSync(gottabe_packages + '/' + packageInfo.name + '/' + packageInfo.version))
        fs.mkdirSync(gottabe_packages + '/' + packageInfo.name + '/' + packageInfo.version);

    // get the json
    const request = require('request');
    if (packageInfo.remote) {
        request(packageInfo.remote, { json: true }, fs.createWriteStream(gottabe_packages + '/' + packageInfo.name + '/' + packageInfo.version + '/build.json', body));   
        downloadPackageFiles(request, packageinfo, gottabe_packages + '/' + packageInfo.name + '/' + packageInfo.version);
    }
    loadPackage(packageinfo, arch, platform, toolchain, packages);
    return packages;
}

/**
 * Get the package information and try to download it 
 * @param {String} packName 
 * @param {String} arch 
 * @param {String} platform 
 * @param {String} toolchain 
 */
function getPackage(packName, arch, platform, toolchain, packages) {
    packages = packages || [];
    var pdata = /^([a-z0-9_.-]+)\/([a-z0-9_.-]+)\s*(=>)?\s*(.*?)$/i.exec(packname);
    if (!pdata)
        throw new Error('');
    var packageInfo = {name : pdata[0], version : pdata[1], remote : pdata[4]};
    setup();
    var packages = [packageInfo];
    if (!fs.existsSync(gottabe_packages + '/' + packageInfo.name + '/' + packageInfo.version))
        packages = packages.concat(tryDownloadPackage(packageinfo, arch, platform, toolchain, packages));
    return packageInfo;
};
module.exports.getPackage = getPackage;

module.exports.installPackage = function(build) {
    setup();
    var packDir = gottabe_packages + '/' + build.name;
    if (!fs.existsSync(packDir))
        fs.mkdirSync(packDir);
    packDir += '/' + build.version;
    if (!fs.existsSync(packDir))
        fs.mkdirSync(packDir);

    fs.writeFileSync(packDir + '/build.json', JSON.stringify(build,null,4));
    
    function tgz(fileName, sourceDir) {
        // compress files into tar.gz archive 
        targz.compress({
            src: sourceDir,
            dest: packDir + '/' + fileName + '.tar.gz'
        }, function(err){
            if(err) {
                throw err;
            } else {
                console.log('File ' + packDir + '/' + fileName + '.tar.gz copied.');
            }
        });    
    }

    var includes = build.package.includes || [];

    if (includes.length > 0) {
        tgz('includes', 'build/package/include');
    }

    var targets = new Set(build.targets.map(target => target.arch + '_' + target.platform + '_' + target.toolchain));
    Array.from(targets).forEach(targetSuffix => {
        if (fs.existsSync('./build/package/' + targetSuffix)) {
            tgz(build.package.name + targetSuffix, 
                    './build/package/' + targetSuffix);
        }
    });
};

