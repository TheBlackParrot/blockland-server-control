// a lot of this connection stuff on the Blockland side is going to look almost exactly like the Discord Bridge addon; it's had extensive use already, so why re-invent the wheel?

function initRemoteControlConnection() {
	if(!isObject(RemoteControlTCPObject)) {
		new TCPObject(RemoteControlTCPObject);
	} else {
		RemoteControlTCPObject.disconnect();
	}

	%obj = RemoteControlTCPObject;
	%obj.connect("127.0.0.1:28999");

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

	%this.checkToSendSched = %this.schedule(100, checkToSend);

	%data = %this.getRowText(0);
	%this.removeRow(0);

	RemoteControlTCPObject.send("server" TAB %data @ "\r\n");
}

function RemoteControlTCPObject::onConnected(%this) {
	cancel($RemoteControlConnectRetryLoop);

	echo("Connected to the remote control server.");

	if($Pref::RemoteControl::Identifier $= "") {
		messageAll('', "\c0ERROR\c6: Please run the /rcSetup command to set up remote control abilities for this server.");
	} else {
		RemoteControlTCPLines.send("connect" TAB $Pref::RemoteControl::Identifier);
	}
}

function RemoteControlTCPObject::onConnectFailed(%this) {
	echo("Trying to connect to the remote control server again (failed to connect)...");
	$RemoteControlConnectRetryLoop = %this.schedule(10000, connect, "127.0.0.1:28999");
}

function RemoteControlTCPObject::onDisconnect(%this) {
	echo("Trying to connect to the remote control server again (disconnected)...");
	$RemoteControlConnectRetryLoop = %this.schedule(10000, connect, "127.0.0.1:28999");
}

exec("./setup.cs");
exec("./functionality.cs");