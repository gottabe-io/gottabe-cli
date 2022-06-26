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

import os from 'os';
import fs from 'fs';
import path from 'path';
import {BuildConfig, PackageInfo} from './base_types';
import {getConfig} from "./config";

const config = getConfig();

/**
 * Setup the cache directory
 */
function setup() {
    if (!fs.existsSync(os.homedir() + '/.gottabe'))
        fs.mkdirSync(os.homedir() + '/.gottabe');
    if (!fs.existsSync(config.getPackagesPath()))
        fs.mkdirSync(config.getPackagesPath());
}

function getPackageDir(packageName:string, ...subs:string[]) {
    return path.normalize(config.getPackagesPath() + '/' + packageName + (subs ? '/' + subs.join('/') : ''));
}

function getBasePath(type: string, ...subs:string[]) {
    return path.normalize((type == 'package' ? config.getPackagesPath() : config.getPluginsPath()) + (subs ? '/' + subs.join('/') : ''));
}

function getDir(parent:string, ...subs:string[]) {
    return path.normalize(parent + (subs ? '/' + subs.join('/') : ''));
}

function setupDir(parent:string, ...subs: string[]) {
    if (subs) {
        let subPath = parent;
        subs.forEach(sub => {
            subPath += '/' + sub;
            if (!fs.existsSync(subPath))
                fs.mkdirSync(subPath);
        });
    }
    return getDir(parent, ...subs);
}

function createPackageDir(packageName:string, ...subs:string[]) {
    setup();
    if (!fs.existsSync(config.getPackagesPath() + '/' + packageName))
        fs.mkdirSync(config.getPackagesPath() + '/' + packageName);
    return setupDir(config.getPackagesPath() + '/' + packageName, ...subs);
}

function buildToPackage(bc: BuildConfig): PackageInfo {
	return {groupId: bc.groupId, artifactId: bc.artifactId, version: bc.version, checksum:'', dependencies: [], scope: ['compile'], dirs: {}};
}

function parse(str: string): PackageInfo {
	let parts = /^([a-z][a-z0-9_.-]+)\/([a-z][a-z0-9_-]+)@([0-9a-z_.*-]+)([:]([a-z, ]+))?$/i.exec(str);
	if (!parts || parts.length < 3) throw new Error("Invalid package description");
	return {groupId: parts[1], artifactId: parts[2], version: parts[3], checksum:'', dependencies: [], scope: (parts[5] || 'compile').split(/[ ,]+/), dirs: {}};
}

export default {getPackageDir, createPackageDir, setupDir, getDir, getBasePath, buildToPackage, parse};
