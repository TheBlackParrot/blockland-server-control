// a lot of this connection stuff on the Blockland side is going to look almost exactly like the Discord Bridge addon; it's had extensive use already, so why re-invent the wheel?

function initRemoteControlConnection() {
	if(!isObject(RemoteControlTCPObject)) {
		new TCPObject(RemoteControlTCPObject);
	} else {
		RemoteControlTCPObject.disconnect();
	}

	%obj = RemoteControlTCPObject;
	%obj.connect("127.0.0.1:28900");

	if(!isObject(RemoteControlTCPLines)) {
		// blockland likes to merge multiple send commands being called at once into one line
		// "does this look stupid?" yes, but it's easy
		new GuiTextListCtrl(RemoteControlTCPLines);
	} else {
		RemoteControlTCPLines.clear();
	}
}
initRemoteControlConnection();

function RemoteControlTCPLines::send(%this, %data) {
	%this.addRow(getSimTime(), %data);
	if(!isEventPending(%this.checkToSendSched)) {
		%this.checkToSend();
	}
}

function RemoteControlTCPLines::checkToSend(%this) {
	if(%this.rowCount() <= 0) {
		return;
	}

	%this.checkToSendSched = %this.schedule(33, checkToSend);

	%data = %this.getRowText(0);
	%this.removeRow(0);

	RemoteControlTCPObject.send(%data @ "\r\n");
	echo("\c7[RC -->]" SPC %data);
}

function RemoteControlTCPObject::onConnected(%this) {
	cancel($RemoteControlConnectRetryLoop);

	echo("Connected to the remote control server.");

	if($RemoteControl::Identifier $= "") {
		messageAll('', "\c0ERROR\c6: Please run the /rcSetup command to set up remote control abilities for this server.");
	} else {
		if($RemoteControl::ConnectKey $= "") {
			$RemoteControl::ConnectKey = randc();
			export("$RemoteControl*", "config/server/RemoteControl/prefs.cs");
		}
		RemoteControlTCPLines.send("connect" TAB $RemoteControl::Identifier TAB $RemoteControl::ConnectKey);
	}
}

function RemoteControlTCPObject::onConnectFailed(%this) {
	cancel($RemoteControlConnectRetryLoop);
	echo("Trying to connect to the remote control server again (failed to connect)...");
	$RemoteControlConnectRetryLoop = %this.schedule(5000, connect, "127.0.0.1:28900");

	cancel($RemoteControlBrickCountStatLoop);
}

function RemoteControlTCPObject::onDisconnect(%this) {
	cancel($RemoteControlConnectRetryLoop);
	echo("Trying to connect to the remote control server again (disconnected)...");
	$RemoteControlConnectRetryLoop = %this.schedule(5000, connect, "127.0.0.1:28900");

	cancel($RemoteControlBrickCountStatLoop);
}

if(isFile("config/server/RemoteControl/prefs.cs")) {
	if(!$_RemoteControl::Initiated) {
		if($RemoteControl::Identifier !$= "") {
			// for PM2 managed servers, regular servers will not have this set
			$_OldRCIdent = $RemoteControl::Identifier;
		}

		exec("config/server/RemoteControl/prefs.cs");
		$_RemoteControl::Initiated = true;

		if($_OldRCIdent !$= "") {
			$RemoteControl::Identifier = $_OldRCIdent;
		}
	}
}

exec("./setup.cs");
exec("./functionality.cs");
exec("./afk.cs");

if(!isFunction(isaac)) {
	exec("./Support_ISAAC.cs");
}