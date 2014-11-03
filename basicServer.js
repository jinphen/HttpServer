var http = require('http');
var url = require('url');
var router = require('./router');

exports.createServer = function () {
    var httpServer = http.createServer(function (req, res) {
        req.basicServer = {
            urlParsed: url.parse(req.url, true)
        };
        processHeader(req, res);
        dispatchToContainer(req, res);
    });
    httpServer.docroot = function (host, path, rootpath) {
        return this.router(host, path, require('./staticHandler'), {
            docroot: rootpath
        });
    }
    httpServer.router = function(host, path, module, options) {
        if (router.isPathExist(path)) {
            console.warn('The path: "%s" have been used, previous will be override.', path);
        }
        router.add(path, module, options);
        return this;
    }
    return httpServer;
}

function processHeader(req, res) {
    req.basicServer.cookies = [];
    var keys = Object.keys(req.headers);
    for (var i = 0; i < keys.length; i++) {
        var hname = keys[i];
        var hval = req.headers[hname];
        if (hname.toLowerCase() === 'host') {
            req.basicServer.host = hval;
        }
        if (hname.toLowerCase() === 'cookie') {
            req.basicServer.cookies.push(hval);
        }
    }
}

function dispatchToContainer(req, res) {
    var module = router.getModule(req.basicServer.urlParsed.pathname);
    if (module) {
        req.basicServer.module = module;
        console.log('-------------------------');
        console.log('request url: %s', req.url);
        console.log('process path: %s', req.basicServer.urlParsed.pathname);
        console.log('module path: %s', module.path);
        module.handle(req, res);
    } else {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('no handle found for ' + req.basicServer.host + '/' + req.basicServer.urlParsed.path);      
    }
}