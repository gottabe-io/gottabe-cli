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

import os from "os";

const __internal_version = [1, 0, 0];

export const VERSION = {
    get major():number | string { return __internal_version[0]; },
    get minor():number | string { return __internal_version[1]; },
    get patch():number | string { return __internal_version[2]; },
    get toString():Function {
        return () => { return __internal_version.join('.'); };
    }
}
/**
 * Local directory for caching installed packages
 */
export const GOTTABE_LOCAL_REPO = os.homedir() + '/.gottabe';
export const PLUGIN_DIR = './build/plugins';
export const DEFAULT_SERVERS = ['http://localhost:8080'];
export const DEFAULT_BUILD_PLUGIN = `io.gottabe/gottabe-plugin-build@${VERSION.major}.${VERSION.minor}.*`;
export const DEFAULT_TEST_PLUGIN = `io.gottabe/gottabe-plugin-test@${VERSION.major}.${VERSION.minor}.*`;
