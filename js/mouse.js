var mouse = {
    init: function(){
        let canvas = document.getElementById("gameforegroundcanvas");

        canvas.addEventListener("mousemove", mouse.mousemovehandler, false);

        canvas.addEventListener("mouseenter", mouse.mouseenterhandler, false);
        canvas.addEventListener("mouseout", mouse.mouseouthandler, false);

        canvas.addEventListener("mousedown", mouse.mousedownhandler, false);
        canvas.addEventListener("mouseup", mouse.mouseuphandler, false);

        canvas.addEventListener("contextmenu", mouse.mouserightclickhandler, false);

        canvas.addEventListener("touchstart", mouse.touchstarthandler, { passive: false });
        canvas.addEventListener("touchend", mouse.touchendhandler, { passive: false });
        canvas.addEventListener("touchmove", mouse.touchmovehandler, { passive: false });

        mouse.canvas = canvas;
    },

    x: 0,
    y: 0,

    gameX: 0,
    gameY: 0,

    gridX: 0,
    gridY: 0,

    calculateGameCoordinates: function() {
        mouse.gameX = mouse.x + game.offsetX;
        mouse.gameY = mouse.y + game.offsetY;

        mouse.gridX = Math.floor((mouse.gameX) / game.gridSize);
        mouse.gridY = Math.floor((mouse.gameY) / game.gridSize);
    },

    setCoordinates: function(clientX, clientY) {
        let offset = mouse.canvas.getBoundingClientRect();

        mouse.x = (clientX - offset.left) / game.scale;
        mouse.y = (clientY - offset.top) / game.scale;

        mouse.calculateGameCoordinates();
    },

    insideCanvas: false,

    mousemovehandler: function(ev){
        mouse.insideCanvas = true;
        mouse.setCoordinates(ev.clientX, ev.clientY);
        mouse.checkIfDragging();
    },

    dragSelect: false,

    dragSelectThreshold: 5,

    checkIfDragging: function() {
        if (mouse.buttonPressed && !sidebar.deployBuilding) {
            if ((Math.abs(mouse.dragX - mouse.gameX) > mouse.dragSelectThreshold && Math.
            abs(mouse.dragY - mouse.gameY) > mouse.dragSelectThreshold)) {
                mouse.dragSelect = true;
            }
        } else{
            mouse.dragSelect = false;
        }
    },

    mouseenterhandler: function(){
        mouse.insideCanvas = true;
    },

    mouseouthandler: function() {
        mouse.insideCanvas = false;
    },

    leftClick: function(shiftPressed) {
        let clickedItem = mouse.itemUnderMouse();

        if (sidebar.deployBuilding) {
            if (sidebar.canDeployBuilding) {
                sidebar.finishDeployBuilding();
            } else {
                game.showMessage("system", "Warning! Cannot deploy building here.")
            }

            return;
        }

        if (clickedItem) {
            if (!shiftPressed) {
                game.clearSelection();
            }

            game.selectItem(clickedItem, shiftPressed);
        }
    },

    itemUnderMouse: function() {
        if (fog.isPointOverFog(mouse.gameX,mouse.gameY)) {
            return;
        }
        
        for (let i = game.items.length - 1; i >= 0; i--) { // förum yfir öll itemin sem eru í leiknum
            let item = game.items[i]; // náum í þau öll og setjum inni breytina item

            if (item.lifeCode === "dead") { // NEMA ef itemið er "dead"
                continue; // þá hoppum bið yfir það item / látum það ekki inni breytina item
            }

            let x = item.x * game.gridSize; // x og y hnit sem eru í gangi
            let y = item.y * game.gridSize;

            if (item.type === "buildings" || item.type === "terrain") { // Ef item.type er building EÐA terrain
                if (x <= mouse.gameX && x >= (mouse.gameX - item.baseWidth) && y <= mouse.gameY && y >= (mouse.gameY - item.baseHeight)) { // Ef músin er yfir þessu itemi
                    return item; // hættir í for loopuni
                }
            } else if (item.type === "aircraft") { // Athugar ef item.type er aircraft
                if (Math.pow(x - mouse.gameX, 2) + Math.pow(y - mouse.gameY - item.pixelShadowHeight, 2) < Math.pow(item.radius, 2)) { // Athugar hvort það er með ákveðin radius
                    // reiknum það hér, ef það passar
                    return item; // þá skilum við því itemi
                }
            } else if (item.type === "vehicles") { // Athugar hvort item.type er vehicle
                if(Math.pow(x - mouse.gameX, 2) + Math.pow(y - mouse.gameY, 2) < Math.pow(item.radius, 2)) { // reiknum x og y hnit  ef það passar
                    return item; // þá skilum við því itemi
                }
            }
        }
    },

    buttonPressed: false,

    mousedownhandler: function(ev) {
        mouse.insideCanvas = true;
        mouse.setCoordinates(ev.clientX, ev.clientY);

        if (ev.button === 0) {
            mouse.buttonPressed = true;

            mouse.dragX = mouse.gameX;
            mouse.dragY = mouse.gameY;
        }
    },

    mouseuphandler: function(ev) {
        mouse.setCoordinates(ev.clientX, ev.clientY);

        let shiftPressed = ev.shiftKey;

        if (ev.button === 0) {
            if (mouse.dragSelect) {
                mouse.finishDragSelection(shiftPressed);
            } else {
                mouse.leftClick(shiftPressed);
            }

            mouse.buttonPressed = false;
        }
    },

    finishDragSelection: function(shiftPressed) {
        if (!shiftPressed) { // Ef shiftPressed er EKKI TRUE
            game.clearSelection(); // þá keyrir það upp game.clearSelection()
        }

        let x1 = Math.min(mouse.gameX, mouse.dragX); // x og y hnit sem við byrjum að draga músina 
        let y1 = Math.min(mouse.gameY, mouse.dragY);
        let x2 = Math.max(mouse.gameX, mouse.dragX); // x og y hnit sem við endum að draga músina
        let y2 = Math.max(mouse.gameY, mouse.dragY);

        game.items.forEach(function(item) {
            if (!item.selectable || item.lifeCode === "dead" || item.team !== game.team || item. // Ef "item" er ekki selectable eða "item" er dautt eða "item" er EKKI í sama liði eða "item" er bygging
            type === "buildings") {
                return; // þá förum við út úr þessu functioni
            }

            let x = item.x * game.gridSize; // x hnit * gridSize til að fá staðsetninguna svo leikurinn skilur
            let y = item.y * game.gridSize; // y hnit * gridSize til að fá staðsetninguna svo leikurinn skilur

            if (x1 <= x && x2 >= x) { // athugum ef x1 er minni eða jafnt og x OG x2 er stærri eða jafnt og x. Athuga hvort hnitin séu inni í kassanum sem við erum að búa til
                if ((item.type === "vehicles" && y1 <= y && y2 >= y) // og að það séu týpur sem við viljum að séu
                    || (item.type === "aircraft" && (y1 <= y - item.pixelShadowHeight) && (y2 >= y - item.pixelShadowHeight))) {
                    // Ef þetta upfyllir þessar kröfur þá setjum við sá hluti sem við drógum yfir í game.selectItem aðferðina, (item og shiftPressed)
                    game.selectItem(item, shiftPressed);
                }
            }
        });

        mouse.dragSelect = false;
    },

    buildableColor: "rgba(0, 0, 255, 0.3)",
    unbuildableColor: "rgba(255, 0, 0, 0.3)",

    draw: function() {
        if (this.dragSelect) {
            let x = Math.min(this.gameX, this.dragX);
            let y = Math.min(this.gameY, this.dragY);

            let width = Math.abs(this.gameX - this.dragX);
            let height = Math.abs(this.gameY - this.dragY);

            game.foregroundContext.strokeStyle = "white";
            game.foregroundContext.strokeRect(x - game.offsetX, y - game.offsetY, width, height);
        }

        if (mouse.insideCanvas && sidebar.deployBuilding && sidebar.placementGrid) {
            let x = (this.gridX * game.gridSize) - game.offsetX;
            let y = (this.gridY * game.gridSize) - game.offsetY;

            for (let i = sidebar.placementGrid.length - 1; i >= 0; i--) {
                for (let j = sidebar.placementGrid[i].length - 1; j >= 0; j--) {
                    let tile = sidebar.placementGrid[i][j];

                    if (tile) {
                        game.foregroundContext.fillStyle = (tile === 1) ? this.buildableColor : this.unbuildableColor;
                        game.foregroundContext.fillRect(x + j * game.gridSize, y + i * game.gridSize, game.gridSize, game.gridSize);
                    }
                }
            }
        }
    },

    mouserightclickhandler: function(ev) {
        mouse.rightClick(ev, true);

        ev.preventDefault(true);
    },

    rightClick: function() {
        if (sidebar.deployBuilding) {
            sidebar.cancelDeployBuilding();

            return;
        }

        let clickedItem = mouse.itemUnderMouse(); // fall sem segir hvaða item er undir músini, við tökum það item og látum í cklickedItem breytuna

        if (clickedItem) { // EF einhvað er inni í clickedItem þá er það True
            if (clickedItem.type !== "terrain") { // Ef clickedItem.type er EKKI terrain, ef hún er ekki terrain þá höldum við áfram
                if (clickedItem.team !== game.team) { // Ef clickedItem.team er EKKI sama og liðið sem við erum að spila þá smelltum við á óvin
                    let uids = []; // Búum til tóman array, Uniqueids þár sem við gefum öllum itme unique id sem bara þeir hafa

                    game.selectedItems.forEach(function(item) { // fyrir hvert eitt og einasta slectedItems skýrum það item
                        if (item.team === game.team && item.canAttack) { // Ef item.team er sama og game.team, sama lið OG getur gert árás
                            uids.push(item.uid);  // Ef kóðinn fyrir ofan er True þá tökum við uids arrayin og ýtum  item.uid inni hann
                        }
                    }, this);

                    if (uids.length > 0) { // ef uids.lenght er meira en 0, ef einhvað er inni honum
                        game.sendCommand(uids, { type: "attack", toUid: clickedItem.uid }); // þá keyrum við upp game objectið, sendCommand aðferðina, tökum uids gefum þeim type attack 

                        sounds.play("acknowledge-attacking");
                    }
                } else { // Ef við smelltum á vin
                    let uids = []; // Gerum aftur uids tóman array

                    game.selectedItems.forEach(function(item) { // tökum aftur selectedItems og köllum það item
                        if (item.team === game.team && item.canAttack && item.canMove) { // Ef itemið er í okkar liði OG itemið getur gert árás OG itemið getur hreyft sig
                            uids.push(item.uid); // Ef kóðinn fyrir ofan er True þá tökum við uids arrayin og ýtum  item.uid inni hann
                        }
                    }, this);

                    if (uids.length > 0) { // Ef einhvað er inni arrayinu / meiri en 0
                        game.sendCommand(uids, { type: "guard", toUid: clickedItem.uid}); // þá keyrum við upp skipunina game.sendCommand, þar sem öll udis fá skipunina guard og hvert þau eiga að fara

                        sounds.play("acknowledge-moving");
                    }
                }
            } else if (clickedItem.name === "oilfield") { // Ef við semlltum á oilfield
                let uids = []; // Búum til tóman array sem heitir uids

                for (let i = game.selectedItems.length - 1; i >= 0; i--) { // 
                    let item = game.selectedItems[i];

                    if (item.team === game.team && item.type === "vehicles" && item.name === "harvester") { // ef itemið er sama lið og við OG itemið er vehicle OG itemið er harvester
                        uids.push(item.uid); // Ef kóðinn fyrir ofan er True þá tökum við uids arrayin og ýtum  item.uid inni hann
                        break; // hættum í for loopuni
                    }
                }

                if (uids.length > 0) { // Ef það fór einhver inni uids 
                    game.sendCommand(uids, { type: "deploy", toUid: clickedItem.uid }); // þá mun uids fá skipunina deploy og hvert það á að fara

                    sounds.play("acknowledge-moving");
                }
            }
        } else { // ef við smelltum á ekkert
            let uids = []; // tómur uids array

            game.selectedItems.forEach(function(item) { // allt sem er valið og la´tum það vera item
                if (item.team === game.team && item.canMove) { // ef item er sama lið og við Og item getur hreyft sig
                    uids.push(item.uid); // þá látum við það í uids arrayin
                }
            }, this);

            if (uids.length > 0) { // ef einhvað er í uids arrayinum
                game.sendCommand(uids, { type: "move", to: { x: mouse.gameX / game.gridSize, y: mouse.gameY / game.gridSize}}); // þá ´fa þau skipunina move og hvert og reiknum x og y hnitin

                sounds.play("acknowledge-moving");
            }
        }
    },

    touchstarthandler: function(ev) {
        mouse.insideCanvas = true;
        let touch = event.targetTouches[0];

        mouse.setCoordinates(touch.clientX, touch.clientY);

        mouse.buttonPressed = true;

        mouse.dragX = mouse.gameX;
        mouse.dragY = mosue.gameY;

        ev.preventDefault();
    },

    touchmovehandler: function(ev) {
        mouse.insideCanvas = true;

        let touch = ev.targetTouches[0];

        mouse.setCoordinates(touch.clientX, touch.clientY);
        mouse.checkIfDragging();

        ev.preventDefault();
    },

    doubleTapTimeoutThreshold: 300,
    doubleTapTimeout: undefined,

    touchendhandler: function(ev) {
        let shiftPressed = ev.shiftKey;

        if (mouse.dragSelect) {
            mouse.finishDragSelection(shiftPressed);

        } else {
            if (!mouse.doubleTapTimeout) {
                mouse.doubleTapTimeout = setTimeoout(function() {
                    mouse.doubleTapTimeout = undefined;
                    mouse.leftClick();

                }, mouse.doubleTapTimeoutThreshold);
            } else {
                clearTimeout(mouse.doubleTapTimeout);
                mouse.doubleTapTimeout = undefined;
                mosue.rightClick();
            }
        }

        mouse.buttonPressed = false;

        mouse.insideCanvas = false;

        ev.preventDefault();
    },
};