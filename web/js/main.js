var ws = new WebSocket("ws://127.0.0.1:28999");

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

	elem.addClass("notifFadeIn");
	$(".notifWrapper").append(elem);

	if(!sticky) {
		setTimeout(function() {
			elem.addClass("notifFadeOut");
			elem.bind("animationend webkitAnimationEnd oAnimationEnd MSAnimationEnd", function() {
				$(this).remove();
			});
		}, 10000);
	}
}

ws.onerror = function(event) {
	if(event.type == "error") {
		sendNotification("error", "Error with connection to the remote control master at " + event.srcElement.url);
	}
}

ws.onopen = function(event) {
	sendNotification("success", "Connected to the remote control master at " + event.srcElement.url);

	var out = {
		cmd: "servers"
	};
	ws.send(JSON.stringify(out));
}

var curUptime = 0;

var uptimeLoop;
function startLoops() {
	let uptimeFunc = function() {
		curUptime++;

		let seconds = curUptime % 60;
		let minutes = Math.floor(curUptime / 60) % 60;
		let hours = Math.floor(curUptime / 60 / 60) % 24;
		let days = Math.floor(curUptime / 60 / 60 / 24);

		$("#uptimeValue").text([days.toString() + "d", hours.toString() + "h", minutes.toString() + "m", seconds.toString() + "s"].join(" "));		
	}
	uptimeFunc();
	
	uptimeLoop = setInterval(uptimeFunc, 1000);
}

function stopLoops() {
	clearInterval(uptimeLoop);
}

ws.onmessage = function(event) {
	let data = JSON.parse(event.data);

	console.log(data);

	switch(data.cmd) {
		case "chat":
			var elem = $('<div class="chatRow"></div>');
			var nameElem = $('<span class="chatName"></span>').text(data.who);
			if(data.remote) { nameElem.addClass("chatNameRemote"); }
			var msgElem = $('<span class="chatMsg"></span>').text(data.msg);

			elem.append(nameElem);
			elem.append(msgElem);
			
			$('#allChatRows').append(elem);
			break;

		case "needIdent":
			// temporary
			break;

		case "acceptIdent":
			var out = {
				cmd: "uptime"
			}
			ws.send(JSON.stringify(out));
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
			break;

		case "servers":
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

	$("#selectorMenuSelected .selectorRow").remove();
	$("#selectorMenuSelected").append($(this).clone());

	ws.send(JSON.stringify(out));

	$('#selectorMenuSelected').removeClass("selectorMenuActive");
	
	$("#selectorMenuIcon").removeClass("rotate90");

	$("#selectorMenu").removeClass("selectorMenuSlideDown");
	$("#selectorMenu").addClass("selectorMenuSlideUp");

	$(".wrapper").show();

	stopLoops();
	startLoops();
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