var ws = new WebSocket("ws://127.0.0.1:28999");

function sendNotification(type, msg, sticky = false) {
	let elem = $('<div class="notification"></div>').addClass(type + "Notification");

	switch(type) {
		case "error":
			elem.html('<i class="fas fa-fw fa-times-circle"></i> ' + msg);
			break;
	}

	elem.addClass("notifFadeIn");
	$(".notifWrapper").append(elem);
}

ws.onerror = function(event) {
	if(event.type == "error") {
		sendNotification("error", "Error with connection to the remote control master at " + event.srcElement.url);
	}
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

		case "stat":
			Object.keys(data.stats).map(function(key) {
				switch(key) {
					case "uptime":
						curUptime = data.stats[key];
						break;

					case "bricks":
						$("#brickCountValue").text(parseInt(data.stats[key], 10).toLocaleString());
						break;

					case "players":
						$("#playerCount").text(data.stats[key]);
						break;

					case "maxplayers":
						$("#playerCountMax").text(data.stats[key]);
						break;				
				}
			});
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