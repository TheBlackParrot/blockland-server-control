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

ws.onconnected = function(event) {
	sendNotification("success", "Connected to the remote control master at " + event.srcElement.url);
}

var curUptime = 0;

var uptimeLoop = setInterval(function() {
	curUptime++;

	let seconds = curUptime % 60;
	let minutes = Math.floor(curUptime / 60) % 60;
	let hours = Math.floor(curUptime / 60 / 60) % 24;
	let days = Math.floor(curUptime / 60 / 60 / 24);

	$("#uptimeValue").text([days.toString() + "d", hours.toString() + "h", minutes.toString() + "m", seconds.toString() + "s"].join(" "));
}, 1000);

ws.onmessage = function(event) {
	let data = JSON.parse(event.data);

	console.log(data);

	switch(data.cmd) {
		case "chat":
			var elem = $('<div class="chatRow"></div>');
			var nameElem = $('<span class="chatName"></span>').text(data.who);
			var msgElem = $('<span class="chatMsg"></span>').text(data.msg);

			elem.append(nameElem);
			elem.append(msgElem);
			
			$('#allChatRows').append(elem);
			break;

		case "needIdent":
			// temporary
			var out = {
				cmd: "setIdent",
				ident: "28000-645ce1"
			};

			ws.send(JSON.stringify(out));
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
	}
}

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