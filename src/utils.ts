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

import fs from 'fs';
import glob from 'glob';
import rjson from "relaxed-json";
import YAML from 'yaml';
import crypto from 'crypto';
import {BaseDescriptor, BuildDescriptor, PackageInfo} from './base_types';

const isOutdated = (sources:(string|string[]), dest:string):boolean => {
    if (typeof sources == 'string')
        sources = [sources];
    try {
        var i = 0,
            len = sources.length;
        var mtimed = fs.statSync(dest).mtime;
        for (; i < len; i++) {
            var mtimes = fs.statSync(sources[i]).mtime;
            if (mtimed.getTime() < mtimes.getTime())
                return true;
        }
        return false;
    } catch (e) {
        return true;
    }
};

function isDir(path:string) {
    try {
        return fs.lstatSync(path).isDirectory();
    } catch (e) {
        return false;
    }
}

function isFile(path:string) {
    try {
        return fs.lstatSync(path).isFile();
    } catch (e) {
        return false;
    }
}

function uniquePush(array:any[],item:any) {
    if (array.indexOf(item) == -1)
        array.push(item);
}

const getFiles = (path:string, rfiles:string[], ext?:string):void => {
    if (isDir(path)) {
        if (path.endsWith('/') || path.endsWith('/'))
            path = path.substring(0,path.length - 1);
        glob.sync(path + (ext ? '/**/*.' + ext : '/**/*'))
            .forEach(file => uniquePush(rfiles,file));
    } else if (isFile(path)) {
        uniquePush(rfiles,path);
    } else if (path.indexOf('*') != -1) {
        glob.sync(path)
            .forEach(file => uniquePush(rfiles,file));
    }
};

const parseBuild = (filename: string): any => {
	try {
		let data = fs.readFileSync(filename);
		if (filename.toLowerCase().endsWith('.json')) {
			let datastr = rjson.transform(data.toString());
			return JSON.parse(datastr);
		} else if (filename.toLowerCase().endsWith('.yml') || filename.toLowerCase().endsWith('.yaml')) {
			return YAML.parse(data.toString());
		}
	} catch(_e) {
		return null;
	}
};

const writeFileSync = (filename: string, data: string) => {
	fs.writeFileSync(filename, data);
}

const validateBuild = (build: BuildDescriptor): void => {
	if (!(/[a-z][a-z0-9_.-]+/i).exec(build.groupId))
		throw new Error('"'+build.groupId+'" is not a valid groupId. It must begin with a letter and be followed by numbers, letters, "_", "." or "-".');
	if (!(/[a-z][a-z0-9_-]+/i).exec(build.artifactId))
		throw new Error('"'+build.artifactId+'" is not a valid artifactId. It must begin with a letter and be followed by numbers, letters, "_" or "-".');
	if (!(/\d[a-z0-9_-]+/i).exec(build.version))
		throw new Error('"'+build.artifactId+'" is not a valid version. It must begin with a number and be followed by numbers, letters, "_" or "-".');
	if (!(/(executable)|(shared_library)|(static library)|(driver)|(none)/i).exec(build.type))
		throw new Error('"'+build.type+'" is not a valid build type. The valid types are "executable", "shared_library", "static library", "driver" or "none".');
};

const checksum = async (filename: string): Promise<any> => {
	if (isDir(filename)) {
		let r :any = {};
		let files :string[] = [];
		getFiles(filename, files);
		for (var file in files) {
			r[file] = checksum(file);
		}
		return r;
	} else {
		let shasum = crypto.createHash('sha1');
		const data = fs.readFileSync(filename);
		shasum.update(data);
		return shasum.digest('hex');
	}
}

function isNumber(val:any): boolean {
	if (typeof val == 'number') return true;
	if (typeof val == 'string') return /\d+/.exec(val) != null;
	return false;
}

const compareVersion = (a: string, b: string): number => {
	let ap = a.split('.');
	let bp = b.split('.');
	let len = Math.min(ap.length, bp.length);
	for (let i = 0; i < len; i++) {
		let va: any = ap[i], vb: any = bp[i];
		if (isNumber(va)) va = parseInt(va);
		if (isNumber(vb)) vb = parseInt(vb);
		if (va > vb)
			return 1;
		if (va < vb)
			return -1;
	}
	return ap.length > bp.length ? 1 : (ap.length < bp.length ? -1 : 0);
};

export class PackageSet<T extends BaseDescriptor> {
	packs: any;

	constructor(packs?: T[]) {
		this.packs = {};
		(packs || []).forEach(this.push.bind(this));
	}

	push(pack: T): boolean {
		let key = pack.groupId + '/' + pack.artifactId;
		if (this.packs[key]) {
			if (compareVersion(pack.version, this.packs[key].version) > 0) {
				this.packs[key] = pack;
				return true;
			}
		} else {
			this.packs[key] = pack;
			return true;
		}
		return false;
	}

	pushAll(packs: T[]): T[] {
		return packs.filter(this.push.bind(this));
	}

	toArray(): T[] {
		return Object.values(this.packs);
	}
}

const BUILD_FILES = ['./build.yml', './build.yaml', './build.json'];

const findBuildFile = (): (string | undefined) => {
	return BUILD_FILES.filter(fs.existsSync).filter(isFile)[0];
};

const PLUGIN_FILES = ['./plugin.yml', './plugin.yaml', './plugin.json'];

const findPluginFile = (): (string | undefined) => {
	return PLUGIN_FILES.filter(fs.existsSync).filter(isFile)[0];
};

export default {isOutdated, isDir, isFile, getFiles, parseBuild, validateBuild, checksum, compareVersion, findBuildFile, findPluginFile, writeFileSync};
