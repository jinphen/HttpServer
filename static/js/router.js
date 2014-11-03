define(function(require, exports, module){
	var paths = {};

	function getHandle(path) {
		if (!path) return paths['/'];
		if (paths[path]) return paths[path];
		
		var pathArr = path.split('/');
		pathArr.pop();
		path = pathArr.join('/');
		return getHandle(path);
	}

	exports.add = function(path, handle){
		paths[path] = handle;
	}

	exports.dispatch = function(path) {
		var handle = getHandle(path);
		if (handle) handle(path);
		else console.error('error path: %s', path);
	}

	exports.getHandle = getHandle;
});