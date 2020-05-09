var game = {
    init: function() {
        loader.init();
        mouse.init();
        sidebar.init();
        sounds.init();

        game.initCanvases();

        if (window.wAudio) {
            wAduio.mobileAutoEnable = true;
        }

        game.hideScreens();
        game.showScreen("gamestartscreen");
    },

    canvasWidth: 480,
    canvasHeight: 400,

    initCanvases: function() {
        game.backgroundCanvas = document.getElementById("gamebackgroundcanvas");
        game.backgroundContext = game.backgroundCanvas.getContext("2d")

        game.foregroundCanvas = document.getElementById("gameforegroundcanvas");
        game.foregroundContext = game.foregroundCanvas.getContext("2d");

        game.foregroundCanvas.width = game.canvasWidth;
        game.backgroundCanvas.width = game.canvasWidth;

        game.foregroundCanvas.height = game.canvasHeight;
        game.backgroundCanvas.height = game.canvasHeight;
    },

    hideScreens: function(){
        var screens = document.getElementsByClassName("gamelayer");

        for(let i = screens.length - 1; i >= 0; i--){
            let screen = screens[i];

            screen.style.display = "none";
        }
    },

    hideScreen: function(id){
        var screen = document.getElementById(id);

        screen.style.display = "none";
    },

    showScreen: function(id){
        var screen = document.getElementById(id);

        screen.style.display = "block";
    },

    scale: 1,
    resize: function(){
        var maxWidth = window.innerWidth;
        var maxheight = window.innerHeight

        var scale = Math.min(maxWidth / 640, maxheight / 480);

        var gameContainer = document.getElementById("gamecontainer")

        gameContainer.style.transform = "translate(-50%, -50%) " + "scale(" + scale + ")";

        game.scale = scale;

        var width = Math.max(640, Math.min(1024, maxWidth / scale));

        gameContainer.style.width = width + "px";

        var canvasWidth = width - 160;

        if(game.canvasWidth !== canvasWidth){
            game.canvasWidth = canvasWidth;
            game.canvasResized = true;
        }
    },

    start: function() {
        game.hideScreens();
        game.showScreen("gameinterfacescreen");

        game.running = true;
        game.refreshBackground = true;
        game.canvasResized = true;

        game.drawingLoop();

        let gamemessages = document.getElementById("gamemessages");

        gamemessages.innerHTMl = "";

        game.currentLevel.triggers.forEach(function(trigger) {
            game.initTrigger(trigger);
        });
    },

    animationTimeout: 100,

    animationLoop: function(){

        sidebar.animate();

        game.items.forEach(function(item) {
            if (item.processOrders) {
                item.processOrders();
            }
        });
        game.items.forEach(function(item){
            item.animate();
        });

    game.sortedItems = Object.assign([], game.items);

    game.sortedItems.forEach(function(item) {
        item.sortY = item.y + item.pixelOffsetY;
        item.sortX = item.x + item.pixelOffsetX;
    });

        game.sortedItems.sort(function(a, b) {
            return a.sortY - b.sortY + ((a.sortY === b.sortY) ? (b.sortX - a.sortX) : 0);
        });

        fog.animate();

        game.lastAnimationTime = Date.now();
    },

    gridSize: 20,

    offsetX: 0,
    offsetY: 0,

    drawingLoop: function(){
        game.handlePanning();

        game.lastDrawTime = Date.now();
        if (game.lastAnimationTime) {
            game.drawingInterpolationFactor = (game.lastDrawTime - game.lastAnimationTime)
            / game.animationTimeout - 1;

            if (game.drawingInterpolationFactor > 0) {
                game.drawingInterpolationFactor = 0;
            }
        } else {
            game.drawingInterpolationFactor = -1;
        }

        game.drawBackground();

        game.foregroundContext.clearRect(0, 0, game.canvasWidth, game.canvasHeight);

        game.sortedItems.forEach(function(item) {
            item.draw();
        });

        game.bullets.forEach(function(bullet) {
            if (bullet.action === "explode") {
                bullet.draw();
            }
        });

        fog.draw();

        mouse.draw();

        if(game.running){
            requestAnimationFrame(game.drawingLoop);
        }
    },

    drawBackground: function(){
        if(game.refreshBackground || game.canvasResized){
            if (game.canvasResized){
                game.backgroundCanvas.width = game.canvasWidth;
                game.foregroundCanvas.width = game.canvasWidth;

                if(game.offsetX + game.canvasWidth > game.currentMapImage.width){
                    game.offsetX = game.currentMapImage.width - game.canvasHeight;
                }
                
                if(game.offsetY + game.canvasHeight > game.currentMapImage.height){
                    game.offsetY = game.currentMapImage.height - game.canvasHeight; 
                }

                game.canvasResized = false;
            }

            game.backgroundContext.drawImage(game.currentMapImage, game.offsetX, game.offsetY,
            game.canvasWidth, game.canvasHeight, 0, 0, game.canvasWidth, game.canvasHeight);
            game.refreshBackground = false
        }
    },



    loadLevelData: function(level) {
        game.currentLevel = level;
        game.currentMap = maps[level.mapName];
        game.currentMapImage = loader.loadImage("images/maps/" + maps[level.mapName].mapImage);

        game.resetArrays();

        for(let type in level.requirements) {
            let requirementArray = level.requirements[type];

            requirementArray.forEach(function(name){
                if (window[type] && typeof window[type].load === "function") {
                    window[type].load(name);
                } else {
                    console.log("Could not load type :", type);
                }
            });
        }

        level.items.forEach(function(itemDetails) {
           
            game.add(itemDetails);
        });

        game.cash = Object.assign({}, level.cash);

        sidebar.initRequirementsForLevel();
    },

    panningThreshold: 80,
    maximumPanDistance: 10,

    handlePanning: function(){
        if(!mouse.insideCanvas){
            return;
        }

        if(mouse.x <= game.panningThreshold){
            let panDistance = game.offsetX;

            if(panDistance > 0){
                game.offsetX -= Math.min(panDistance, game.maximumPanDistance);
                game.refreshBackground = true;
            }
        }else if (mouse.x >= game.canvasWidth - game.panningThreshold){
            let panDistance = game.currentMapImage.width - game.canvasWidth - game.offsetX;

            if (panDistance > 0){
                game.offsetX += Math.min(panDistance, game.maximumPanDistance);
                game.refreshBackground = true;
            }
        }

        if(mouse.y <= game.panningThreshold){
            let panDistance = game.offsetY;

            if(panDistance > 0){
                game.offsetY -= Math.min(panDistance, game.maximumPanDistance);
                game.refreshBackground = true;
            }
        } else if (mouse.y >= game.canvasHeight - game.panningThreshold){
            let panDistance = game.currentMapImage.height - game.offsetY - game.canvasHeight;

            if(panDistance > 0){
                game.offsetY += Math.min(panDistance, game.maximumPanDistance);
                game.refreshBackground = true;
            }
        }

        if(game.refreshBackground){
            mouse.calculateGameCoordinates();
        }
    },

    resetArrays: function() {
        game.counter = 0;

        game.items = [];
        game.buildings = [];
        game.vehicles = [];
        game.aircraft = [];
        game.terrain = [];

        game.selectedItems = [];

        game.bullets = [];
    },

    add: function(itemDetails) {
        
        if (!itemDetails.uid) {
            itemDetails.uid = ++game.counter;
        }

        var item = window[itemDetails.type].add(itemDetails);

        game.items.push(item);

        game[item.type].push(item);

        if (item.type === "buildings" || item.type === "terrain") {
            game.currentMapPassableGrid = undefined;
        }

        if (item.type === "bullets") {
            sounds.play(item.name);
        }

        return item;
    },

    remove: function(item) {
        item.selected = false;
        for (let i = game.selectedItems.length - 1; i >= 0; i--){
            if(game.selectedItems[i].uid === item.uid) {
                game.selectedItems.splice(i, 1);
                break;
            }
        }

        for(let i = game.items.length - 1; i >= 0; i--) {
            if (game.items[i].uid === item.uid) {
                game.items.splice(i, 1);
                break;
            }
        }

        for (let i = game[item.type].length - 1; i >= 0; i--) {
            if (game[item.type][i].uid === item.uid) {
                game[item.type].splice(i, 1);
                break;
            }
        }

        if (item.type === "buildings" || item.type === "terrain") {
            game.currentMapPassableGrid = undefined;
        }
    },

    clearSelection: function() {
        while (game.selectedItems.length > 0) {
            game.selectedItems.pop().selected = false;
        }
    },

    selectItem: function(item, shiftPressed) {
        if (shiftPressed && item.selected) {
            item.selected = false;

            for (let i = game.selectedItems.length - 1; i >= 0; i--) {
                if (game.selectedItems[i].uid === item.uid) {
                    game.selectedItems.splice(i, 1);
                    break;
                }
            }

            return;
        }

        if (item.selectable && !item.selected) {
            item.selected = true;
            game.selectedItems.push(item);
        }
    },

    sendCommand: function(uids, details) {
        if (game.type === "singleplayer") {
            singleplayer.sendCommand(uids, details);
        } else {
            multiplayer.sendCommand(uids, details);
        }
    },

    getItemByUid: function(uid) {
        for (let i = game.items.length - 1; i >= 0; i--) {
            if (game.items[i].uid === uid) {
                return game.items[i];
            }
        }
    },

    processCommand: function(uids, details) {
        var toObject;
        if (details.toUid) {
            toObject = game.getItemByUid(details.toUid);
            if (!toObject || toObject.lifeCode === "dead") {
                return;
            }
        }

        uids.forEach(function(uids) {
            let item = game.getItemByUid(uids);
            if (item) {
                item.orders = Object.assign({}, details);
                if (toObject) {
                    item.orders.to = toObject;
                }
            }
        });
    },

    createTerrainGrid: function() {

        let map = game.currentMap;

        game.currentMapTerrainGrid = new Array(map.gridMapHeight);

        var row = new Array(map.gridMapWidth);

       for (let x = 0; x < map.mapGridWidth; x++) {
           row[x] = 0;
       }

       for (let y = 0; y < map.mapGridHeight; y++) {
           game.currentMapTerrainGrid[y] = row.slice(0);
       }

       map.mapObstructedTerrain.forEach(function(obstruction) {
           game.currentMapTerrainGrid[obstruction[1]][obstruction[0]] = 1;
       }, this);

       game.currentMapPassableGrid = undefined;
    },

    makeArrayCopy: function(originalArray) {
        var length = originalArray.length;
        var copy = new Array(length);

        for (let i = 0; i < length; i++) {
            copy[i] = originalArray[i].slice(0);
        }

        return copy;
    },

    rebuildPassableGrid: function() {

        game.currentMapPassableGrid = game.makeArrayCopy(game.currentMapTerrainGrid);

        for (let i = game.items.length - 1; i >= 0; i--) {
            var item = game.items[i];

            if (item.type === "buildings" || item.type === "terrain") {
                for (let y = item.passableGrid.length - 1; y >= 0; y--) {
                    for (let x = item.passableGrid[y].length - 1; x >= 0; x--) {
                        if (item.passableGrid[y][x]) {
                            game.currentMapPassableGrid[item.y + y][item.x + x] = 1;
                        }
                    }
                }
            }
        }
    },

    characters: {
        "system": {
            "name": "System Control",
            "image": "system.png"
        },
        "op": {
            "name": "Operator",
            "image": "girl1.png"
        },
        "pilot": {
            "name": "Pilot",
            "image": "girl2.png"
        },
        "driver": {
            "name": "Driver",
            "image": "man1.png"
        }
    },

    showMessage: function(from, message) {

        sounds.play("message-received")

        let callerpicture = document.getElementById("callerpicture");
        let gamemessages = document.getElementById("gamemessages");

        let character = game.characters[from];

        if (character) {
            from = character.name;

            if (character.image) {
                callerpicture.innerHTML = "<img src=\"images/characters/" + character.image + "\"/>";

                setTimeout(function() {
                    callerpicture.innerHTML = "";
                }, 6000);
            }
        }

        let messageHTML = "<span>" + from + ": </span>" + message + "<br>";

        gamemessages.innerHTML += messageHTML;
        gamemessages.scrollTop = gamemessages.scrollHeight;
    },

    rebuildBuildableGrid: function() {
        game.currentMapBuildableGrid = game.makeArrayCopy(game.currentMapTerrainGrid);

        game.items.forEach(function(item) {

            if (item.type === "buildings" || item.type === "terrain") {
                for (let y = item.buildableGrid.length - 1; y >= 0; y--) {
                    for (let x = item.buildableGrid[y].length - 1; x >= 0; x--) {
                        if (item.buildableGrid[y][x]) {
                            game.currentMapBuildableGrid[item.y + y][item.x + x] = 1;
                        }
                    }
                }
            } else if (item.type === "vehicles") {
                let radius = item.radius / game.gridSize;
                let x1 = Math.max(Math.floor(item.x - radius), 0);
                let x2 = Math.min(Math.floor(item.x + radius), game.currentMap.mapGridWidth - 1);

                let y1 = Math.max(Math.floor(item.y - radius), 0);
                let y2 = Math.min(Math.floor(item.y + radius), game.currentMap.mapGridHeight - 1);

                for (let x = x1; x <= x2; x++) {
                    for (let y = y1; y <= y2; y++) {
                        game.currentMapBuildableGrid[y][x] = 1;
                    }
                }
            }
        });
    },

    messageBoxOkCallback: undefined,
    messageBoxCancelCallback: undefined,

    showMessageBox: function(message, onOK, onCancel) {
        let messageBoxText = document.getElementById("messageboxtext");

        messageBoxText.innerHTML = message.replace(/\n/g, "<br><br>");

        if (typeof onOK === "function") {
            game.messageBoxOkCallback = onOK;
        } else {
            game.messageOkBoxCallback = undefined;
        }

        let cancelButton = document.getElementById("messageboxcancel");

        if (typeof onCancel === "function") {
            game.messageBoxCancelCallback = onCancel;

            cancelButton.style.display = "";
        } else {
            game.messageBoxCancelCallback = undefined;

            cancelButton.style.display = "none";
        }

        game.showScreen("messageboxscreen");
    },

    messageBoxOk: function() {
        game.hideScreen("messageboxscreen");
        if (typeof game.messageBoxOkCallback === "function") {
            game.messageBoxOkCallback();
        }
    },

    messageBoxCancel: function() {
        game.hideScreen("messageboxscreen");
        if (typeof game.messageBoxOkCallback === "function") {
            game.messageBoxCancelCallback();
        }
    },

    initTrigger: function(trigger) {
        if (trigger.type === "timed") {
            trigger.timeout = setTimeout(function() {
                game.runTrigger(trigger);
            }, trigger.time);
        } else if (trigger.type === "conditional") {
            trigger.interval = setInterval(function() {
                game.runTrigger(trigger);
            }, 1000);
        }
    },

    runTrigger: function(trigger) {
        if (trigger.type === "timed") {

            if (trigger.repeat) {
                game.initTrigger(trigger);
            }

            trigger.action(trigger);
        } else if (trigger.type === "conditional") {
            if (trigger.condition()) {

                game.clearTrigger(trigger);

                trigger.action(trigger);
            }
        }
    },

    clearTrigger: function(trigger) {
        if (trigger.timeout !== undefined) {
            clearTimeout(trigger.timeout);
            trigger.timeout = undefined;
        }

        if (trigger.interval !== undefined) {
            clearInterval(trigger.interval);
            trigger.interval = undefined;
        }
    },

    end: function() {
        if (game.currentLevel.trigger) {

            for (var i = game.currentLevel.triggers.length - 1; i >= 0; i--) {
                game.clearTrigger(game.currentLevel.triggers[i]);
            }
        }

        game.running = false;
    },

    isItemDead: function(uid) {
        let item = game.getItemByUid(uid);

        return !item || outerHeight.lifeCode === "dead";
    }

};

window.addEventListener("load", function(){
    game.resize();
    game.init();
}, false);

window.addEventListener("resize", function(){
    game.resize();
});

