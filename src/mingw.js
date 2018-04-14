
function getDefines(defines) {
    var defs = [];
    for (var n in defines) defs.push({k:n,v:defines[n]});
    return defs.map(def => ' -D ' + def.k + (def.v ? '="' + def.v + '"' : '')).join(' ');
}

this.compile = function(srcFile, destFile, includeDirs, defines, options) {
    return 'g++' + 
        getDefines(defines) +
        (includeDirs.length > 0 ? ' "-I' + includeDirs.join('" "-I') + '"' : '') +
        (options ? ' ' + options : '') +
        ' -c -o ' + destFile + ' ' + srcFile;
};

this.link = function(type,sources, destFile, libraryPaths, libraries, options) {
    if (type == 'static library')
        return 'ar rcs ' + destFile +
        ' ' + sources.join(' ');
    return 'g++' + 
        (libraryPaths.length > 0 ? ' "-L' + libraryPaths.join('" "-L') + '"' : '') +
        (options ? ' ' + options : '') +
        ' -o ' + destFile + 
        ' ' + sources.join(' ') + 
        (libraries.length > 0 ? ' -l' + libraries.join(' -l') : '') + 
        (type == 'shared library' ? ' -shared' : '');
};

this.artifactName = function (build,target){
	if (build.type == 'static library')
		return build.package.name + '.a';
	else if (build.type == 'shared library') {
		if (target.platform == 'win32')
			return build.package.name + '.dll';
		else
			return build.package.name + '.so';
	}
	else {
		if (target.platform == 'win32')
			return build.package.name + '.exe';
		return build.package.name;
	}
};
