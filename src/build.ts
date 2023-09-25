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

import utils from './utils';
import packs from './packages';
import {BuildPhase, PhaseParams} from './base_types';

export class PreCompilePhase implements BuildPhase {

	async build(phaseParams: PhaseParams) {
	    let build = phaseParams.buildConfig;
	    let target = phaseParams.currentTarget;

        let sources = (build.sources || []).concat(target.sources || []);

        let sourceFiles: string[] = [];

        sources.forEach(path => utils.getFiles(path, sourceFiles));

        let destFolder = './build/' + target.name + '/bin/';

        packs.setupDir('./build', target.name, 'bin');

        phaseParams.inputFiles = sourceFiles;

        phaseParams.destDir = destFolder;

    }

}

export class PostCompilePhase implements BuildPhase {

    async build(phaseParams: PhaseParams) {
        let build = phaseParams.buildConfig;
        let target = phaseParams.currentTarget;

        let sources = build.testSources || [];

        let sourceFiles: string[] = [];

        sources.forEach(path => utils.getFiles(path, sourceFiles));

        let destFolder = './build/' + target.name + '/test_bin/';

        packs.setupDir('./build', target.name, 'test_bin');

        phaseParams.inputFiles = sourceFiles;

        phaseParams.destDir = destFolder;

    }

}

export class PreLinkPhase implements BuildPhase {

    async build(phaseParams: PhaseParams) {
        let target = phaseParams.currentTarget;

        let sourceFiles: string[] = [];

        let objDir = './build/' + target.name + "/bin";

        utils.getFiles(objDir + '/*.o*', sourceFiles);

        phaseParams.inputFiles = sourceFiles;

        phaseParams.destDir = objDir + '/bin';

    }
}

export class PostLinkPhase implements BuildPhase {

    async build(phaseParams: PhaseParams) {
        let target = phaseParams.currentTarget;

        let sourceFiles: string[] = [];

        let objDir = './build/' + target.name + "/bin";
        let testObjDir = './build/' + target.name + "/test_bin";

        utils.getFiles(objDir + '/*.o*', sourceFiles);
        utils.getFiles(testObjDir + '/*.o*', sourceFiles);

        phaseParams.inputFiles = sourceFiles;

        phaseParams.destDir = testObjDir;

    }
}
