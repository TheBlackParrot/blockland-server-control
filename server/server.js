const net = require("net");
const WebSocket = require("ws");
const crypto = require("crypto");
const fs = require("fs");

var accounts = require("./accounts.json");

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

	if(ws.readyState === WebSocket.OPEN) {
		ws.send(JSON.stringify({cmd: "needIdent"}));
	}

	ws.on('message', function(raw) {
		let data = JSON.parse(raw);

		switch(data.cmd) {
			case "setIdent":
				ws.identifier = data.ident;

				if(ws.identifier in servers) {
					if("serverStats" in servers[ws.identifier]) {
						var out = {
							cmd: "acceptIdent",
							time: Date.now()
						};
						ws.send(JSON.stringify(out));

						var out = {
							cmd: "stat",
							stats: servers[ws.identifier].serverStats,
							time: Date.now()
						};

						ws.send(JSON.stringify(out));
					}
				}
				break;

			case "uptime":
				if(!("identifier" in ws)) {
					return;
				}

				var out = {
					cmd: "uptime",
					value: Date.now() - servers[ws.identifier].serverStartedAt,
					time: Date.now()
				};
				ws.send(JSON.stringify(out));
				break;
		}
	});
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

wss.broadcast = function broadcast(identifier, data) {
	wss.clients.forEach(function each(client) {
		if(client.readyState === WebSocket.OPEN) {
			if(client.identifier == identifier) {
				client.send(data, function ack(err) {
					// do nothing
				});
			}
		}
	});
};

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
		servers[parts[1]] = socket;
		
		return "HELLO\t" + parts[1];
	},

	"chat": function(socket, parts) {
		if(parts.length < 3) {
			return "ERR\t0";
		}

		if(!("serverIdentifier" in socket)) {
			return "ERR\t2";
		}

		let out = {
			cmd: "chat",
			who: parts[1],
			msg: parts[2],
			time: Date.now()
		};

		wss.broadcast(socket.serverIdentifier, JSON.stringify(out));
	},

	"stat": function(socket, parts) {
		if(parts.length < 2) {
			return "ERR\t0";
		}

		if(!("serverIdentifier" in socket)) {
			return "ERR\t2";
		}

		if(!("serverStats" in socket)) {
			socket.serverStats = {};
		}

		let out = {
			cmd: "stat",
			stats: {},
			time: Date.now()
		}

		for(let idx = 1; idx < parts.length; idx++) {
			let part = parts[idx].split("|");

			if(part.length < 2) {
				continue;
			}

			socket.serverStats[part[0]] = part[1];
			out.stats[part[0]] = part[1];

			wss.broadcast(socket.serverIdentifier, JSON.stringify(out));
		}
	},

	"uptime": function(socket, parts) {
		if(parts.length < 2) {
			return "ERR\t0";
		}

		if(!("serverIdentifier" in socket)) {
			return "ERR\t2";
		}

		// fwiw parts[1] is always a string and this hurts to look at
		socket.serverStartedAt = Date.now() - (parts[1] * 1000);
	},

	"createAccount": function(socket, parts) {
		if(parts.length < 2) {
			return "ERR\t0";
		}

		if(!("serverIdentifier" in socket)) {
			return "ERR\t2";
		}

		if(!(socket.serverIdentifier in accounts)) {
			accounts[socket.serverIdentifier] = {};
		}

		if(parts[1] == "") {
			return "ERR\t3";
		}

		let pass = crypto.randomBytes(9).toString('base64');
		let hash = crypto.createHash('sha512').update(pass).digest('hex');

		if(!(parts[1] in accounts[socket.serverIdentifier])) {
			accounts[socket.serverIdentifier][parts[1]] = {
				hash: hash,
				permissionLevel: 0,
				time: Date.now()
			};
		} else {
			return "ERR\t4";
		}

		fs.writeFileSync("./accounts.json", JSON.stringify(accounts), {encoding: 'utf8'});

		return "NEWACCOUNT\t" + parts[1] + "\t" + pass;
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
		let out = funcs[cmd](socket, parts);
		if(out) {
			send(out);
		}
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

	socket.on("error", function(err) {
		if("serverIdentifier" in socket) {
			if(socket.serverIdentifier in servers) {
				delete servers[socket.serverIdentifier];
			}
		}

		TCPclients.splice(TCPclients.indexOf(socket), 1);		
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