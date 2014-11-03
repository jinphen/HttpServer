var sniffer = require('./httpSniffer');
var server = require('./basicServer').createServer();

var port = 8080;
var docroot = process.argv[2] || './static';
console.log('docroot: %s', docroot);

server.docroot('localhost', '/', docroot);
server.router('localhost', '/search', require('./searchProxy'));

sniffer.start(server);

server.listen(port);
console.log('server listen on ' + port);