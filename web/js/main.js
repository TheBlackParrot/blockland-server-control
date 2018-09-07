var ws = new WebSocket("ws://10.161.8.254:28999");

function sendNotification(type, msg, sticky = false) {
	let elem = $('<div class="notification"></div>').addClass(type + "Notification");

	switch(type) {
		case "error":
			elem.html('<i class="fas fa-fw fa-times-circle"></i> ' + msg);
			break;

		case "success":
			elem.html('<i class="fas fa-fw fa-check-circle"></i> ' + msg);
			break;

		case "warning":
			elem.html('<i class="fas fa-fw fa-exclamation-triangle"></i> ' + msg);
			break;
	}

	elem.addClass("fadeIn");
	$(".notifWrapper").append(elem);

	if(!sticky) {
		setTimeout(function() {
			elem.addClass("fadeOut");
			elem.bind("animationend webkitAnimationEnd oAnimationEnd MSAnimationEnd", function() {
				$(this).remove();
			});
		}, 10000);
	}
}

ws.onerror = function(event) {
	if(event.type == "error") {
		sendNotification("error", "Error with connection to the remote control master at " + event.target.url);
	}
}

ws.onopen = function(event) {
	sendNotification("success", "Connected to the remote control master at " + event.target.url);

	var out = {
		cmd: "servers"
	};
	ws.send(JSON.stringify(out));
}

function getPlayerRank(rank = 0) {
	/*
		%rank = 0;
		if(%this.isAdmin) { %rank = 1; }
		else if(%this.isSuperAdmin) { %rank = 2; }
		else if(%this.isModerator) { %rank = 3; } // in case
		else if(%this.bl_id == getNumKeyID() || %this.bl_id === 999999) { %rank = 4; }
	*/
	let ranks = ["", "A", "SA", "M", "H"];
	return ranks[rank];
}

function getTimeString(value) {
	value = Math.floor(value);

	let seconds = value % 60;
	let minutes = Math.floor(value / 60) % 60;
	let hours = Math.floor(value / 60 / 60) % 24;
	let days = Math.floor(value / 60 / 60 / 24);

	let out = [];
	if(days > 0) { out.push(days.toString() + "d"); }
	if(hours > 0) { out.push(hours.toString() + "h"); }
	if(minutes > 0) { out.push(minutes.toString() + "m"); }
	out.push(seconds.toString() + "s");

	return out.join(" ");
}

function formatDate(timestamp = Date.now()) {
	let d = new Date(timestamp);

	let month = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][d.getMonth()];
	let day = d.getDate();
	let year = d.getFullYear();

	let hours = d.getHours();
	let minutes = ("00" + d.getMinutes()).substr(-2, 2);
	let seconds = ("00" + d.getSeconds()).substr(-2, 2);

	return [[month, day, year].join(" "), [hours, minutes, seconds].join(":")].join(", ");
}

var curUptime = 0;

var uptimeLoop;
function startLoops() {
	let uptimeFunc = function() {
		curUptime++;
		$("#uptimeValue").text(getTimeString(curUptime));
	}
	uptimeFunc();

	uptimeLoop = setInterval(uptimeFunc, 1000);
}

var pingLoop;
function startPlayerLoops() {
	let pingFunc = function() {
		var out = {
			cmd: "pings"
		}

		ws.send(JSON.stringify(out));
	}
	pingFunc();

	let connectedForFunc = function() {
		for(objID in playerData) {
			let elapsed = (Date.now() - playerData[objID].joined)/1000;
			$('.playerRow[data-objid="' + objID + '"] .elapsedValue').text(getTimeString(elapsed));

			if(viewingPlayer == objID) {
				$("#playerStatTableElapsed").text(formatDate(playerData[objID].joined)).append($('<span class="dialogSmallText"></span>').text("(" + getTimeString(elapsed) + " ago)"));
			}
		}
	}
	connectedForFunc();

	connectedForFunc = setInterval(connectedForFunc, 1000);
	pingLoop = setInterval(pingFunc, 3000);
}

function stopLoops() {
	clearInterval(uptimeLoop);
}

function stopPlayerLoops() {
	clearInterval(pingLoop);
}

function autoLogin(identifier = activeIdentifier) {
	let username = localStorage.getItem("username-" + identifier);
	let hash = localStorage.getItem("hash-" + identifier);

	if(!username || !hash) {
		console.log("Not automatically logging in, credentials missing.");
		return;
	}

	var out = {
		cmd: "login",
		username: username,
		hash: hash
	};
	ws.send(JSON.stringify(out));
}

var serverData = {};
var playerData = {};
var activeIdentifier;
ws.onmessage = function(event) {
	let data = JSON.parse(event.data);

	console.log(data);

	switch(data.cmd) {
		case "chat":
			var elem = $('<div class="chatRow"></div>');

			var msgElem = $('<span class="chatMsg"></span>').text(data.msg);

			if(!data.system) {
				var nameElem = $('<span class="chatName"></span>').text(data.who);
				if(data.remote) { nameElem.addClass("chatNameRemote"); }

				elem.append(nameElem);
			} else {
				msgElem.addClass("chatSystemMessage");
			}

			elem.append(msgElem);
			
			$('#allChatRows').append(elem);
			break;

		case "needIdent":
			// temporary
			break;

		case "acceptIdent":
			activeIdentifier = data.ident;

			autoLogin();

			var out = {
				cmd: "uptime"
			}
			ws.send(JSON.stringify(out));

			var out = {
				cmd: "players"
			};
			ws.send(JSON.stringify(out));

			$(".playerRow").remove();
			$(".wrapper").show();
			$("#setCredentialsButton").show();
			break;

		case "stat":
			Object.keys(data.stats).map(function(key) {
				let value = data.stats[key];
				switch(key) {
					case "bricks":
						$("#brickCountValue").text(parseInt(value, 10).toLocaleString());
						break;

					case "players":
						$("#playerCount").text(value);
						break;

					case "maxplayers":
						$("#playerCountMax").text(value);
						break;

					case "dedicated":
						if(!parseInt(value, 10)) {
							$("#restartButton").addClass("disabled");
							$("#startStopButton").addClass("disabled");

							sendNotification("warning", "This server is not dedicated, server process management has been disabled.", true);
						}
						break;
				}
			});
			break;

		case "uptime":
			curUptime = Math.floor(data.value/1000);
			startLoops();
			break;

		case "servers":
			serverData = data.servers;
			for(let idx in data.servers) {
				let server = data.servers[idx];
				let details = server.details;

				elem = $('<div class="selectorRow"></div>').attr("data-identifier", details.identifier);

				elem.append($('<span class="selectorHost">Blockhead</span>').text(details.hostName));
				elem.append($('<span class="selectorTitle">Server</span>').text(details.title));
				
				elem.append($('<br/>'));
				
				elem.append($('<span class="selectorIdent">(NOTSET-ffffff)</span>').text(details.identifier));
				elem.append($('<span class="selectorAddress">127.0.0.1:28000</span>').text([details.ip, details.port].join(":")));

				$("#selectorMenu").append(elem);
			}
			break;

		case "playerData":
			if(data.mode == "add") {
				if(!(data.objID in playerData)) {
					playerData[data.objID] = data.details;
				} else {
					Object.assign(playerData[data.objID], data.details);
				}

				if($('.playerRow[data-objid="' + data.objID + '"]').length) {
					return;
				}

				elem = $('<tr class="playerRow"></tr>').attr("data-objid", data.objID);
				elem.append($('<td></td>').text(getPlayerRank(parseInt(data.details.rank, 10))));
				elem.append($('<td></td>').text(data.details.name));
				elem.append($('<td></td>').text(data.details.blid));
				elem.append($('<td class="elapsedValue"></td>').text(getTimeString((Date.now() - data.details.joined)/1000)));
				elem.append($('<td class="pingValue"></td>').text(""));

				$("#playerList").append(elem);
			} else if(data.mode == "del") {
				if(data.objID in playerData) {
					delete playerData[data.objID];
				}

				$('.playerRow[data-objid="' + data.objID + '"]').remove();
			}
			break;

		case "pings":
			for(let objid in data.pings) {
				let ping = parseInt(data.pings[objid][0], 10);
				elem = $('.playerRow[data-objid="' + objid + '"] .pingValue');

				playerData[objid].ping = data.pings[objid][0];
				playerData[objid].packetLoss = data.pings[objid][1];

				elem.text(ping.toLocaleString() + "ms");
				if(ping > 250) {
					elem.addClass("warningValue");
				} else {
					elem.removeClass("warningValue");
				}

				if(viewingPlayer == objid) {
					$("#playerStatTablePing").text(data.pings[objid][0].toLocaleString() + "ms").append($('<span class="dialogSmallText"></span>').text("(PL " + data.pings[objid][1].toLocaleString() + ")"));
				}
			}
			break;

		case "loginAttempt":
			$("#submitCredentialsButton").removeClass("disabled");

			if(data.success) {
				closeDialog();
				sendNotification("success", "Logged in as " + data.username + " on server " + activeIdentifier);

				localStorage.setItem("username-" + activeIdentifier, data.username);
				if($("#loginPasswordBox").val()) {
					localStorage.setItem("hash-" + activeIdentifier, sha512($("#loginPasswordBox").val()));
				}

				$("#loggedInAs").text("Logged in as " + data.username);
			} else {
				$("#loginPasswordBox").val("");
				$("#loggedInAs").text("Login failed, please try again.");
			}
			break;
	}
}
/*
		<div class="selectorRow">
			<span class="selectorHost">Goodspot's</span> <span class="selectorTitle">Not Speedkart</span><br/>
			<span class="selectorIdent">(28002-c12f56)</span> <span class="selectorAddress">192.168.24.3:28002</span><br/>
			<span class="selectorPermissions">Permission level 2</span>
		</div>
*/

$("#selectorMenuSelected").on("click", function(event) {
	$("#selectorMenu").show();

	if($(this).hasClass("selectorMenuActive")) {
		$(this).removeClass("selectorMenuActive");
		
		$("#selectorMenuIcon").removeClass("rotate90");

		$("#selectorMenu").removeClass("selectorMenuSlideDown");
		$("#selectorMenu").addClass("selectorMenuSlideUp");
	} else {
		$(this).addClass("selectorMenuActive");

		$("#selectorMenuIcon").addClass("rotate90");

		$("#selectorMenu").addClass("selectorMenuSlideDown");
		$("#selectorMenu").removeClass("selectorMenuSlideUp");
	}
});

$('#selectorMenu').on("click", ".selectorRow", function(event) {
	var out = {
		cmd: "setIdent",
		ident: $(this).attr("data-identifier")
	};

	ws.send(JSON.stringify(out));

	$("#selectorMenuSelected .selectorRow").remove();
	$("#selectorMenuSelected").append($(this).clone());

	$('#selectorMenuSelected').removeClass("selectorMenuActive");
	
	$("#selectorMenuIcon").removeClass("rotate90");

	$("#selectorMenu").removeClass("selectorMenuSlideDown");
	$("#selectorMenu").addClass("selectorMenuSlideUp");

	$(".wrapper").hide();

	stopLoops();
});

$("#chatInput").keypress(function(e) {
	if(e.which == 13) {
		let val = $(this).val();
		if(!val) { return false; }

		var out = {
			cmd: "chat",
			msg: val
		};

		ws.send(JSON.stringify(out));

		$(this).val("");
	}
})

$(".cardTab").on("click", function(event) {
	$("#consoleCard").hide();
	$("#playersCard").hide();

	let which = $(this).text();
	switch(which) {
		case "Console":
			stopPlayerLoops();
			$("#consoleCard").show();
			break;

		case "Players":
			stopPlayerLoops();
			startPlayerLoops();
			$("#playersCard").show();
			break;
	}
});

function closeDialog() {
	$("#dialogWrapper").addClass("fadeOut");
	$("#dialogWrapper").removeClass("fadeIn");

	$("#dialogWrapper").one("animationend webkitAnimationEnd oAnimationEnd MSAnimationEnd", function() {
		if($("#dialogWrapper").hasClass("fadeOut")) { // only once, they said
			$("#dialogWrapper").hide();
		}
	});

	$(".dialog").hide();	
}

function showDialog(which) {
	$("#dialogWrapper").removeClass("fadeOut");
	$("#dialogWrapper").addClass("fadeIn");
	$("#dialogWrapper").show();

	$(".dialog").hide();
	$(which).show();	
}

$("#setCredentialsButton").on("click", function(event) {
	showDialog("#loginDialog");
});

$(".closeDialogButton").on("click", function(event) {
	closeDialog();
});

$("#submitCredentialsButton").on("click", function(event) {
	if(!activeIdentifier) {
		return;
	}

	if(!$("#loginUsernameBox").val() || !$("#loginPasswordBox").val()) {
		return;
	}

	if($(this).hasClass("disabled")) {
		return;
	}
	$(this).addClass("disabled");

	var out = {
		cmd: "login",
		username: $("#loginUsernameBox").val(),
		hash: sha512($("#loginPasswordBox").val())
	};

	ws.send(JSON.stringify(out));
});

var viewingPlayer;
$("body").on("click", ".playerRow", function(event) {
	let objID = $(this).attr("data-objid");
	console.log("wants " + objID);

	viewingPlayer = objID;

	let data = playerData[objID];

	$("#playerStatDialogName").text(data.name);
	$("#playerStatTableObjID").text(objID);
	$("#playerStatTableBLID").text(data.blid);
	$("#playerStatTableRank").text(getPlayerRank(data.rank));
	$("#playerStatTableIP").text(data.ip);
	$("#playerStatTableElapsed").text(formatDate(data.joined)).append($('<span class="dialogSmallText"></span>').text("(" + getTimeString(Math.floor((Date.now() - data.joined)/1000)) + " ago)"));
	$("#playerStatTablePing").text(data.ping.toLocaleString() + "ms").append($('<span class="dialogSmallText"></span>').text("(PL " + data.packetLoss.toLocaleString() + ")"));
	$("#playerStatTableScore").text(data.score.toLocaleString());
	$("#playerStatTableBricks").text(data.brickcount.toLocaleString());
	$("#playerStatTableAFK").text(parseInt(data.afk, 10) ? "Yes" : "No");

	showDialog("#playerDialog");
});