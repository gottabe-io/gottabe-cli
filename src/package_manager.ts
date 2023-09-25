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
import zip_utils from './zip_utils';
import packs from './packages';
import {BuildDescriptor, BuildPhase, PackageInfo, PhaseParams} from './base_types';
import {PackageManager, Project} from './gottabe_api';
import client from './client';
import utils from './utils';
import fsx from 'fs-extra';
import {getConfig} from './config';

let config = getConfig();

export class PackageManagerImpl implements PackageManager {

	isInCache(packageInfo: PackageInfo, arch: string, platform: string, toolchain: string): Promise<boolean> {
		let apt = arch + '_' + platform + '_' + toolchain;
		let pathToFile = packs.getPackageDir(packageInfo.groupId, packageInfo.artifactId, packageInfo.version, packageInfo.artifactId + apt + '.zip');
	    return Promise.resolve(fs.existsSync(pathToFile));
	}

	async loadPackage(packageInfo: PackageInfo, arch: string, platform: string, toolchain: string): Promise<PackageInfo[]> {
		let descriptor :BuildDescriptor = JSON.parse(
			fs.readFileSync(packs.getPackageDir(packageInfo.groupId, packageInfo.artifactId,packageInfo.version, 'build.json')).toString());
		if (descriptor.type != 'shared library' && descriptor.type != 'static library')
			throw new Error('The dependencies must be libraries.');
		let apt = arch + '_' + platform + '_' + toolchain;
		let depPath = packs.setupDir('build','deps', packageInfo.groupId, packageInfo.artifactId,packageInfo.version);
		if (!fs.existsSync(packs.getDir(depPath,'include'))
			&& fs.existsSync(packs.getPackageDir(packageInfo.groupId, packageInfo.artifactId, packageInfo.version,'includes.zip'))) {
			fs.mkdirSync(packs.getDir(depPath,'include'));
				await zip_utils.unzipFolder(packs.getPackageDir(packageInfo.groupId, packageInfo.artifactId, packageInfo.version,'includes.zip'),
					packs.getDir(depPath,'include'));
		}
		if (fs.existsSync(packs.getPackageDir(packageInfo.groupId, packageInfo.artifactId, packageInfo.version,'includes.zip')))
			packageInfo.includeDir = packs.getDir(depPath,'include');
		if (!fs.existsSync(packs.getDir(depPath, apt))) {
			fs.mkdirSync(packs.getDir(depPath, apt));
				await zip_utils.unzipFolder(packs.getPackageDir(packageInfo.groupId, packageInfo.artifactId, packageInfo.version, packageInfo.artifactId + apt + '.zip'),
						packs.getDir(depPath, apt));
		}
		packageInfo.dirs[apt] = packs.getDir(depPath, apt);
		packageInfo.build = descriptor;
		return (descriptor.dependencies || []).map(packs.parse);
	}

	async downloadPackage(packageInfo: PackageInfo, servers: string[], arch?: string, platform?: string, toolchain?: string): Promise<PackageInfo> {
		if (!fs.existsSync([config.getPackagesPath(), packageInfo.groupId, packageInfo.artifactId].join('/')))
			fs.mkdirSync([config.getPackagesPath(), packageInfo.groupId, packageInfo.artifactId].join('/'));
		if (!fs.existsSync([config.getPackagesPath(), packageInfo.groupId, packageInfo.artifactId, packageInfo.version].join('/')))
			fs.mkdirSync([config.getPackagesPath(), packageInfo.groupId, packageInfo.artifactId, packageInfo.version].join('/'));

		// get the json
		if (servers && servers.length) {
			await client.downloadFromServers(packageInfo, 'package', servers);
		}
		return packageInfo;
	}

	async updatePackage(packageInfo: PackageInfo, servers: string[]): Promise<PackageInfo> {
		if ((/(latest)|(\d[0-9a-z._-]*\.\*)/i).exec(packageInfo.version)) {
			let promises = Promise.all(servers.map(server => client.getDescriptor(packageInfo, server, 'package')));
			let allPackages = await promises;
			allPackages.sort((a,b) => utils.compareVersion(b.version, a.version));
			return allPackages[0];
		} else {
			return packageInfo;
		}
	}
	publishLocal(project: Project): Promise<PackageInfo> {
		let build = project.getBuildConfig();
		let packDir = packs.createPackageDir(build.groupId, build.artifactId, build.version);

		fs.writeFileSync(packDir + '/build.json', JSON.stringify(build,null,4));

		let includes = build.package?.includes || [];

		if (includes.length > 0) {
			zip_utils.zipFolder('build/package/include', packDir + '/includes.zip')
				.catch(e => console.error(e))
		}

		let targets = new Set(build.targets?.map(target => target.arch + '_' + target.platform + '_' + target.toolchain));
		Array.from(targets).forEach(targetSuffix => {
			if (fs.existsSync('./build/package/' + targetSuffix)) {
				zip_utils.zipFolder('build/package/' + targetSuffix, packDir + '/' + build.artifactId + targetSuffix + '.zip')
					.catch(e => console.error(e))
			}
		});
		return Promise.resolve(packs.buildToPackage(project.getBuildConfig()));
	}
	publish(project: Project): Promise<PackageInfo> {
		throw new Error('Method not implemented.');
	}
	packageProject(project: Project): Promise<PackageInfo> {
		let build = project.getBuildConfig();
		let target = project.getCurrentTarget();

		let destFolder = './build/';
		let targetFolder = './build/' + target.name + '/';

		if (!fs.existsSync(destFolder + 'package')) {
			fs.mkdirSync(destFolder + 'package');
		}
		let destBinFolder = destFolder + 'package/' + target.arch + '_' + target.platform + '_' + target.toolchain;
		if (!fs.existsSync(destBinFolder)) {
			fs.mkdirSync(destBinFolder);
		}
		let includes = build.package?.includes || [];
		if (includes.length > 0 && !fs.existsSync(destFolder + 'package/include')) {
			fs.mkdirSync(destFolder + 'package/include');
		}
		// copy includes
		includes.forEach(inc => {
			console.log('Copying ' + inc + ' to package');
			if (utils.isDir(inc)) {
				fsx.copySync(inc, destFolder + 'package/include');
			} else {
				let files: string[] = [];
				utils.getFiles(inc, files);
				console.log(files);
				files.forEach(src => {
					let idxBar = src.replace(/\//g, '/').lastIndexOf('/');
					let dest = destFolder + 'package/include/' +
						(idxBar != -1 ? src.substring(idxBar + 1) : src);
					console.log(src + ' => ' + dest);
					fsx.copySync(src, dest);
				});
			}
		});

		console.log('Copying binaries to package');
		fsx.copySync(targetFolder + 'bin', destBinFolder);
		return Promise.resolve(packs.buildToPackage(project.getBuildConfig()));
	}
}

export const packageManager : PackageManager = new PackageManagerImpl();

export class PackagePhase implements BuildPhase {

	async build(phaseParams: PhaseParams): Promise<void> {
		await packageManager.packageProject(phaseParams.project);
	}

}
