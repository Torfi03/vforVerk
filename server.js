var http = require("http");

var server = http.createServer(function(request, response) {
    console.log("Received HTTP request for URL", request.url);

    response.writeHead(200, { "Content-Type": "text/plain" });
    response.end("This is a simple node.js HTTP server.");
});

server.listen(8080, function() {
    console.log("Server has started listening on port 8080");
});

var WebSocketServer = require("websocket").server;
var wsServer = new WebSocketServer({
    httpServer: server,
    autoAcceptConnections: false
});

var gameRooms = [];

for (var i = 0; i < 10; i++) {
    gameRooms.push({ status: "empty", players: [], roomId: i + 1 });
}

var players = [];

wsServer.on("request", function(request) {

    var connection = request.accept();

    console.log("Connection from " + request.remoteAddress + " accepted.");

    var player = {
        connection: connection,
        latencyTrips: []
    };

    players.push(player);

    sendRoomList(connection);

    measureLatencyStart(player);

    connection.on("message", function(message) {
        if (message.type === "utf8") {
            var clientMessage = JSON.parse(message.utf8Data);

            switch (clientMessage.type) {
                case "join-room":
                    joinRoom(player, clientMessage.roomId);

                    sendRoomListToEveryone();

                    if (player.room.players.length === 2) {
                        initializeGame(player.room);
                    }

                    break;

                case "leave-room":
                    leaveRoom(player, clientMessage.roomId);
                    sendRoomListToEveryone();
                    break;

                case "initialized-level":
                    player.room.playersReady++;

                    if (player.room.playersReady === 2) {
                        startGame(player.room)
                    }

                    break;
                
                case "latency-pong":
                    measureLatencyEnd(player);

                    if (player.latencyTrips.length < 3) {
                        measureLatencyStart(player);
                    }
                    break;

                case "command":
                    if (player.room && player.room.status === "running") {
                        if (clientMessage.uids) {
                            player.room.commands.push({ uids: clientMessage.uids, details: clientMessage.details });
                        }

                        player.room.lastTickConfirmed[player.color] = clientMessage.currentTick + player.tickLag;
                    }
                    break;
            }
        }
    });

    connection.on("close", function() {
        console.log("Connection from " + request.remoteAddress + " disconnected.");

        var index = players.indexOf(player);

        if (index > -1) {
            players.splice(index, 1);
        }

        var room = player.room;

        if (room) {
            leaveRoom(player, room.roomId);

            sendRoomListToEveryone();
        }
    });

    function getRoomListMessageString() {
        var roomList = [];

        for (var i = 0; i < gameRooms.length; i++) {
            roomList.push(gameRooms[i].status);
        }

        var message = { type: "room-list", roomList: roomList };
        var messageString = JSON.stringify(message);

        return messageString;
    }

    function sendRoomList(connection) {
        var messageString = getRoomListMessageString();

        connection.send(messageString);
    }

    function sendRoomListToEveryone() {
        var messageString = getRoomListMessageString();

        players.forEach(function(player) {
            player.connection.send(messageString);
        });
    }

    function joinRoom(player, roomId) {
        var room = gameRooms[roomId - 1];

        console.log("Adding player to room", roomId);
        room.players.push(player);
        player.room = room;
    
        if (room.players.length === 1) {
            room.status = "waiting";
            player.color = "blue";
        } else if (room.players.length === 2) {
            room.status = "starting";
            player.color = "green";
        }

        var confirmationMessage = { type: "joined-room", roomId: roomId, color: player.color };
        var confirmationMessageString = JSON.stringify(confirmationMessage);

        player.connection.send(confirmationMessageString);

        return room;
    }

    function leaveRoom(player, roomId) {
        var room = gameRooms[roomId - 1];

        console.log("Removing player from room", roomId);

        var index = room.players.indexOf(player);

        if (index > -1) {
            room.players.splice(index, 1);
        }

        delete player.room;

        if (room.players.length === 0) {
            room.status = "empty";
        } else if (room.players.length === 1) {
            room.status = "waiting";
        }
    }

    function initializeGame(room) {
        console.log("Both players Joined. Initializing game for Room " + room.roomId);

        room.playersReady = 0;

        var currentLevel = 0;

        var spawns = [0, 1, 2, 3];
        var spawnLocations = { "blue": spawns.splice(Math.floor(Math.random() * spawns.length),
        1), "green": spawns.splice(Math.floor(Math.random() * spawns.length), 1) };

        sendRoomWebSocketMessage(room, { type: "initialize-level", spawnLocations:
        spawnLocations, currentLevel: currentLevel });
    }

    function startGame(room) {
        console.log("Both players are ready. Starting game in room", room.roomId);

        room.status = "running";
        sendRoomListToEveryone();
        sendRoomWebSocketMessage(room, { type: "play-game" });

        room.commands = [];
        room.lastTickConfirmed = { "blue": 0, "green": 0 };
        room.currentTick = 0;

        var roomTickLag = Math.max(room.players[0].tickLag, room.players[1].tickLag);

        room.interval = setInterval(function() {
            if ( room.lastTickConfirmed["blue"] >= room.currentTick && room.lastTickConfirmed["green"] >= room.currentTick) {
                sendRoomWebSocketMessage(room, { type: "game-tick", tick: room.currentTick + roomTickLag, commands: room.commands });
                room.currentTick++;
                room.commands = [];
            } else {
                if (room.lastTickConfirmed["blue"] < room.currentTick) {
                    console.log("Room", room.roomId, "Blue is lagging on Tick:", room.currentTick, "by", room.currentTick - room.lastTickConfirmed["blue"]);
                }

                if (room.lastTickConfirmed["green"] < room.currentTick) {
                    console.log("Room", room.roomId, "Green is lagging on Tick:", room.currentTick, "by", room.currentTick - room.lastTickConfirmed["green"]);
                }
            }
        }, gameTimeout);
    }

    function sendRoomWebSocketMessage(room, messageObject) {
        var messageString = JSON.stringify(messageObject);
        room.players.forEach(function(player) {
            player.connection.send(messageString);
        });
    }

    function measureLatencyStart(player) {
        var measurement = { start: Date.now() };

        player.latencyTrips.push(measurement);

        var clientMessage = { type: "latency-ping" };

        player.connection.send(JSON.stringify(clientMessage));
    }

    var gameTimeout = 100;

    function measureLatencyEnd(player) {
        var currentMeasurement = player.latencyTrips[player.latencyTrips.length - 1];

        currentMeasurement.end = Date.now();
        currentMeasurement.roundTrip = currentMeasurement.end - currentMeasurement.start;

        var totalTime = 0;

        player.latencyTrips.forEach(function (measurement) {
            totalTime += measurement.roundTrip;
        });

        player.averageRoundTrip = totalTime / player.latencyTrips.length;

        player.tickLag = 1;

        player.tickLag += Math.round(player.averageRoundTrip / gameTimeout);

        console.log("Measuring Latency for player. Attempt", player.latencyTrips.length, "-Average Round Trip:", player.averageRoundTrip + "ms", "Tick Lag:", player.tickLag);
    }
});