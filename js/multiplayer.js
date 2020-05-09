var multiplayer = {
    websocket: undefined,
    start: function() {
        if (!window.WebSocket) {
            game.showMessageBox("Your browser does not support WebSocket. Multiplayer will not work.");

            return;
        }

        const websocketUrl = "ws://" + (window.location.hostname || "localhost") + ":8080";

        this.websocket = new WebSocket(websocketUrl);

        this.websocket.addEventListener("open", multiplayer.handleWebSocketOpen);
        this.websocket.addEventListener("message", multiplayer.handleWebSocketMessage);

        this.websocket.addEventListener("close", multiplayer.handleWebSocketConnectionError);
        this.websocket.addEventListener("error", multiplayer.handleWebSocketConnectionError);
    },
    
    handleWebSocketOpen: function() {
        game.hideScreens();
        game.showScreen("multiplayerlobbyscreen");
    },

    handleWebSocketMessage: function(message) {
        var messageObject = JSON.parse(message.data);

        switch (messageObject.type) {
            case "room-list":
                multiplayer.updateRoomStatus(messageObject.roomList);
                break;

            case "joined-room":
                multiplayer.roomId = messageObject.roomId;
                multiplayer.color = messageObject.color;
                break;

            case "initialize-level":
                multiplayer.currentLevel = messageObject.currentLevel;
                multiplayer.initLevel(messageObject.spawnLocations);
                break;

            case "play-game":
                multiplayer.play();
                break;

            case "latency-ping":
                multiplayer.sendWebSocketMessage({ type: "latency-pong" });
                break;

            case "game-tick":
                multiplayer.lastReceivedTick = messageObject.tick;
                multiplayer.commands[messageObject.tick] = messageObject.commands;
                break;
        }
    },

    statusMessages: {
        "starting": "Game Starting",
        "running": "Game in Progress",
        "waiting": "Waiting for second player",
        "empty": "Open"
    },

    selectRow: function(index) {
        var list = document.getElementById("multiplayergameslist");

        for (let i = list.rows.length - 1; i >= 0; i--) {
            let row = list.rows[i];

            row.classList.remove("selected");
        }

        list.selectedIndex = index;
        let row = list.rows[index];

        list.value = row.cells[0].value;
        row.classList.add("selected");
    },

    updateRoomStatus: function(roomList) {
        var list = document.getElementById("multiplayergameslist");

        for (let i = list.rows.length - 1; i >= 0; i--) {
            list.deleteRow(i);
        }

        roomList.forEach(function(status, index) {
            let statusMessage = multiplayer.statusMessages[status];
            let roomId = index + 1;
            let label = "Game " + roomId + ". " + statusMessage;

            let row = document.createElement("tr");
            let cell = document.createElement("td");

            cell.innerHTML = label;
            cell.value = roomId;

            row.appendChild(cell);

            row.addEventListener("click", function() {
                if (!list.disabled && !row.disabled) {
                    multiplayer.selectRow(index);
                }
            });

            row.className = status;

            list.appendChild(row);

            if (status === "running" || status === "starting") {
                row.disabled = true;
            }

            if (multiplayer.roomId === roomId) {
                this.selectRow(index);
            }

        }, this);
    },

    join: function() {
        var selectedRoom = document.getElementById("multiplayergameslist").value;

        if (selectedRoom) {
            multiplayer.sendWebSocketMessage({ type: "join-room", roomId: selectedRoom });

            document.getElementById("multiplayergameslist").disabled = true;
            document.getElementById("multiplayerjoin").disabled = true;
        } else {
            game.showMessageBox("Please select a game room to join");
        }
    },

    cancel: function() {
        if (multiplayer.roomId) {
            multiplayer.sendWebSocketMessage({ type: "leave-room", roomId: multiplayer.roomId });
            document.getElementById("multiplayergameslist").disabled = false;
            document.getElementById("multiplayerjoin").disabled = false;

            delete multiplayer.roomId;
            delete multiplayer.color;
        } else {
            multiplayer.closeAndExit();
        }
    },

    closeAndExit: function() {
        multiplayer.websocket.removeEventListener("open", multiplayer.handleWebSocketOpen);
        multiplayer.websocket.removeEventListener("message", multiplayer.handleWebSocketMessage);

        multiplayer.websocket.close();

        document.getElementById("multiplayergameslist").disabled = false;
        document.getElementById("multiplayerjoin").disabled = false;

        game.hideScreens();
        game.showScreen("gamestartscreen");
    },

    sendWebSocketMessage: function(messageObject) {
        var messageString = JSON.stringify(messageObject);

        this.websocket.send(messageString);
    },

    currentLevel: 0,
    initLevel: function(spawnLocations) {
        game.type = "multiplayer";
        game.team = multiplayer.color;

        var level = levels.multiplayer[multiplayer.currentLevel];

        game.loadLevelData(level);

        fog.initLevel();

        multiplayer.commands = [[]];
        multiplayer.lastReceivedTick = 0;
        multiplayer.currentTick = 0;

        for (let team in spawnLocations) {
            let spawnIndex = spawnLocations[team];

            for (let i = 0; i < level.teamStartingItems.length; i++) {
                let itemDetails = Object.assign({}, level.teamStartingItems[i]);

                itemDetails.x += level.spawnLocations[spawnIndex].x;
                itemDetails.y += level.spawnLocations[spawnIndex].y;
                itemDetails.team = team;

                game.add(itemDetails);
            }
        }

        let spawnIndex = spawnLocations[game.team];

        game.offsetX = level.spawnLocations[spawnIndex].startX * game.gridSize;
        game.offsetY = level.spawnLocations[spawnIndex].startY * game.gridSize;

        game.createTerrainGrid();

        loader.onload = function() {
            multiplayer.sendWebSocketMessage({ type: "initialized-level" });
        };
    },

    play: function() {

        game.animationLoop();

        multiplayer.animationInterval = setInterval(multiplayer.tickLoop, game.animationTimeout);

        game.start();
    },

    sendCommand: function(uids, details) {

        multiplayer.sentCommandForTick = true;
        multiplayer.sendWebSocketMessage({ type: "command", uids: uids, details: details, currentTick: multiplayer.currentTick });
    },

    tickLoop: function() {
        if (multiplayer.currentTick <= multiplayer.lastReceivedTick) {
            var commands = multiplayer.commands[multiplayer.currentTick];

            if (commands) {
                for ( var i = 0; i < commands.length; i++) {
                    console.log(commands[i])
                    game.processCommand(commands[i].uids, commands[i].details);
                }
            }

            if (!multiplayer.sentCommandForTick) {
                multiplayer.sendCommand();
            }

            multiplayer.currentTick++;
            multiplayer.sentCommandForTick = false;
        }
    },
};