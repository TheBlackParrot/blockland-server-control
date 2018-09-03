const net = require("net");
const WebSocket = require("ws");
const events = require("events");

function noop() {}

const wss = new WebSocket.Server({
	port: 28999
});
function heartbeat() {
	this.isAlive = true;
}
wss.on('connection', function connection(ws) {
	ws.isAlive = true;
	ws.on('pong', heartbeat);
});
const interval = setInterval(function ping() {
	wss.clients.forEach(function each(ws) {
		if(ws.isAlive === false) {
			return ws.terminate();
		}

		ws.isAlive = false;
		ws.ping(noop);
	});
}, 60000);

wss.broadcast = function broadcast(data) {
	wss.clients.forEach(function each(client) {
		if(client.readyState === WebSocket.OPEN) {
			client.send(data, function ack(err) {
				// do nothing
			});
		}
	});
};

/*
var emitter = new events.EventEmitter();
emitter.addListener("chat", function(who, msg) {
	wss.broadcast({
		who: who,
		msg: msg,
		time: Date.now()
	});
});
*/

var servers = {};
var funcs = {
	"connect": function(socket, parts) {
		if(parts.length < 2) {
			return "ERR\t0";
		}

		if(parts[1] in servers) {
			return "ERR\t1";
		}

		socket.serverIdentifier = parts[1];
		
		return "HELLO\t" + parts[1];
	}
};

function handle(socket, parts) {
	if(!parts.length) {
		return;
	}

	let cmd = parts[0];

	if(!cmd) {
		return;
	}

	console.log("[" + socket.serverIdentifier + "] " + parts.join(" "));

	let send = function(data) {
		socket.write(data + "\r\n");
	}

	if(cmd in funcs) {
		send(funcs[cmd](socket, parts));
	}
}

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

		handle(socket, parts)
	});

	socket.on('end', function () {
		if("serverIdentifier" in socket) {
			if(socket.serverIdentifier in servers) {
				delete servers[socket.serverIdentifier];
			}
		}

		TCPclients.splice(TCPclients.indexOf(socket), 1);
	});
}).listen(28900, "127.0.0.1");