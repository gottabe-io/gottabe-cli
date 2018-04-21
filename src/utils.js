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

var fs = require('fs');
var glob = require('glob');

module.exports.isOutdated = function(sources, dest) {
    if (typeof sources == 'string')
        sources = [sources];
    try {
        var i = 0,
            len = sources.length;
        var mtimed = new Date(fs.statSync(dest));
        for (; i < len; i++) {
            var mtimes = new Date(fs.statSync(sources[i]));
            if (mtimed.getTime() < mtimes.getTime())
                return true;
        }
        return false;
    } catch (e) {
        return true;
    }
};

function isDir(path) {
    try {
        return fs.lstatSync(inc).isDirectory();
    } catch (e) {
        return false;
    }
}

function isFile(path) {
    try {
        return fs.lstatSync(path).isFile();
    } catch (e) {
        return false;
    }
}

function uniquePush(array,item) {
    if (array.indexOf(item) == -1)
        array.push(item);
}

module.exports.getFiles = function(path, rfiles, ext) {
    if (isDir(path)) {
        if (path.endsWith('/') || path.endsWith('/'))
            path = path.substring(0,path.length() - 1);
        glob.sync(path + (ext ? '/**/*.' + ext : '/**/*'))
            .forEach(file => uniquePush(rfiles,file));
    } else if (isFile(path)) {
        uniquePush(rfiles,path);
    } else if (path.indexOf('*') != -1) {
        glob.sync(path)
            .forEach(file => uniquePush(rfiles,file));
    }
};

module.exports.isDir = isDir;