function serverCmdRCSetup(%client) {
	if(%client.bl_id != getNumKeyID()) { return; }

	%client.chatMessage("\c2This command will guide you through setting up your server for the Remote Control instance hosted outside Blockland on the same server.");
	
	if($Pref::RemoteControl::Identifier $= "") {
		%client.chatMessage("\c6Your server needs a persistent identifier as anything about your server can change. Run \c4/rcIdent \c3identifier \c6to define one, or use \c3auto \c6to generate one automatically.");
	}

	if($Pref::RemoteControl::Account[0] $= "") {
		%client.chatMessage("\c6You need to set up a user account to access the web GUI. Run \c4/rcAddAccount \c3username \c6to create an account.");
	}
}

function serverCmdRCIdent(%client, %ident) {
	if(%client.bl_id != getNumKeyID()) { return; }

	if($Pref::RemoteControl::Identifier !$= "") {
		%client.chatMessage("\c0!!!! THIS WILL (seemingly) ERASE ANY DATA AND ACCOUNTS YOU MAY HAVE SAVED FOR THIS SERVER !!!!");
		%client.chatMessage("\c6If you are sure you want to change identifiers, please clear the \c4$Pref::RemoteControl::Identifier \c6variable and run this command again.");
		for(%i=0;%i<3;%i++) { %client.schedule(250*%i, play2D, errorSound); }
		return;
	}

	if(%ident $= "") {
		return;
	}

	if(%ident $= "auto") {
		%ident = $Pref::Server::Port @ "-" @ getSubStr(sha1(getRandom(-999999, 999999)), getRandom(0, 34), 6);
	}
	%ident = getSubStr(%ident, 0, 16);

	%client.chatMessage("\c6Server identifier was changed to \c4" @ %ident);

	export("$Pref::RemoteControl*", "config/server/RemoteControl/prefs.cs");
}

function serverCmdRCAddAccount(%client, %username, %permissionLevel) {
	if(%client.bl_id != getNumKeyID()) { return; }

	// 0: limited view only, same as a non-logged in account
	// 1: can chat and view non-sensitive server variables
	// 2: can kick/mute people and view all server variables
	// 3: can ban people and modify all server variables
	// 4: full access

	if(%username $= "") {
		return;
	}

	if(%permissionLevel $= "") {
		%permissionLevel = 2;
	} else if(%permissionLevel > 4) {
		%permissionLevel = 4;
	} else if(%permissionLevel < 0) {
		%permissionLevel = 0;
	}

	%client.chatMessage("\c6Attempting to add user \c4" @ %username @ "\c6 at permission level" SPC %permissionLevel @ ", please wait momentarily for a response...");
	RemoteControlTCPLines.send("addUser" TAB %username);
}

// auto setup script ex at config/server/RemoteControl/auto-setup.cs