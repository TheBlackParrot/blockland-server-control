const net = require("net");

var TCPclients = [];
net.createServer(function(socket) {
	socket.name = socket.remoteAddress + ":" + socket.remotePort;
	TCPclients.push(socket);

	socket.write("OK\r\n");

	socket.on('data', function(data) {
		var parts = data.toString().split("\t").map(function(part) {
			return part.trim();
		});

		if(!(data.toString().trim())) {
			return;
		}

		var type = parts[0];
		var cmd = parts[1];
	});

	socket.on('end', function () {
		TCPclients.splice(TCPclients.indexOf(socket), 1);
	});
}).listen(28999, "127.0.0.1");