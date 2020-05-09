var sidebar = {

    init: function() {
        this.cash = document.getElementById("cash");

        let buttons = document.getElementById("sidebarbuttons").getElementsByTagName("input");

        Array.prototype.forEach.call(buttons, function(button) {
            button.addEventListener("click", function() {
                let name = this.id;
                let details = sidebar.constructables[name];

                if (details.type === "buildings") {
                    sidebar.constructBuilding(details);
                } else {
                    sidebar.constructInStarport(details);
                }
            });
        });
    },

    animate: function() {
        this.updateCash(game.cash[game.team]);

        this.enableSidebarButtons();

        if (this.deployBuilding) {
            this.checkBuildingPlacement();
        }
    },

    _cash: undefined,
    updateCash: function(cash) {
        if (this._cash !== cash) {
            this._cash = cash;

            this.cash.innerHTML = cash.toLocaleString();
        }
    },

    constructables: undefined,
    initRequirementsForLevel: function() {
        this.constructables = {};
        let constructableTypes = ["buildings", "vehicles", "aircraft"];

        constructableTypes.forEach(function(type) {
            for (let name in window[type].list) {
                let details = window[type].list[name];
                let isInRequirements = game.currentLevel.requirements[type].indexOf(name) > -1;

                if (details.canConstruct) {
                    sidebar.constructables[name] = {
                        name: name,
                        type: type,
                        permitted: isInRequirements,

                        cost: details.cost,
                        constructedIn: (type === "buildings") ? "base" : "starport"
                    };
                }
            }
        });
    },

    enableSidebarButtons: function() {
        let cashBalance = game.cash[game.team];

        let baseSelected = false;
        let starportSelected = false;

        game.selectedItems.forEach(function(item) {
            if (item.team === game.team && item.lifeCode === "healthy" && item.action === "stand") {
                if (item.name === "base") {
                    baseSelected = true;
                } else if (item.name === "starport") {
                    starportSelected = true;
                }
            }
        });

        for (let name in this.constructables) {
            let item = this.constructables[name];
            let button = document.getElementById(name);

            let sufficientMoney = cashBalance >= item.cost;

            let correctBuilding = (baseSelected && item.constructedIn === "base") || (starportSelected && item.constructedIn === "starport");
            button.disabled = !(item.permitted && sufficientMoney && correctBuilding);
        }
    },

    constructInStarport: function(details) {
        let starport;
        
        for (let i = game.selectedItems.length - 1; i >= 0; i--) {
            let item = game.selectedItems[i];

            if (item.name === "starport" && item.team === game.team && item.lifeCode === "healthy" && item.action === "stand") {
                starport = item;
                break;
            }
        }

        if (starport) {
            game.sendCommand([starport.uid], { type: "construct-unit", details: details });
        }
    },

    constructBuilding: function(details) {
        sidebar.deployBuilding = details;
    },

    checkBuildingPlacement: function() {
        
        let name = sidebar.deployBuilding.name;
        let details = buildings.list[name];

        game.rebuildBuildableGrid();

        let canDeployBuilding = true;
        let placementGrid = game.makeArrayCopy(details.buildableGrid);
        for (let y = placementGrid.length - 1; y >= 0; y--) {
            for (let x = placementGrid[y].length - 1; x >= 0; x--) {

                if (placementGrid[y][x] === 1) {
                    if (mouse.gridY + y >= game.currentMap.mapGridHeight || mouse.gridX + x >= game.currentMap.mapGridWidth || fog.grid[game.team][mouse.gridY + y][mouse.gridX + x] || game.currentMapBuildableGrid[mouse.gridY + y][mouse.gridX + x]) {
                        canDeployBuilding = false;
                        placementGrid[y][x] = 2;
                    }
                }
            }
        }

        sidebar.placementGrid = placementGrid;
        sidebar.canDeployBuilding = canDeployBuilding;
    },

    cancelDeployBuilding: function() {
        sidebar.deployBuilding = undefined;
        sidebar.placementGrid = undefined;
        sidebar.canDeployBuilding = false;
    },

    finishDeployBuilding: function() {
        let base;

        for (let i = game.selectedItems.length - 1; i >= 0; i--) {
            let item = game.selectedItems[i];

            if (item.name === "base" && item.team === game.team && item.lifeCode === "healthy" && item.action === "stand") {
                
                base = item;
                break;
            }
        }

        if (base) {
            let name = sidebar.deployBuilding.name;
            let details = {
                name: name,
                type: "buildings",
                x: mouse.gridX,
                y: mouse.gridY
            };

            game.sendCommand([base.uid], { type: "construct-building", details: details });
        }

        sidebar.cancelDeployBuilding();
    }
};