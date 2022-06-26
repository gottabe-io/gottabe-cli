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

import {program} from 'commander';
import {CommandLineOptions, VERSION} from './base_types';

export const getCommandLine = () : CommandLineOptions => {

	let commands : CommandLineOptions = {clean: false, build: false, package: false, install: false, publish: false, test: false, arch: process.arch,
		platform: process.platform, noTests: false};

	program
		.createCommand('clean')
		.description('Clean the files generated in a build.')
		.action(function() {
			commands.clean = true;
		});
	program
		.createCommand('build')
		.description('Build the project.')
		.action(function() {
			commands.build = true;
		});
	program
		.createCommand('package')
		.description('Package a project previously built.')
		.action(function() {
			commands.package = true;
		});
	program
		.createCommand('install')
		.description('Install a project previously packaged.')
		.action(function() {
			commands.install = true;
		});
	program
		.createCommand('publishToLocal')
		.description('Same as install.')
		.action(function() {
			commands.install = true;
		});
	program
		.createCommand('publish')
		.description('Publish a project previously packaged.')
		.action(function() {
			commands.publish = true;
		});
	program
		.createCommand('test')
		.description('Test a project.')
		.action(function() {
			commands.test = true;
		});
	program
		.version(VERSION.toString(), '-v, --version')
		.option('-T, --target <targetName>', 'Choose a target')
		.option('-nt, --no-tests', 'No tests will be called after building')
		.option('--arch <arch>', 'Override the default architecture')
		.option('--platform <platform>', 'Override the default platform')
		.option('--settings <settingsFile>', 'Override the default platform')
		.option('-U, --update', 'Update packages while building')
		.option('-up, --update-plugins', 'Update plugins while building')
		.option('-off, --offline', 'Work offline')
		.option('--all', 'Makes clean command remove completely the build folder');

	program.parse(process.argv);

	if (!(commands.clean || commands.build || commands.package || commands.install || commands.test || commands.publish)) {
		program.help();
	}

	commands.arch = (<any> program).arch || commands.arch;
	commands.platform = (<any> program).platform || commands.platform;
	commands.target = (<any> program).target;
	commands.all = (<any> program).all;
	commands.noTests = (<any> program).noTests;
	commands.settingsFile = (<any> program).settingsFile;

	return commands;
};
