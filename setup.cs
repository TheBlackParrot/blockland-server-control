function serverCmdRCSetup(%client) {
	if(%client.bl_id != getNumKeyID() && %client.bl_id != 999999) { return; }

	%client.chatMessage("\c2This command will guide you through setting up your server for the Remote Control instance hosted outside Blockland on the same server.");
	
	if($RemoteControl::Identifier $= "") {
		%client.chatMessage("\c6Your server needs a persistent identifier as anything about your server can change. Run \c4/rcIdent \c3identifier \c6to define one, or use \c3auto \c6to generate one automatically.");
		serverCmdRCSetDefaultEditVars();
	}

	%client.chatMessage("\c6You need to set up a user account to access the web GUI. Run \c4/rcAddAccount \c3username \c6to create an account. \c7If you have done this already, ignore this message.");
}

function serverCmdRCIdent(%client, %ident) {
	if(%client.bl_id != getNumKeyID() && %client.bl_id != 999999) { return; }

	if($RemoteControl::Identifier !$= "") {
		%client.chatMessage("\c0!!!! THIS WILL (seemingly) ERASE ANY DATA AND ACCOUNTS YOU MAY HAVE SAVED FOR THIS SERVER !!!!");
		%client.chatMessage("\c6If you are sure you want to change identifiers, please clear the \c4$RemoteControl::Identifier \c6variable and run this command again.");
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
	RemoteControlTCPLines.send("connect" TAB %ident);
	$RemoteControl::Identifier = %ident;

	export("$RemoteControl*", "config/server/RemoteControl/prefs.cs");
}

function serverCmdRCAddAccount(%client, %username, %permissionLevel) {
	if(%client.bl_id != getNumKeyID() && %client.bl_id != 999999) { return; }

	// 0: limited view only, same as a non-logged in account
	// 1: can chat and view non-sensitive server variables
	// 2: can kick/mute people and view all server variables
	// 3: can ban people and modify all server variables
	// 4: full access

	if(%username $= "") {
		return;
	}

	if(%permissionLevel $= "") {
		%permissionLevel = 0;
	} else if(%permissionLevel > 4) {
		%permissionLevel = 4;
	} else if(%permissionLevel < 0) {
		%permissionLevel = 0;
	}

	%client.chatMessage("\c6Attempting to add user \c4" @ %username @ "\c6 at permission level" SPC %permissionLevel @ ", please wait momentarily for a response...");
	RemoteControlTCPLines.send("createAccount" TAB %username);
}

function serverCmdRCSetDefaultEditVars(%client) {
	if(%client.bl_id != getNumKeyID() && %client.bl_id != 999999) { return; }

	$RemoteControl::ModVarCount = 16;

	$RemoteControl::ModVar0 = "$Server::Name $Pref::Server::Name";
	$RemoteControl::ModVar1 = "$Pref::Server::Port";
	$RemoteControl::ModVar2 = "$Server::WelcomeMessage $Pref::Server::WelcomeMessage";
	$RemoteControl::ModVar3 = "$Pref::Server::AdminPassword";
	$RemoteControl::ModVar4 = "$Pref::Server::SuperAdminPassword";
	$RemoteControl::ModVar5 = "$Pref::Server::Password";
	$RemoteControl::ModVar6 = "$Pref::Server::AutoAdminList";
	$RemoteControl::ModVar7 = "$Pref::Server::AutoSuperAdminList";
	$RemoteControl::ModVar8 = "$Pref::Server::ETardFilter";
	$RemoteControl::ModVar9 = "$Pref::Server::ETardList";
	$RemoteControl::ModVar10 = "$Pref::Server::FallingDamage";
	$RemoteControl::ModVar11 = "$Pref::Server::MaxBricksPerSecond";
	$RemoteControl::ModVar12 = "$Pref::Server::MaxPhysVehicles_Total";
	$RemoteControl::ModVar13 = "$Pref::Server::MaxPlayers";
	$RemoteControl::ModVar14 = "$Pref::Server::MaxPlayerVehicles_Total";
	$RemoteControl::ModVar15 = "$Pref::Server::TooFarDistance";

	$RemoteControl::ModVarType0 = "text";
	$RemoteControl::ModVarType1 = "text";
	$RemoteControl::ModVarType2 = "text";
	$RemoteControl::ModVarType3 = "password";
	$RemoteControl::ModVarType4 = "password";
	$RemoteControl::ModVarType5 = "password";
	$RemoteControl::ModVarType6 = "text";
	$RemoteControl::ModVarType7 = "text";
	$RemoteControl::ModVarType8 = "bool";
	$RemoteControl::ModVarType9 = "text";
	$RemoteControl::ModVarType10 = "bool";
	$RemoteControl::ModVarType11 = "int";
	$RemoteControl::ModVarType12 = "int";
	$RemoteControl::ModVarType13 = "int";
	$RemoteControl::ModVarType14 = "int";
	$RemoteControl::ModVarType15 = "int";

	$RemoteControl::ModVarViewPermissionLimit0 = 0;
	$RemoteControl::ModVarViewPermissionLimit1 = 0;
	$RemoteControl::ModVarViewPermissionLimit2 = 0;
	$RemoteControl::ModVarViewPermissionLimit3 = 2;
	$RemoteControl::ModVarViewPermissionLimit4 = 4;
	$RemoteControl::ModVarViewPermissionLimit5 = 1;
	$RemoteControl::ModVarViewPermissionLimit6 = 0;
	$RemoteControl::ModVarViewPermissionLimit7 = 0;
	$RemoteControl::ModVarViewPermissionLimit8 = 0;
	$RemoteControl::ModVarViewPermissionLimit9 = 0;
	$RemoteControl::ModVarViewPermissionLimit10 = 0;
	$RemoteControl::ModVarViewPermissionLimit11 = 0;
	$RemoteControl::ModVarViewPermissionLimit12 = 0;
	$RemoteControl::ModVarViewPermissionLimit13 = 0;
	$RemoteControl::ModVarViewPermissionLimit14 = 0;
	$RemoteControl::ModVarViewPermissionLimit15 = 0;

	$RemoteControl::ModVarEditPermissionLimit0 = 2;
	$RemoteControl::ModVarEditPermissionLimit1 = 4;
	$RemoteControl::ModVarEditPermissionLimit2 = 2;
	$RemoteControl::ModVarEditPermissionLimit3 = 4;
	$RemoteControl::ModVarEditPermissionLimit4 = 4;
	$RemoteControl::ModVarEditPermissionLimit5 = 1;
	$RemoteControl::ModVarEditPermissionLimit6 = 2;
	$RemoteControl::ModVarEditPermissionLimit7 = 4;
	$RemoteControl::ModVarEditPermissionLimit8 = 1;
	$RemoteControl::ModVarEditPermissionLimit9 = 1;
	$RemoteControl::ModVarEditPermissionLimit10 = 1;
	$RemoteControl::ModVarEditPermissionLimit11 = 1;
	$RemoteControl::ModVarEditPermissionLimit12 = 1;
	$RemoteControl::ModVarEditPermissionLimit13 = 1;
	$RemoteControl::ModVarEditPermissionLimit14 = 1;
	$RemoteControl::ModVarEditPermissionLimit15 = 1;

	_RC_sendAllRemoteControlModVarData();

	export("$RemoteControl*", "config/server/RemoteControl/prefs.cs");
}

// auto setup script ex at config/server/RemoteControl/auto-setup.cs

// 	%rank = 0;
//	if(%this.bl_id == getNumKeyID() || %this.bl_id == 999999) { %rank = 4; }
//	else if(%this.isModerator) { %rank = 3; } // in case
//	else if(%this.isSuperAdmin) { %rank = 2; }
//	else if(%this.isAdmin) { %rank = 1; }