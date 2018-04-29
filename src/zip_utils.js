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
const archiver = require('archiver');
const unzip = require('unzipper');

module.exports.zipfolder = function(source, dest) {
    // create a file to stream archive data to.
    var output = fs.createWriteStream(dest);
    var archive = archiver('zip', {
        zlib: { level: 9 } // Sets the compression level.
    });
    var promise = new Promise((resolve, reject) => {
        output.on('close', function() {
            resolve(dest);
        });
        archive.on('warning', function(err) {
            if (err.code === 'ENOENT') {
            } else {
                reject(err);
            }
        });
        archive.on('error', function(err) {
            reject(err);
        });
    });
    // pipe archive data to the file
    archive.pipe(output);
    archive.directory(source, false);
    archive.finalize();
    return promise;
};

module.exports.unzipfolder = function(src, dest) {
    var output = fs.createReadStream(src)
        .pipe(unzip.Extract({ path: dest }));
    return new Promise((resolve, reject) => {
            output.on('close', function() {
                resolve(dest);
            });
            output.on('error', function(err) {
                reject(err);
            });
        });        
};
