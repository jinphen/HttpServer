var http = require('http');
var util = require('util');
var events = require('events');
var fs = require('fs');
var iconv = require('iconv-lite');
var buffer = require('buffer');

exports.handle = function (req, res) {

    var reqQuery = req.basicServer.urlParsed.query.keyword || '';
    var url = 'http://suggestion.baidu.com/su?wd=' + reqQuery + '&sugmode=2&json=1';
    var bdResData = '';

    http.get(url, function (bdRes) {
        bdRes.setEncoding('binary');
        if (bdRes.statusCode == 200) {
            bdRes.on('data', function (data) {
                bdResData += data;
            });
            bdRes.on('end', function () {
                var converted = iconv.decode(bdResData, 'gbk');
                console.log('Baidu Orignal Data: \n' + converted);
                var suggest = parseBaiduSuggest(converted);
                var sugStr = JSON.stringify(suggest);
                console.log('Baidu Res Data: \n' + sugStr);

                res.writeHead(200, {
                    'Content-Type': 'text/html',
                    'Content-Length': sugStr ? new buffer.Buffer(sugStr).length : 0
                });
                res.end(sugStr);
            });
        } else {
            console.warn('Baidu Res Code: ' + bdRes.statusCode);
            res.end('error');
        }
    }).on('error', function (e) {
        console.error('Get Baidu Search Suggest Error: ' + e);
        res.end('error');
    }).end();
}

function parseBaiduSuggest(str) {
    var suggest = [];
    str = str.replace(/window.baidu./, '');

    function sug(data) {
        suggest = data;
    }
    eval(str, 0);
    return suggest;
}