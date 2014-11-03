var mime = {
    c: 'text/plain',
    css: 'text/css',
    htm: 'text/html',
    html: 'text/html',
    ico: 'image/x-icon',
    jpe: 'image/jpeg',
    jpeg: 'image/jpeg',
    jpg: 'image/jpeg',
    js: 'application/x-javascript'
}

exports.lookup = function (filename) {
	if (!filename) return 'text/plain';
    var index = filename.lastIndexOf('.');
    if (index === -1) return 'text/plain';
    var ext = filename.substring(index + 1);
    return mime[ext] || 'text/plain';
}