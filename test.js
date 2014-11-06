var repl = require('repl');

repl.start({
	prompt: 'Please input the port:',
	eval: function(cmd, context, filename, callback){
		var port = parseInt(cmd.replace(/[^\d]/g, ''));
		console.log(cmd);
		console.log(port);
		if (isNaN(port)) {
			callback();
		} else {
			console.log('server start, port %d', port);
			repl.exit();
		}
	}
});