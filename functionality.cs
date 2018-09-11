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
	echo("\c7[RC <--]" SPC %line);

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
				case 5:
					echo("\c0Malformed argument.");
				case 6:
					echo("\c0Invalid server key.");
			}

		case "HELLO":
			$Pref::RemoteControl::Identifier = stripMLControlChars(getField(%line, 1));

			RemoteControlTCPLines.send("stat\tbricks|" @ getBrickCount()
				TAB "players|" @ ClientGroup.getCount()
				TAB "maxplayers|" @ $Pref::Server::MaxPlayers
				);
			RemoteControlTCPLines.send("uptime\t" @ mFloatLength($Sim::Time, 3));
			RemoteControlTCPLines.send("detail\ttitle|" @ strReplace($Server::Name, "|", "_")
				TAB "port|" @ $Server::Port
				TAB "dedicated|" @ $Server::Dedicated
				TAB "gamemode|" @ $GameModeDisplayName
				TAB "version|" @ $Version
				TAB "build|" @ (isFunction(getBuildNumber) ? getBuildNumber() : "N/A")
				TAB "hostBLID|" @ getNumKeyID()
				TAB "hostName|" @ $pref::Player::NetName
				);
			
			timerRC_BrickCountStat();
			timerRC_PlayerPings();

			for(%i = 0; %i < ClientGroup.getCount(); %i++) {
				%client = ClientGroup.getObject(%i);
				RemoteControlTCPLines.send("playerData\tadd" TAB %client._RC_getAllPlayerDataLine());
			}

			_RC_sendAllRemoteControlModVarData();

		case "NEWACCOUNT":
			if(isObject(%host)) {
				%host.chatMessage("\c6The password for account \c4" @ stripMLControlChars(getField(%line, 1)) SPC "\c6will be<font:Courier New Bold:28>\c2" SPC stripMLControlChars(getField(%line, 2)));
			}

		case "MSG":
			handleRC_Message(stripMLControlChars(getField(%line, 1)), stripMLControlChars(getField(%line, 2)));

		case "CONSOLE":
			%key = getField(%line, 1);
			%who = getField(%line, 2);
			%line = getFields(%line, 3);

			if(%key !$= $RemoteControl::ConnectKey) {
				echo("Invalid server key, not executing line.");
				return;
			}

			eval(%line);

		case "MODVAR":
			// ["MODVAR", serverKeys[ws.identifier], ws.loggedInAs, variable, value]
			%key = getField(%line, 1);
			%who = getField(%line, 2);
			%vars = getField(%line, 3);
			%value = getFields(%line, 4);

			if(%key !$= $RemoteControl::ConnectKey) {
				echo("Invalid server key, not setting variable.");
				return;
			}

			for(%i = 0; %i < getWordCount(%vars); %i++) {
				%var = getWord(%vars, %i);
				eval(%var @ " = \"" @ %value @ "\";");
			}
	}
}

function GameConnection::_RC_getAllPlayerDataLine(%this) {
	%rank = 0;
	if(%this.bl_id == getNumKeyID() || %this.bl_id == 999999) { %rank = 4; }
	else if(%this.isModerator) { %rank = 3; } // in case
	else if(%this.isSuperAdmin) { %rank = 2; }
	else if(%this.isAdmin) { %rank = 1; }

	%group = %this.brickGroup;
	if(isObject(%group)) {
		%brickCount = %group.getCount();
	} else {
		%brickCount = 0;
	}

	%line = trim(%this
		TAB "blid|" @ %this.bl_id
		TAB "name|" @ strReplace(%this.getPlayerName(), "|", "/")
		TAB "score|" @ %this.score
		TAB "rank|" @ %rank
		TAB "brickcount|" @ %brickCount
		TAB "ip|" @ %this.getRawIP()
		TAB "afk|0"
		);

	return %line;
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

function timerRC_PlayerPings() {
	cancel($RemoteControlPlayerPingsLoop);
	$RemoteControlPlayerPingsLoop = schedule(3000, 0, timerRC_PlayerPings);

	%line = "";
	for(%i = 0; %i < ClientGroup.getCount(); %i++) {
		if(%i % 10 == 9) {
			RemoteControlTCPLines.send("ping" TAB %line);
			%line = "";
		}

		%client = ClientGroup.getObject(%i);
		%line = trim(%line TAB %client SPC %client.getPing() SPC %client.getPacketLoss());
	}

	if(%line !$= "") {
		RemoteControlTCPLines.send("ping" TAB %line);
	}
}

function _RC_sendAllRemoteControlModVarData() {
	%count = $RemoteControl::ModVarCount;

	for(%i = 0; %i < %count; %i++) {
		%var = $RemoteControl::ModVar[%i];
		%type = $RemoteControl::ModVarType[%i];
		%view = $RemoteControl::ModVarViewPermissionLimit[%i];
		%edit = $RemoteControl::ModVarEditPermissionLimit[%i];

		RemoteControlTCPLines.send("var" TAB %var TAB %type TAB %view TAB %edit TAB eval("return expandEscape(" SPC getWord($RemoteControl::ModVar[%i], 0) @ ");"));
	}
}

package RemoteControlPackage {
	function serverCmdMessageSent(%client, %msg) {
		RemoteControlTCPLines.send("chat" TAB %client.getPlayerName() TAB stripMLControlChars(%msg));
		return parent::serverCmdMessageSent(%client, %msg);
	}

	function GameConnection::autoAdminCheck(%client) {
		%r = parent::autoAdminCheck(%client);

		RemoteControlTCPLines.send("stat\tplayers|" @ ClientGroup.getCount() TAB "maxplayers|" @ $Pref::Server::MaxPlayers);
		RemoteControlTCPLines.send("playerData\tadd" TAB %client._RC_getAllPlayerDataLine());

		return %r;
	}

	function GameConnection::onClientLeaveGame(%client) {
		%r = parent::onClientLeaveGame(%client);

		RemoteControlTCPLines.send("stat\tplayers|" @ ClientGroup.getCount()-1 TAB "maxplayers|" @ $Pref::Server::MaxPlayers);
		RemoteControlTCPLines.send("playerData\tdel" TAB %client);

		return %r;
	}

	function fxDTSBrick::onPlant(%this) {
		%r = parent::onPlant(%this);

		%count = %this.getGroup().getCount();
		RemoteControlTCPLines.send("playerData\tadd" TAB %this.client TAB "brickcount|" @ %count);

		return %r;
	}
};
activatePackage(RemoteControlPackage);