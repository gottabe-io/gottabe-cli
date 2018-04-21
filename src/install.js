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
 * Try downloading a package
 * @param {*} packageinfo 
 */
function tryDownloadPackage(packageinfo) {
    // When server is implemented it must be changed to download from it
    if (!packageInfo.remote)
        throw new Error('Can\'t download the package');

    if (!fs.existsSync(gottabe_packages + '/' + packageInfo.name))
        fs.mkdirSync(gottabe_packages + '/' + packageInfo.name);

    // get the json
    const request = require('request');
    var dependencies = [packageinfo];
    request(packageInfo.remote, { json: true }, fs.createWriteStream(gottabe_packages + '/' + packageInfo.name + '/build.json', body));   
    downloadPackageFiles(request, packageinfo, gottabe_packages + '/' + packageInfo.name);
    dependencies = dependencies.concat(loadPackage());
    return dependencies;
}

/**
 * Get the package information and try to download it 
 * @param {String} packName 
 * @param {String} arch 
 * @param {String} platform 
 * @param {String} toolchain 
 */
module.exports.getPackage = function(packName, arch, platform, toolchain) {
    var pdata = /^([a-z0-9_.-]+)\/([a-z0-9_.-]+)\s*(=>)?\s*(.*?)$/i.exec(packname);
    if (!pdata)
        throw new Error('');
    var packageInfo = {name : pdata[0], version : pdata[1], remote : pdata[4]};
    setup();
    var packages = [packageInfo];
    if (!fs.existsSync(gottabe_packages + '/' + packageInfo.name))
        packages = packages.concat(tryDownloadPackage(packageinfo));
    return packages;
};

module.exports.installPackage = function(build) {
    setup();
    var packDir = gottabe_packages + '/' + build.name;
    if (!fs.existsSync(packDir))
        fs.mkdirSync(packDir);

    fs.writeFileSync(packDir + '/build.json', JSON.stringify(build,null,4));
    
    var targz = require('targz');

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

    build.targets.forEach(target => {
        if (fs.existsSync('./build/package/' + target.arch + '_' + target.platform + '_' + target.toolchain)) {
            tgz(build.package.name + target.arch + '_' + target.platform + '_' + target.toolchain, 
                    './build/package/' + target.arch + '_' + target.platform + '_' + target.toolchain);
        }
    });
};

