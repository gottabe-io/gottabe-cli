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
const packs = require('./packages');
const request = require('request');
const url = require('url');
const Set = require('es6-set');

/**
 * Concatenates the parts of an url
 * @param {String[]} args 
 */
function concatUrl(urlStr, ... args) {
    var theurl = url.parse(urlStr);
    var path = (theurl.pathname || '').split('/').concat(args || []);
    theurl.pathname = '/' + path.join('/');
    return url.format(theurl);
}

/**
 * Download the whole structure of files
 * @param {*} request 
 * @param {*} packageInfo 
 * @param {*} destFolder 
 */
function downloadPackageFiles(base, packageInfo, destFolder) {
    var build = JSON.parse(fs.readFileSync( destFolder + '/build.json'));
    var targets = new Set(build.targets.map(target => build.package.name + target.arch + '_' + target.platform + '_' + target.toolchain + '.zip'));
    function download(file) {
        request({
            url : concatUrl(base, file), 
            method: 'get',
            json: true 
        })
        .on('response', function(response) {
            if (response.statusCode) {
                console.log(file + ' downloaded.');
            }
        })
        .on('error', function(err) {
            console.warn(file + ' not available.');
        })
        .pipe(fs.createWriteStream(packs.getPackageDir(packageInfo.name, packageInfo.version, file)));
    }
    if (build.package.includes.length > 0)
        download('includes.zip');    
    targets.forEach(target => download);
}

/**
 * Download the package direct from an url
 * @param {*} packageInfo 
 */
module.exports.downloadDirect = function(packageInfo) {
    packs.createPackageDir(packageInfo.name, packageInfo.version);
    request({
        url : concatUrl(packageInfo.remote,'build.json'), 
        method: 'get',
        json: true 
    })
    .on('error', function(err) {
        throw err;
    })
    .pipe(fs.createWriteStream(packs.getPackageDir(packageInfo.name, packageInfo.version, 'build.json')));   
    downloadPackageFiles(packageInfo.remote, packageInfo, packs.getPackageDir(packageInfo.name, packageInfo.version));
};

/**
 * Download the package direct from the servers
 * @param {*} packageInfo 
 * @param {String[]} servers 
 */
module.exports.downloadFromServers = function(packageInfo, servers) {
    packs.createPackageDir(packageInfo.name, packageInfo.version);
    var server = null;
    servers.every(serverBase => {
        server = serverBase;
        request({
            url : concatUrl(serverBase, 'packages', packageInfo.name, packageInfo.version, 'build.json'), 
            method: 'get',
            json: true 
        })
        .on('error', function(err) {
            server = null;
        })
        .pipe(fs.createWriteStream(packs.getPackageDir(packageInfo.name, packageInfo.version, 'build.json')));   
        return server == null;
    });
    if (server) {
        console.log(concatUrl(server, 'packages', packageInfo.name, packageInfo.version, 'build.json') + ' downloaded.');
        downloadPackageFiles(concatUrl(server, 'packages', packageInfo.name, packageInfo.version), packageInfo,
                packs.getPackageDir(packageInfo.name, packageInfo.version));
    } else
        throw new Error('Package ' + packageInfo.name + '/' + packageInfo.version + ' wasn\'t found in any server.');
};
