var util = require('util');

exports.start = function (server) {
    server.on('request', function (req, res) {
    	// console.log('*********************');
        // console.log('new request => ' + req.url);
    })
}