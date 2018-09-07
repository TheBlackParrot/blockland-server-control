const net = require("net");
const WebSocket = require("ws");
const crypto = require("crypto");
const fs = require("fs");
const os = require("os");

var disableConsole = false;
if(os.type() == "Windows_NT") {
	// can't open console.log while the game is running in Windows; should be fine in Linux and Mac
	disableConsole = true;
}

var accounts = require("./accounts.json");
var settings = require("./settings.json");
var serverKeys = require("./keys.json");

function noop() {}

const wss = new WebSocket.Server({
	host: settings.ws.ip,
	port: settings.ws.port
});
function heartbeat() {
	this.isAlive = true;
}

function checkPermissionLevel(ws, required) {
	if(!ws.loggedInAs) {
		return false;
	}

	if(!ws.identifier) {
		return false;
	}

	if(!(ws.identifier in accounts)) {
		return false;
	}

	if(!(ws.loggedInAs in accounts[ws.identifier])) {
		return false;
	}

	let level = accounts[ws.identifier][ws.loggedInAs].permissionLevel;
	if(level < required) {
		return false;
	}

	return true;
}

wss.on('connection', function connection(ws) {
	ws.isAlive = true;
	ws.on('pong', heartbeat);

	if(ws.readyState === WebSocket.OPEN) {
		ws.send(JSON.stringify({cmd: "needIdent"}));
	}

	ws.on('message', function(raw) {
		let data = JSON.parse(raw);
		let out = {};

		switch(data.cmd) {
			case "setIdent":
				if(data.ident in servers) {
					ws.loggedInAs = undefined;

					ws.identifier = data.ident;

					if("serverStats" in servers[ws.identifier]) {
						out = {
							cmd: "acceptIdent",
							ident: ws.identifier,
							time: Date.now()
						};
						ws.send(JSON.stringify(out));

						out = {
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

				out = {
					cmd: "uptime",
					value: Date.now() - servers[ws.identifier].serverStartedAt,
					time: Date.now()
				};
				ws.send(JSON.stringify(out));
				break;

			case "chat":
				if(!("identifier" in ws)) {
					return;
				}

				if(!checkPermissionLevel(ws, 2)) {
					return;
				}

				out = "MSG\t" + ws.loggedInAs + "\t" + data.msg;
				servers[ws.identifier].write(out + "\r\n");

				out = {
					cmd: "chat",
					who: ws.loggedInAs,
					msg: data.msg,
					remote: true,
					system: false,
					time: Date.now()
				};

				wss.broadcast(ws.identifier, JSON.stringify(out));
				break;

			case "servers":
				out = {
					cmd: "servers",
					servers: gatherServers(),
					time: Date.now()
				};
				ws.send(JSON.stringify(out));
				break;

			case "pings":
				if(!("identifier" in ws)) {
					return;
				}

				if("players" in servers[ws.identifier].serverStats) {
					if(parseInt(servers[ws.identifier].serverStats.players, 10) == 0) {
						return;
					}
				}

				out = {
					cmd: "pings",
					pings: servers[ws.identifier].playerPings,
					time: Date.now()
				};
				ws.send(JSON.stringify(out));
				break;

			case "players":
				if(!("identifier" in ws)) {
					return;
				}

				for(objID in servers[ws.identifier].playerDetails) {
					out = {
						cmd: "playerData",
						mode: "add",
						objID: objID,
						details: servers[ws.identifier].playerDetails[objID],
						time: Date.now()
					};
					ws.send(JSON.stringify(out));
				}
				break;

			case "login":
				out = {
					cmd: "loginAttempt",
					success: false,
					time: Date.now()
				};

				if("lastLoginAttempt" in ws) {
					if(Date.now() - ws.lastLoginAttempt < 1500) {
						ws.send(JSON.stringify(out));
						return;
					}
				}

				ws.lastLoginAttempt = Date.now();

				if(!("identifier" in ws)) {
					ws.send(JSON.stringify(out));
					return;
				}

				if(!("username" in data) || !("hash" in data)) {
					ws.send(JSON.stringify(out));
					return;
				}

				if(!(data.username in accounts[ws.identifier])) {
					ws.send(JSON.stringify(out));
					return;
				}

				if(data.hash != accounts[ws.identifier][data.username].hash) {
					ws.send(JSON.stringify(out));
					return;
				}

				out.success = true;
				out.username = data.username;

				ws.loggedInAs = data.username;

				ws.send(JSON.stringify(out));
				break;

			case "vars":
				out = {
					cmd: "vars",
					vars: {},
					time: Date.now()
				};

				if(!("identifier" in ws)) {
					return;
				}

				if(!("serverVars" in servers[ws.identifier])) {
					return;
				}

				for(let variable in servers[ws.identifier].serverVars) {
					let varData = servers[ws.identifier].serverVars[variable];
					let toAdd = {
						unavailable: true
					};

					if(checkPermissionLevel(ws, varData.permissionLevel.view)) {
						toAdd.value = varData.value;
						toAdd.unavailable = false;
					} else {
						toAdd.value = "[value hidden]";
					}

					toAdd.type = varData.type;

					out.vars[variable] = toAdd;
				}

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
		if(parts.length < 3) {
			return "ERR\t0";
		}

		if(parts[1] in servers) {
			return "ERR\t1";
		}

		if(parts[1] in serverKeys) {
			if(parts[2] != serverKeys[parts[1]]) {
				return "ERR\t6";
			}
		} else {
			serverKeys[parts[1]] = parts[2];
			fs.writeFileSync("./keys.json", JSON.stringify(serverKeys), {encoding: 'utf8'});
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
			remote: false,
			system: false,
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
				permissionLevel: (Object.keys(accounts[socket.serverIdentifier]).length ? 0 : 4),
				time: Date.now()
			};
		} else {
			return "ERR\t4";
		}

		fs.writeFileSync("./accounts.json", JSON.stringify(accounts), {encoding: 'utf8'});

		return "NEWACCOUNT\t" + parts[1] + "\t" + pass;
	},

	"detail": function(socket, parts) {
		if(parts.length < 2) {
			return "ERR\t0";
		}

		if(!("serverIdentifier" in socket)) {
			return "ERR\t2";
		}

		if(!("serverDetails" in socket)) {
			socket.serverDetails = {
				ip: socket.remoteAddress,
				identifier: socket.serverIdentifier
			};
		}

		let out = {
			cmd: "detail",
			details: {},
			time: Date.now()
		}

		for(let idx = 1; idx < parts.length; idx++) {
			let part = parts[idx].split("|");

			if(part.length < 2) {
				continue;
			}

			socket.serverDetails[part[0]] = part[1];
			out.details[part[0]] = part[1];

			wss.broadcast(socket.serverIdentifier, JSON.stringify(out));
		}
	},

	"ping": function(socket, parts) {
		if(parts.length < 2) {
			return "ERR\t0";
		}

		if(!("serverIdentifier" in socket)) {
			return "ERR\t2";
		}

		if(!("playerPings" in socket)) {
			socket.playerPings = {};
		}

		for(let idx = 1; idx < parts.length; idx++) {
			let part = parts[idx].split(" ");

			if(part.length < 3) {
				continue;
			}

			socket.playerPings[part[0]] = [part[1], part[2]];
		}	
	},

	"playerData": function(socket, parts) {
		if(parts.length < 3) {
			return "ERR\t0";
		}

		if(["add", "del"].indexOf(parts[1]) == -1) {
			return "ERR\t5";
		}

		if(!("serverIdentifier" in socket)) {
			return "ERR\t2";
		}

		if(!("playerDetails" in socket)) {
			socket.playerDetails = {};
		}

		let subCmd = parts[1];
		let objID = parts[2];
		let now = Date.now();

		let out = {
			cmd: "playerData",
			mode: subCmd,
			objID: objID,
			time: now
		}

		if(subCmd == "add") {
			broadcastConnectMsg = false;

			if(!(objID in socket.playerDetails)) {
				socket.playerDetails[objID] = {
					joined: now
				};

				out.details = {
					joined: now
				};

				broadcastConnectMsg = true;
			} else {
				out.details = {
				};
			}

			for(let idx = 3; idx < parts.length; idx++) {
				let part = parts[idx].split("|");

				if(part.length < 2) {
					continue;
				}

				if(broadcastConnectMsg && part[0] == "name") {
					let out2 = {
						cmd: "chat",
						msg: part[1] + " connected",
						remote: false,
						system: true,
						time: Date.now()
					};
					wss.broadcast(socket.serverIdentifier, JSON.stringify(out2));
				}

				socket.playerDetails[objID][part[0]] = part[1];
				out.details[part[0]] = part[1];
			}
		} else if(parts[1] == "del") {
			if(objID in socket.playerDetails) {
				let out2 = {
					cmd: "chat",
					msg: socket.playerDetails[objID].name + " left the game",
					remote: false,
					system: true,
					time: Date.now()
				};
				wss.broadcast(socket.serverIdentifier, JSON.stringify(out2));

				delete socket.playerDetails[objID];
			}
			if(objID in socket.playerPings) {
				delete socket.playerPings[objID];
			}
		}

		wss.broadcast(socket.serverIdentifier, JSON.stringify(out));
	},

	"var": function(socket, parts) {
		if(parts.length < 6) {
			return "ERR\t0";
		}

		if(!("serverIdentifier" in socket)) {
			return "ERR\t2";
		}

		if(!("serverVars" in socket)) {
			socket.serverVars = {};
		}

		// "var" TAB %var TAB %type TAB %view TAB %edit
		socket.serverVars[parts[1]] = {
			type: parts[2],

			permissionLevel: {
				view: parts[3],
				edit: parts[4]
			},

			value: parts[5]
		}
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

function gatherServers() {
	let out = [];

	for(let ident in servers) {
		let socket = servers[ident];

		out.push({
			identifier: ident,
			details: socket.serverDetails
		});
	}

	return out;
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
}).listen(settings.tcp.port, "127.0.0.1");