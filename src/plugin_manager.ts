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

import {Plugin, PluginConfig, PluginDescriptor} from 'gottabe-plugin-dev';
import fs from 'fs';
import packs from './packages';
import utils, {PackageSet} from './utils';
import {getConfig} from './config';
import {PLUGIN_DIR} from "./constants";
import path from 'path';
import zip_utils from "./zip_utils";
import client from './client';

let config = getConfig();

type PluginConstructor<T = Plugin> = new (...args: any[]) => T;

function parse(str: string): any {
	let parts = /^([a-z][a-z0-9_.-]+)\/([a-z][a-z0-9_-]+)@([0-9a-z_.*-]+)$/i.exec(str);
	if (!parts || parts.length < 3) throw new Error("Invalid plugin specification");
	return {groupId: parts[1], artifactId: parts[2], version: parts[3] };
}

class PluginManager {

	async mapPlugins(pluginsConf: PluginConfig[], servers: string[]): Promise<PluginDescriptor[]> {
		let list: PluginDescriptor[] = pluginsConf.map(pc => parse(pc.package));
		let updateMapper = ((pd: PluginDescriptor) => this.updatePlugin(pd, servers)).bind(this);
		let updates = await Promise.all(list.map(updateMapper));
		let set = new PackageSet(updates);
		return set.toArray();
	}

	async isInCache(specStr: string): Promise<boolean> {
		let spec = parse(specStr);
		let pathToFile = [config.getPluginsPath(), spec.groupId, spec.artifactId, spec.version, spec.artifactId + '_' + spec.version + '.zip'].join('/');
		return Promise.resolve(fs.existsSync(pathToFile));
	}

	async loadPlugin(specStr: string): Promise<Plugin> {
		let spec = parse(specStr);
		if (!(await this.isInCache(specStr))) {
			throw new Error('Plugin not found in cache.');
		}
		let pluginDescPath = [config.getPluginsPath(), spec.groupId, spec.artifactId, spec.version, 'plugin.json'].join('/');
		let descriptor: PluginDescriptor = utils.parseBuild(pluginDescPath);
		let zipFile = [PLUGIN_DIR, spec.groupId, spec.artifactId, spec.version, spec.artifactId + '_' + spec.version + '.zip'].join('/');
		let pathToDir = [PLUGIN_DIR, spec.groupId, spec.artifactId, spec.version].join('/');
		await zip_utils.unzipFolder(zipFile, pathToDir);
		let pathToFile = path.normalize(pathToDir + '/' + descriptor.main);
		let pluginExps = require(pathToFile);
		let pluginClass: PluginConstructor | undefined;
		for (let k in pluginExps)
			if (typeof pluginExps[k] == 'function' && pluginExps[k].prototype.hasOwnProperty('process')) {
				pluginClass = pluginExps[k];
				break;
			}
		if (!pluginClass)
			throw new Error('Plugin class not found.');
		return new pluginClass;
	}

	async downloadPlugin(descriptor: PluginDescriptor, servers: string[]): Promise<void> {
		packs.setupDir(config.getPluginsPath(), descriptor.groupId, descriptor.artifactId, descriptor.version);
		await client.downloadFromServers(descriptor, 'plugin', servers);
	}

	async updatePlugin(descriptor: PluginDescriptor, servers: string[]): Promise<PluginDescriptor> {
		if ((/(latest)|(\d[0-9a-z._-]*\.\*)/i).exec(descriptor.version)) {
			let promises = Promise.all(servers.map(server => client.getDescriptor(descriptor, server, 'plugin')));
			let allPackages = await promises;
			allPackages.sort((a,b) => utils.compareVersion(b.version, a.version));
			return allPackages[0];
		} else {
			return descriptor;
		}
	}

	async publishLocal(descriptor: PluginDescriptor): Promise<void> {
		let baseDir = packs.setupDir('plugin', descriptor.groupId, descriptor.artifactId, descriptor.version);
	}

	async publish(descriptor: PluginDescriptor): Promise<void> {

	}

}

export const pluginManager = new PluginManager;
