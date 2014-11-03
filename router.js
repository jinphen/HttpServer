var paths = {};

function getModule(path) {
	if (!path) return paths['/'];
	if (paths[path]) return paths[path];
	
	var pathArr = path.split('/');
	pathArr.pop();
	path = pathArr.join('/');
	return getModule(path);
}

exports.add = function(path, handle, options){
	paths[path] = handle;
	handle.path = path;
	handle.options = options;
}

exports.isPathExist = function(path) {
	return paths[path];
}

exports.getModule = getModule;