function RemoteControlTCPObject::onLine(%this, %line) {
	%line = trim(%line);

	messageAll('', "<font:Courier New Bold:20><color:ffddff>" @ %line);

	%cmd = getField(%line, 0);
	switch$(%cmd) {
		case "ERR":
			switch(stripMLControlChars(getField(%line, 1))) {
				case 0:
					echo("\c0Another server is already using this identifier, please use a unique identifier.");
			}

		case "HELLO":
			$Pref::RemoteControl::Identifier = stripMLControlChars(getField(%line, 1));

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

package RemoteControlPackage {
	function serverCmdMessageSent(%client, %msg) {
		RemoteControlTCPLines.send("chat" TAB %client.getPlayerName() TAB stripMLControlChars(%msg));
		return parent::serverCmdMessageSent(%client, %msg);
	}
};
activatePackage(RemoteControlPackage);