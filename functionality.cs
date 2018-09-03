function RemoteControlTCPObject::onLine(%this, %line) {
	%line = trim(%line);

	messageAll('', "<font:Courier New Bold:20><color:ffddff>" @ %line);

	%cmd = getField(%line, 0);
	switch$(%cmd) {
		case "ERR":
			switch(stripMLControlChars(getField(%line, 1))) {
				case 0:
					echo("\c0Not enough arguments were provided for this remote control command.");
				case 1:
					echo("\c0Another server is already using this identifier, please use a unique identifier.");
			}

		case "HELLO":
			$Pref::RemoteControl::Identifier = stripMLControlChars(getField(%line, 1));

			RemoteControlTCPLines.send("stat\tuptime|" @ mFloatLength($Sim::Time, 0) TAB "bricks|" @ getBrickCount() TAB "players|" @ ClientGroup.getCount() TAB "maxplayers|" @ $Pref::Server::MaxPlayers);
			timerRC_BrickCountStat();

		case "MSG":
			handleRC_Message(stripMLControlChars(getField(%line, 1)), stripMLControlChars(getField(%line, 2)));
	}
}

function handleRC_Message(%who, %msg) {
	// thanks Greek
	for(%i = getWordCount(%msg) - 1; %i >= 0; %i--) {
		%word = getWord(%msg, %i);
		%pos = strPos(%word, "://") + 3;
		%pro = getSubStr(%word, 0, %pos);
		%url = getSubStr(%word, %pos, strLen(%word));

		if((%pro $= "http://" || %pro $= "https://" || %pro $= "ftp://") && strPos(%url, ":") == -1) {
			%word = "<sPush><a:" @ %url @ ">" @ %url @ "</a><sPop>";
			%msg = setWord(%msg, %i, %word);
		}
	}

	messageAll('', "\c2(RC)" SPC %who @ "\c6:" SPC %msg);
}

function timerRC_BrickCountStat() {
	cancel($RemoteControlBrickCountStatLoop);
	$RemoteControlBrickCountStatLoop = schedule(10000, 0, timerRC_BrickCountStat);

	RemoteControlTCPLines.send("stat\tbricks|" @ getBrickCount() TAB "uptime|" @ mFloatLength($Sim::Time, 0));
}

package RemoteControlPackage {
	function serverCmdMessageSent(%client, %msg) {
		RemoteControlTCPLines.send("chat" TAB %client.getPlayerName() TAB stripMLControlChars(%msg));
		return parent::serverCmdMessageSent(%client, %msg);
	}

	function GameConnection::autoAdminCheck(%client) {
		%r = parent::autoAdminCheck(%client);

		RemoteControlTCPLines.send("stat\tplayers|" @ ClientGroup.getCount() TAB "maxplayers|" @ $Pref::Server::MaxPlayers);

		return %r;
	}

	function GameConnection::onClientLeaveGame(%client) {
		%r = parent::onClientLeaveGame(%client);

		RemoteControlTCPLines.send("stat\tplayers|" @ ClientGroup.getCount() TAB "maxplayers|" @ $Pref::Server::MaxPlayers);

		return %r;
	}
};
activatePackage(RemoteControlPackage);