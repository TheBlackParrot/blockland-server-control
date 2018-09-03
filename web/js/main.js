var ws = new WebSocket("ws://127.0.0.1:28999");

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
						$("#brickCountValue").text(data.stats[key].toLocaleString());
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