const fs = require('fs');
const zip_utils = require('./zip_utils');
const packs = require('./packages');

/**
 * Download the whole structure of files
 * @param {*} request 
 * @param {*} packageInfo 
 * @param {*} destFolder 
 */
function downloadPackageFiles(request, packageInfo, destFolder) {
    var build = JSON.parse(fs.readFileSync( destFolder + '/build.json'));
}

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
function tryDownloadPackage(packageInfo, arch, platform, toolchain, packages) {
    if (packages.filter(pack => pack.name == packageInfo.name && pack.version == packageInfo.version).length == 0)
        return packages;
    // When server is implemented it must be changed to download from it

    if (!fs.existsSync(packs.gottabe_packages + '/' + packageInfo.name))
        fs.mkdirSync(packs.gottabe_packages + '/' + packageInfo.name);
    if (!fs.existsSync(packs.gottabe_packages + '/' + packageInfo.name + '/' + packageInfo.version))
        fs.mkdirSync(packs.gottabe_packages + '/' + packageInfo.name + '/' + packageInfo.version);

    // get the json
    const request = require('request');
    if (packageInfo.remote) {
        request(packageInfo.remote, { json: true }, fs.createWriteStream(packs.gottabe_packages + '/' + packageInfo.name + '/' + packageInfo.version + '/build.json', body));   
        downloadPackageFiles(request, packageInfo, packs.gottabe_packages + '/' + packageInfo.name + '/' + packageInfo.version);
    }
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
    var pdata = /^([a-z0-9_.-]+)\/([a-z0-9_.-]+)\s*(=>)?\s*(.*?)$/i.exec(packName);
    if (!pdata)
        throw new Error('');
    var packageInfo = {name : pdata[1], version : pdata[2], remote : pdata[4]};
    if (!fs.existsSync(packs.getPackageDir(packageInfo.name, packageInfo.version)))
        packages = packages.concat(tryDownloadPackage(packageInfo, arch, platform, toolchain, packages));
    loadPackage(packageInfo, arch, platform, toolchain, packages);
    return packageInfo;
};
module.exports.getPackage = getPackage;
