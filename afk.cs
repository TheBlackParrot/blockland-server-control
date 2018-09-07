function GameConnection::timerRC_AFKCheck(%this) {
	cancel(%this.RCAFKSchedule);
	%this.RCAFKSchedule = %this.schedule(20000, timerRC_AFKCheck);

	%oldAFK = %this.RCAFK;

	%camera = %this.camera;
	%player = %this.player;

	%this.RCAFK = false;

	if(!isObject(%player)) {
		if(isObject(%camera)) {
			if(%camera._RC_oldTransform $= %camera.getTransform()) {
				%this.RCAFK = true;
			}
			%camera._RC_oldTransform = %camera.getTransform();
		}
	} else {
		if(%player._RC_oldTransform $= %player.getTransform()) {
			%this.RCAFK = true;
		}
		%player._RC_oldTransform = %player.getTransform();
	}

	if(%oldAFK != %this.RCAFK) {
		RemoteControlTCPLines.send("playerData\tadd" TAB %this TAB "afk|" @ %this.RCAFK);
	}

	return %this.RCAFK;
}

function GameConnection::_RC_restartAFKCheck(%this) {
	cancel(%this.RCAFKSchedule);
	%this.timerRC_AFKCheck();
}

package RCAFKPackage {
	function GameConnection::spawnPlayer(%this) {
		%r = parent::spawnPlayer(%this);
		%this._RC_restartAFKCheck();
		return %r;
	}

	function serverCmdMessageSent(%client, %msg) {
		%r = parent::serverCmdMessageSent(%client, %msg);
		%client._RC_restartAFKCheck();
		return %r;
	}

	function serverCmdStartTalking(%client) {
		%r = parent::serverCmdStartTalking(%client);
		%client._RC_restartAFKCheck();
		return %r;
	}

	function serverCmdStopTalking(%client) {
		%r = parent::serverCmdStopTalking(%client);
		%client._RC_restartAFKCheck();
		return %r;
	}
};
activatePackage(RCAFKPackage);