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

exports.handle = function(req, res) {
	if (req.method !== 'GET'){
		res.writeHead(404, { 'Content-Type': 'text/plain' });
		res.end('invalid method ' + req.method);
	} else {
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