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

import fs, {ReadStream} from 'fs';
import packs from './packages';
import url from 'url';
import path from 'path';
import {withAuthClient} from './http-services';
import {BaseDescriptor, BuildConfig, TargetConfig} from './base_types';
import {ApiPackagesService} from 'gottabe-client';
import utils from './utils';

const packageService = new ApiPackagesService(withAuthClient);

/**
 * Concatenates the parts of an url
 * @param {String[]} args
 */
 function concatUrl(urlStr: string, ...args: string[]) {
	let theUrl = new url.URL(urlStr);
	let urlPath = path.join(theUrl.pathname, ...(args || []));
	theUrl.pathname = urlPath;
	return url.format(theUrl);
}

const getDescriptor = async(desc: BaseDescriptor, server: string, type: string): Promise<any> => {
	type = type || 'package';
	let descFile = type === 'plugin' ? 'plugin' : 'build';
	return type == 'package'
		? await packageService.getPackageFile(desc.groupId, desc.artifactId, desc.version, descFile + '.json', {baseUrl:server})
		: null;
};

const download = async (desc: BaseDescriptor, type: string, base: string, file: string): Promise<any> => {
	let blob: Blob | null = type == 'package'
		? await packageService.getPackageFile(desc.groupId, desc.artifactId, desc.version, file, {baseUrl:base})
		: null;
	if (blob)
		await blob.stream()
			.pipeTo(<any>fs.createWriteStream(packs.getBasePath(type, desc.groupId, desc.artifactId, desc.version, file)));
};

function stream2Blob (stream: ReadStream, mimeType: string): Promise<Blob> {
	return new Promise((resolve, reject) => {
		const chunks: any[] = []
		stream
			.on('data', chunk => chunks.push(chunk))
			.once('end', () => resolve(mimeType != null
				? new Blob(chunks, {type: mimeType})
				: new Blob(chunks)))
			.once('error', reject);
	});
}

const upload = async (descriptor: BaseDescriptor, type: string, server: string, filename: string): Promise<any> => {

	let readStream = fs.createReadStream(filename);

	let parts = filename.split(/[\/\\]/);
	let baseFilename = parts[parts.length - 1];

	let blob: Blob = await stream2Blob(readStream, 'application/octet-stream');

	return type == 'package'
	? await packageService.postPackageFile(descriptor.groupId, descriptor.artifactId, descriptor.version, baseFilename, blob, {baseUrl: server})
	: null;

};

/**
 * Download the whole structure of files
 * @param {*} request
 * @param {*} desc
 * @param {*} destFolder
 */
const downloadPackageFiles = (base:string, desc: BaseDescriptor, destFolder: string): Promise<any[]> => {
	var build : BuildConfig = utils.parseBuild(destFolder + '/build.json');
	var targets :string[] = Array.from(new Set(build.targets?.map((target: TargetConfig) => build.package?.name + target.arch + '_' + target.platform + '_' + target.toolchain + '.zip')));
	let promisses = [];
	if (build.package && build.package.includes && build.package.includes.length > 0)
		promisses.push(download(desc, 'package', base,'includes.zip'));
	return Promise.all(promisses.concat(targets.map((file: string) => download(desc, 'package', base,file))));
}

/**
 * Download the package direct from the servers
 * @param {*} descriptor
 * @param {String[]} servers
 */
const downloadFromServers = async (descriptor: BaseDescriptor, type: string, servers: string[]): Promise<any[]> => {
	packs.createPackageDir(descriptor.groupId, descriptor.artifactId, descriptor.version);
	let server = null;
	let endfile = type == 'package' ? 'build.json' : 'plugin.json';
	servers.every(async(serverBase) => {
		server = serverBase;
		try {
			await download(descriptor, type, serverBase, endfile);
		} catch(e) {
			server = null;
		}
		return server == null;
	});
	if (server) {
		console.log(concatUrl(server, type, descriptor.groupId, descriptor.artifactId, descriptor.version, endfile) + ' downloaded.');
		if (type == 'package')
			return downloadPackageFiles(server, descriptor,
				packs.getBasePath(type, descriptor.groupId, descriptor.artifactId, descriptor.version));
		else
			return download(descriptor, type, server, descriptor.artifactId + '_' + descriptor.version + '.zip');
	} else
		throw new Error('The ' + type + ' ' + descriptor.groupId + '/' + descriptor.artifactId + '@' + descriptor.version + ' couldn\'t be found in any server.');
};

export default { getDescriptor, download, upload, downloadPackageFiles, downloadFromServers};
