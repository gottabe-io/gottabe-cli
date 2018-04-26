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
