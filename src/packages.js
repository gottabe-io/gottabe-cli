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
