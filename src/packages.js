
const os = require('os');
const fs = require('fs');
const path = require('path');

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

function getPackageDir(packageName, ...subs) {
    return path.normalize(gottabe_packages + '/' + packageName + (subs ? '/' + subs.join('/') : ''));
}

function getDir(parent, ...subs) {
    return path.normalize(parent + (subs ? '/' + subs.join('/') : ''));
}

function setupDir(parent, ...subs) {
    if (subs) {
        var subpath = parent;
        subs.forEach(sub => {
            subpath += '/' + sub;
            if (!fs.existsSync(subpath))
                fs.mkdirSync(subpath);
        });
    }
    return getDir.apply(this, [parent].concat(subs));
}

function createPackageDir(packageName, ...subs) {
    setup();
    if (!fs.existsSync(gottabe_packages + '/' + packageName))
        fs.mkdirSync(gottabe_packages + '/' + packageName);
    return setupDir.apply(this, [gottabe_packages + '/' + packageName].concat(subs));
}

module.exports.getPackageDir = getPackageDir;

module.exports.createPackageDir = createPackageDir;

module.exports.setupDir = setupDir;

module.exports.getDir = getDir;
