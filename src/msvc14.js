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

function compilerOptions(opts) {
    return (opts.optimization == 0 ? ' /Od' : opts.optimization > 0 && opts.optimization < 3 ? ' /O' + opts.optimization : opts.optimization == 3 ? ' /Ox' : '') +
           (opts.debug > 0 && opts.debug <= 3 ? ' /Zi' : '') +
           (opts.warnings ? ' /W' + opts.warnings : '') +
           (opts.other ? opts.other : '');
}

function linkerOptions(opts) {
    return (opts.debugInformation ? ' /DEBUG:FULL' : ' /DEBUG:NONE') +
           (opts.other ? opts.other : '');
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
    return 'cl /nologo' +
        getDefines(defines) +
        (includeDirs.length > 0 ? ' "/I' + includeDirs.map(inc => inc.replace(/\//g, '\\')).join('" "/I') + '"' : '') +
        (options ? compilerOptions(options) : '') +
        ' /c "/Fo' + destFile.replace(/\//g, '\\') + '.obj" "' + srcFile.replace(/\//g, '\\') + '"';
};

module.exports.link = function(type, sources, destFile, libraryPaths, libraries, options) {
    if (type == 'static library')
        return 'lib /NOLOGO /OUT:"' + destFile + '"' +
            (options ? linkerOptions(options) : '') +
            ' "' + sources.join('" ') + '"';
    return 'link /nologo' + (type == 'shared library' ? ' /DLL' : '') +
        (libraries.length > 0 ? ' ' + libraries.map(s => s + '.lib').join(' ') : '') +
        (libraryPaths.length > 0 ? ' /LIBPATH:"' + libraryPaths.map(inc => inc.replace(/\//g, '\\')).join('" /LIBPATH:"') + '"' : '') +
        (options ? linkerOptions(options) : '') +
        ' /OUT:"' + destFile.replace(/\//g, '\\') + '"' +
//        ' /PDBALTPATH:"' + destFile.replace(/\//g, '\\').replace(/\\[^\\]+\.[a-z0-9~_-]+$/i, '') + 
        '" ' + sources.map(s => '"' + s.replace(/\//g, '\\') + '.obj"').join(' ');
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

module.exports.OBJECT_EXTENSION = 'obj';
