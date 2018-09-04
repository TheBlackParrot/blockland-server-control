function RemoteControlTCPObject::onLine(%this, %line) {
	%line = trim(%line);

	%host = -1;
	for(%i = 0; %i < ClientGroup.getCount(); %i++) {
		%client = ClientGroup.getObject(%i);
		if(%client.bl_id == 999999 || %client.bl_id == getNumKeyID()) {
			%host = %client;
			break;
		}
	}

	if(isObject(%host)) {
		%host.chatMessage("<font:Courier New Bold:20><color:ffddff>" @ strReplace(%line, "\t", " "));
	}

	%cmd = getField(%line, 0);
	switch$(%cmd) {
		case "ERR":
			switch(stripMLControlChars(getField(%line, 1))) {
				case 0:
					echo("\c0Not enough arguments were provided for this remote control command.");
				case 1:
					echo("\c0Another server is already using this identifier, please use a unique identifier.");
				case 2:
					echo("\c0You must set an identifier.");
				case 3:
					echo("\c0Missing required argument.");
				case 4:
					echo("\c0User already exists for this server.");
			}

		case "HELLO":
			$Pref::RemoteControl::Identifier = stripMLControlChars(getField(%line, 1));

			RemoteControlTCPLines.send("stat\tbricks|" @ getBrickCount()
				TAB "players|" @ ClientGroup.getCount()
				TAB "maxplayers|" @ $Pref::Server::MaxPlayers
				TAB "dedicated|" @ $Server::Dedicated
				);
			RemoteControlTCPLines.send("uptime\t" @ mFloatLength($Sim::Time, 3));
			timerRC_BrickCountStat();

		case "NEWACCOUNT":
			if(isObject(%host)) {
				%host.chatMessage("\c6The password for account \c4" @ stripMLControlChars(getField(%line, 1)) SPC "\c6will be<font:Courier New Bold:28>\c2" SPC stripMLControlChars(getField(%line, 2)));
			}

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

	RemoteControlTCPLines.send("stat\tbricks|" @ getBrickCount());
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