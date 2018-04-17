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

module.exports.getFiles = function(path, rfiles) {
    var idxCard = 0;
    if ((idxCard = path.indexOf('*')) != -1) {
        var folder;
        if (idxCard > 0)
            folder = path.substring(0, idxCard);
        else
            folder = './';
        var filter = idxCard < path.length ? path.substring(idxCard + 1) : '';
        var files = fs.readdirSync(folder);
        files.forEach(function(fname) {
            if (fs.lstatSync(folder + fname).isFile()) {
                if ((!filter || fname.endsWith(filter)) && rfiles.indexOf(folder + fname) == -1)
                    rfiles.push(folder + fname);
            }
        });
    } else {
        if (fs.lstatSync(path).isFile() && sourceFiles.indexOf(path) == -1) {
            rfiles.push(path);
        }
    }
};

module.exports.isDir = function(path) {
    try {
        return fs.lstatSync(inc).isDirectory();
    } catch (e) {
        return false;
    }
};