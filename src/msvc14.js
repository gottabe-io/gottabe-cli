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

function getDefines(defines) {
    var defs = [];
    for (var n in defines) defs.push({ k: n, v: defines[n] });
    return defs.map(def => ' /D' + def.k + (def.v ? '="' + def.v + '"' : '')).join(' ');
}

/**
 * 
 * @param {String} srcFile 
 * @param {String} destFile 
 * @param {Array} includeDirs 
 * @param {Object} defines 
 * @param {String} options 
 */
module.exports.compile = function(srcFile, destFile, includeDirs, defines, options) {
    return 'cl' +
        getDefines(defines) +
        (includeDirs.length > 0 ? ' "/I' + includeDirs.map(inc => inc.replace(/\//g, '\\')).join('" "/I') + '"' : '') +
        (options ? ' ' + options : '') +
        ' /c "/Fo' + destFile.replace(/\//g, '\\') + '" "' + srcFile.replace(/\//g, '\\') + '"';
};

module.exports.link = function(type, sources, destFile, libraryPaths, libraries, options) {
    if (type == 'static library')
        return 'lib rcs ' + destFile +
            ' ' + sources.join(' ');
    return 'cl' +
        (libraryPaths.length > 0 ? ' "-L' + libraryPaths.map(inc => inc.replace(/\//g, '\\')).join('" "-L') + '"' : '') +
        (options ? ' ' + options : '') +
        ' -o "' + destFile.replace(/\//g, '\\') +
        '" ' + sources.map(s => '"' + s + '"').join(' ') +
        (libraries.length > 0 ? ' -l' + libraries.join(' -l') : '') +
        (type == 'shared library' ? ' -shared "-Wl,--out-implib,' +
            (destFile.replace(/\//g, '\\').replace(/^(.*?)\/?([a-z0-9_~-]+)\.[a-z0-9_~-]+$/i, '$1/$2')) + '.lib"' : '');
};

module.exports.artifactName = function(build, target) {
    if (build.type == 'static library')
        return build.package.name + '.lib';
    else if (build.type == 'shared library') {
        if (target.platform == 'win32')
            return build.package.name + '.dll';
        else
            return build.package.name + '.so';
    } else {
        if (target.platform == 'win32')
            return build.package.name + '.exe';
        return build.package.name;
    }
};