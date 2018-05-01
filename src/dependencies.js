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

const fs = require('fs');
const zip_utils = require('./zip_utils');
const packs = require('./packages');

/**
 * Loads the package files into the build directory.
 * @param {*} packageInfo 
 * @param {*} arch 
 * @param {*} platform 
 * @param {*} toolchain 
 * @param {*} packages 
 */
function loadPackage(packageInfo, arch, platform, toolchain, packages) {
    var descriptor = JSON.parse(
        fs.readFileSync(packs.getPackageDir(packageInfo.name,packageInfo.version, 'build.json')).toString());
    if (descriptor.type != 'shared library' && descriptor.type != 'static library')
        throw new Error('The dependencies must be libraries.');
    var apt = arch + '_' + platform + '_' + toolchain;
//    if (fs.existsSync('./build/deps/' + packageInfo.name + '/' + packageInfo.version + '/' + apt))
//        return packages;
    packageInfo.promisses = [];
    var depPath = packs.setupDir('build','deps', packageInfo.name,packageInfo.version);
    if (!fs.existsSync(packs.getDir(depPath,'include'))
        && fs.existsSync(packs.getPackageDir(packageInfo.name, packageInfo.version,'includes.zip'))) {
        fs.mkdirSync(packs.getDir(depPath,'include'));
        packageInfo.promisses.push(
            zip_utils.unzipfolder(packs.getPackageDir(packageInfo.name, packageInfo.version,'includes.zip'),
                packs.getDir(depPath,'include')));
    }
    if (fs.existsSync(packs.getPackageDir(packageInfo.name, packageInfo.version,'includes.zip')))
        packageInfo.includeDir = packs.getDir(depPath,'include');
    if (!fs.existsSync(packs.getDir(depPath, apt))) {
        fs.mkdirSync(packs.getDir(depPath, apt));
        packageInfo.promisses.push(
            zip_utils.unzipfolder(packs.getPackageDir(packageInfo.name, packageInfo.version, packageInfo.name + apt + '.zip'),
                    packs.getDir(depPath, apt)));
    }
    packageInfo[apt] = packs.getDir(depPath, apt);
    packageInfo.build = descriptor;
    descriptor.dependencies.forEach(dep => {
        packages.push(getPackage(dep, arch, platform, toolchain, packages));
    });
    return packages;
}

/**
 * Try downloading a package
 * @param {*} packageInfo 
 */
function tryDownloadPackage(packageInfo, arch, platform, toolchain, packages, servers) {
    if (packages.filter(pack => pack.name == packageInfo.name && pack.version == packageInfo.version).length == 0)
        return packages;
    // When server is implemented it must be changed to download from it

    if (!fs.existsSync(packs.gottabe_packages + '/' + packageInfo.name))
        fs.mkdirSync(packs.gottabe_packages + '/' + packageInfo.name);
    if (!fs.existsSync(packs.gottabe_packages + '/' + packageInfo.name + '/' + packageInfo.version))
        fs.mkdirSync(packs.gottabe_packages + '/' + packageInfo.name + '/' + packageInfo.version);

    // get the json
    const client = require('./client');
    if (servers && servers.length) {
        client.downloadFromServers(packageInfo, servers);
    }
    return packages;
}

/**
 * Get the package information and try to download it 
 * @param {String} packName 
 * @param {String} arch 
 * @param {String} platform 
 * @param {String} toolchain 
 * @param {String[]} servers 
 */
function getPackage(packName, arch, platform, toolchain, packages, servers) {
    packages = packages || [];
    var pdata = /^([a-z0-9_.-]+)\/([a-z0-9_.-]+)$/i.exec(packName);
    if (!pdata)
        throw new Error('');
    var packageInfo = {name : pdata[1], version : pdata[2]};
    if (!fs.existsSync(packs.getPackageDir(packageInfo.name, packageInfo.version)))
        packages = packages.concat(tryDownloadPackage(packageInfo, arch, platform, toolchain, packages, servers));
    loadPackage(packageInfo, arch, platform, toolchain, packages);
    return packageInfo;
};
module.exports.getPackage = getPackage;
