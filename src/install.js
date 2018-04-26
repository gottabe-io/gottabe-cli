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
const Set = require('es6-set');
const zip_utils = require('./zip_utils');
const packs = require('./packages');

module.exports.installPackage = function(build) {
    var packDir = packs.createPackageDir(build.name, build.version);

    fs.writeFileSync(packDir + '/build.json', JSON.stringify(build,null,4));

    var includes = build.package.includes || [];

    if (includes.length > 0) {
        zip_utils.zipfolder('build/package/include', packDir + '/includes.zip');
    }

    var targets = new Set(build.targets.map(target => target.arch + '_' + target.platform + '_' + target.toolchain));
    Array.from(targets).forEach(targetSuffix => {
        if (fs.existsSync('./build/package/' + targetSuffix)) {
            zip_utils.zipfolder('build/package/' + targetSuffix, packDir + '/' + build.package.name + targetSuffix + '.zip');
        }
    });
};

