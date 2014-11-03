var fs = require('fs');
var sys = require('sys');
var mime = require('./mime');
/**
 * {
 * 		'filename': {
 * 			mtime: 12121212112,
 * 			size: 321,
 * 			mime: 'application/x-javascript',
 * 			data: 'xxxxxxx'
 * 		}
 * }
 * @type {Object}
 */
var cache = {};

function fileHandle(filename, req, res) {
	fs.stat(filename, function(err, stats){
		if (err) {
			res.writeHead(404, { 'Content-Type': 'text/html' });
			res.end('<h1>Not Found</h1>');
		} else {
			//目录
			if (stats.isDirectory()) {
				if (!filename.match(/\/$/)) filename += '/';
				filename += 'index.html';
				fileHandle(filename, req, res);
			} else {
                //根据If-Modified-Since判断文件是否改变
                var modifyDate = req.headers['If-Modified-Since'.toLowerCase()];
                if (modifyDate && (new Date(modifyDate)).getTime() >= stats.mtime.getTime()) {
                    res.writeHead(304, { 
                        'Content-Type': mime.lookup(filename), 
                        'Content-Length': 0,
                        'Last-Modified': stats.mtime.toUTCString()
                    });
                    res.end();
                } else {
    				var fileInfo = cache[filename];
    				//未修改
    				if (fileInfo && fileInfo.mtime === stats.mtime.getTime()) {
    					res.writeHead(200, { 
    						'Content-Type': fileInfo.mime, 
    						'Content-Length': fileInfo.size,
                            'Last-Modified': stats.mtime.toUTCString()
    					});
    					res.end(fileInfo.data);
    				} else {
    					fs.readFile(filename, function(err, data){
    						if (err) {
    							res.writeHead(500, { 'Content-Type': 'text/plain' });
    							res.end('file ' + filename + ' not readable ' + err);
    						} else {
    							var mimeType = mime.lookup(filename);
    							var size = stats.size;

    							//缓存
    							cache[filename] = {
    								mtime: stats.mtime.getTime(),
    								size: size,
    								mime: mimeType,
    								data: data
    							}

    							//发送数据
    							res.writeHead(200, { 
                                    'Content-Type': mimeType,
                                    'Content-Length': size,
                                    'Last-Modified': stats.mtime.toUTCString()
    							});
    							res.end(data);
    						}
    					})
    				}
                }
			}
		}
	});
}

exports.handle = function(req, res) {
	if (req.method !== 'GET'){
		res.writeHead(404, { 'Content-Type': 'text/plain' });
		res.end('invalid method ' + req.method);
	} else {
		// var filename = req.basicServer.module.options.docroot + req.basicServer.urlParsed.pathname;
		// fileHandle(filename, req, res);

        new SendStream(req, res).send();
	}
}

function SendStream(req, res){
    this.req = req;
    this.res = res;
}

SendStream.prototype.pathParse = function() {
    var req = this.req;
    var path =  req.basicServer.module.options.docroot + req.basicServer.urlParsed.pathname;
    if ('/' == path[path.length -1]) path += 'index.html';
    return path;
}

SendStream.prototype.error = function(code) {
    var res = this.res;
    res.statusCode = code;
    res.end();
}

SendStream.prototype.redirect = function() {
    var res = this.res;
    var req = this.req;
    res.statusCode = 301;
    res.setHeader('Location', req.url + '/');
    res.end();
}

SendStream.prototype.notModified = function() {
    var res = this.res;
    res.statusCode = 304;
    res.end();
}

SendStream.prototype.isModified = function() {
    var etagMatches = true;
    var notModified = true;

    var reqHeader = this.req.headers,
        resHeader = this.res._headers,
        modifiedSince = reqHeader['if-modified-since'],
        noneMatch = reqHeader['if-none-match'],
        lastModified = resHeader['last-modified'],
        etag = resHeader['etag'],
        cc = reqHeader['cache-control'];

    // unconditional request
    if (!modifiedSince && !noneMatch) return false;

    // check for no-cache cache request directive
    if (cc && cc.indexOf('no-cache') !== -1) return false;  

    // parse if-none-match
    if (noneMatch) noneMatch = noneMatch.split(/ *, */);

    // if-none-match
    if (noneMatch) etagMatches = ~noneMatch.indexOf(etag) || '*' == noneMatch[0];

    // if-modified-since
    if (modifiedSince) {
        modifiedSince = new Date(modifiedSince);
        lastModified = new Date(lastModified);
        notModified = lastModified <= modifiedSince;
    }

    return !! (etagMatches && notModified);
}

SendStream.prototype.send = function() {
    var res = this.res;
    var path = this.pathParse();
    var that = this;

    fs.stat(path, function(err, stats) {
        if (err) return that.error(404);
        if (stats.isDirectory()) return that.redirect();

        res.statusCode = 200;
        that.setHeader(stats);

        if (that.isModified()) return that.notModified();

        var stream = fs.createReadStream(path);
        stream.pipe(res);
    });
}

SendStream.prototype.setHeader = function(stats) {
    var res = this.res;
    res.setHeader('Last-Modified', stats.mtime.toUTCString());
    res.setHeader('Content-Length', stats.size);
    res.setHeader('Etag', etag(stats));
    res.setHeader('Date', (new Date).toUTCString());
}

function etag(stats) {
    return '"' + Number(stats.mtime) + '"';
}