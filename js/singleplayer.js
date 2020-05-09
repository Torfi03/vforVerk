var singleplayer = {
    start: function(){

        game.hideScreens();

        singleplayer.currentLevel = 0;

        singleplayer.initLevel();
    },

    currentLevel: 0,
    initLevel: function() {
        game.type = "singleplayer";
        game.team = "blue";

        var enterMissionButton = document.getElementById("entermission");

        enterMissionButton.disabled = true;

        var level = levels.singleplayer[singleplayer.currentLevel];

        game.loadLevelData(level);

        fog.initLevel();

        game.offsetX = level.startX * game.gridSize,
        game.offsetY = level.startY * game.gridSize,

        game.createTerrainGrid();

        loader.onload = function(){
            enterMissionButton.disabled = false;
        };

        this.showMissionBriefing(level.briefing);
    },
    showMissionBriefing: function(briefing) {
        var showMissionBriefingText = document.getElementById("missionbriefing");

        showMissionBriefingText.innerHTML = briefing.replace(/\n/g, "<br><br>");

        game.showScreen("missionbriefingscreen");
    },

    exit: function() {
        game.hideScreens();
        game.showScreen("gamestartscreen");
    },

    play: function(){
        game.animationLoop();

        game.animationInterval = setInterval(game.animationLoop, game.animationTimeout);

        game.start();
    },

    sendCommand: function(uids, details) {
        game.processCommand(uids, details);
    },

    endLevel: function(success) {
        clearInterval(game.animationInterval);
        game.end();

        if (success) {
            let moreLevels = (singleplayer.currentLevel < levels.singleplayer.length - 1);

            if (moreLevels) {
                game.showMessageBox("Mission Accomplished.", function() {
                    game.hideScreens();

                    singleplayer.currentLevel++;
                    singleplayer.initLevel();
                });
            } else {
                game.showMessageBox("Mission Accomplished. \nThis was last mission in the campaign. \nThank You for playing.", function() {
                    game.hideScreens();

                    game.showScreen("gamestartscreen");
                });
            }
        } else {
            game.showMessageBox("Mission Failed.\nTry again?", function() {
                game.hideScreens();

                singleplayer.initLevel();
            }, function() {
                game.hideScreens(),

                game.showScreen("gamestartscreen");
            });
        }
    }

};

