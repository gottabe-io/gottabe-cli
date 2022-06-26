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

import {BuildPhase, PhaseParams, Phase, BuildConfig} from "./base_types";
import { execSync } from 'child_process';
import fs from 'fs';

function cleanWindows(buildConfig: BuildConfig, all?: boolean) {
	if (all)
		execSync('rmdir /S /Q .\\build');
	else {
		buildConfig.targets?.forEach((t) =>
			execSync('rmdir /S /Q .\\build\\' + t.name)
		);
	}
}

function cleanLinux(buildConfig: BuildConfig, all?: boolean) {
	if (all)
		execSync('rm -f ./build');
	else {
		buildConfig.targets?.forEach((t) =>
			execSync('rm -f ./build/' + t.name)
		);
	}
}

export class CleanPhase implements BuildPhase {

	async build(phaseParams: PhaseParams) {

		if (fs.existsSync('./build')) {
			if (process.platform == 'win32')
				cleanWindows(phaseParams.buildConfig, phaseParams.commandOptions.all);
			else
				cleanLinux(phaseParams.buildConfig, phaseParams.commandOptions.all);
		}

	}

}
