var fs = require('fs');
var sys = require('sys');
var mime = require('./mime');
var url = require('url');
var path = require('path');

exports.handle = function (req, res) {
    var send = new Sender(req, res);
    send.docroot(req.basicServer.module.options.docroot)
        .index(['index.html', 'index.htm'])
        .send();
}

function Sender(req, res) {
    this.req = req;
    this.res = res;
    this.useIndex = false;
}

Sender.prototype = {
    docroot: function (root) {
        this.root = root;
        this.pathParse();
        return this;
    },
    pathParse: function () {
        var path = url.parse(decodeURIComponent(this.req.url)).pathname;
        this.path = this.root + path;
        return this;
    },
    index: function (index) {
        if (this.path[this.path.length - 1] == '/') {
            var i = 0,
                idx = [].concat(index);
            for (; i < idx.length; i++) {
                if (fs.existsSync(this.path + idx[i])) {
                    this.useIndex = true;
                    this.path += idx[i];
                    break;
                }
            }
        }
        return this;
    },
    parseRange: function(len, range) {
        var i = range.indexOf('=');
        var invalid = false;
        if (i == -1) return false;
        var arr = range.slice(i + 1).split(',').map(function(item){
            var rg = item.split('-');
            var start = parseInt(rg[0]);
            var end = parseInt(rg[1]);
            // --xxx
            if (isNaN(start)) {
                start = len - end;
                end = len - 1;
            }
            // xxx-
            else if (isNaN(end)) {
                end = len - 1;
            }

            if (end > len) end = len - 1;

            if (isNaN(start) || isNaN(end) || start > end) invalid = true;

            return {start: start, end: end};
        });
        return invalid ? false : arr;

    },
    isMelicious: function () {
        var realpath = path.normalize(this.path);
        return realpath.indexOf(this.root);
    },
    error: function (code) {
        var res = this.res;
        res.statusCode = code;
        res.end();
    },
    redirect: function () {
        var res = this.res;
        var req = this.req;
        res.statusCode = 301;
        res.setHeader('Location', req.url + '/');
        res.end();
    },
    notModified: function () {
        var res = this.res;
        res.statusCode = 304;
        res.end();
    },
    isNotModified: function () {
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

        return !!(etagMatches && notModified);
    },
    send: function () {
        var res = this.res;
        var req = this.req;
        var that = this;
        var options = {};
        var melicious = this.isMelicious();

        if (melicious == -1 || melicious > 0) return this.error(403);
        if (melicious == -2) return this.error(404);

        fs.stat(this.path, function (err, stats) {
            if (err) return that.error(404);
            if (stats.isDirectory()) return that.redirect();

            var len = stats.size;
            res.statusCode = 200;
            res.setHeader('Content-Type', mime.lookup(that.path));
            that.setHeader(stats);

            if (that.isNotModified()) return that.notModified();

            if (req.headers.range) {
                var range = that.parseRange(stats.size, req.headers.range);
                if (range) {
                    res.statusCode = 206;
                    res.setHeader('Content-Range', 'bytes '
                        + range[0].start + '-' + range[0].end
                        + '/' + stats.size);
                    options.start = range[0].start;
                    options.end = range[0].end;
                    len = range[0].end - range[0].start + 1;
                }
            }
            res.setHeader('Content-Length', len);

            var stream = fs.createReadStream(that.path, options);
            stream.pipe(res);
            stream.on('error', function () {
                res.destroy();
            });
            req.on('close', stream.destroy.bind(stream));
        });
    },
    setHeader: function (stats) {
        var req = this.req;
        var res = this.res;
        res.setHeader('Last-Modified', stats.mtime.toUTCString());
        res.setHeader('Etag', etag(stats));
        res.setHeader('Date', (new Date).toUTCString());
    }
}

function etag(stats) {
    return '"' + Number(stats.mtime) + '"';
}