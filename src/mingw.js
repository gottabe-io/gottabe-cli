
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
        return 'ar rcs ' + destFile + '.a' +
        ' ' + sources.join(' ');
    return 'g++' + 
        (libraryPaths.length > 0 ? ' "-L' + libraryPaths.join('" "-L') + '"' : '') +
        (options ? ' ' + options : '') +
        ' -o ' + destFile + 
        ' ' + sources.join(' ') + 
        ' ' + (libraries.map(lib => lib.replace(/^([a-z0-9_-]+)\..*?$/i,'-l$1')).join(' ')) + 
        (type == 'shared library' ? ' -shared' : '');
};
