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

import {packageManager} from './package_manager';
import {BuildPhase, PackageInfo, PhaseParams, TargetConfig} from './base_types';
import packs from "./packages";
import {PackageSet} from "./utils";

export class DependenciesPhase implements BuildPhase {

	async build(phaseParams: PhaseParams) {
		let build = phaseParams.buildConfig;
		let servers: string[] = [];
		let target = phaseParams.currentTarget;
		let pDependencies = (build.dependencies || [])
				.map(packs.parse)
				.map(async(pack) => packageManager.updatePackage(pack,servers));
		let dependencies = await Promise.all(pDependencies);
		let finalDependencies = new PackageSet(dependencies);
		await resolveDependencies(dependencies, target, servers, finalDependencies);
		phaseParams.solvedDependencies = finalDependencies.toArray();
	}

}
const resolveDependencies = async (dependencies: PackageInfo[], target: TargetConfig, servers: string[], finalDependencies: PackageSet<PackageInfo>) => {
	let newDependencies: PackageInfo[] = [];
	await Promise.all(dependencies.map(async (dep) => {
		if (await packageManager.isInCache(dep, target.arch, target.platform, target.toolchain)) {
			await packageManager.downloadPackage(dep, servers, target.arch, target.platform, target.toolchain);
		}
		let subDeps = await packageManager.loadPackage(dep, target.arch, target.platform, target.toolchain);
		dep.dependencies = subDeps;
		if (dep.scope.indexOf('shallow') == -1) {
			subDeps = await Promise.all(subDeps.map(pack => packageManager.updatePackage(pack, servers)));
			finalDependencies.pushAll(subDeps).forEach((v) => newDependencies.push(v));
		}
	}));
	if (newDependencies.length > 0)
		await resolveDependencies(newDependencies, target, servers, finalDependencies);
}

