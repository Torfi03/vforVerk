var loader = {
    loaded: true,
    loadedCount: 0,
    totalCount: 0,

    init: function(){
        var mp3Support, oggSupport
        var audio = document.createElement("audio");

        if (audio.canPlayType){
            mp3Support = "" !== audio.canPlayType("audio/mpeg");
            oggSupport = "" !== audio.canPlayType("audio/ogg; codecs=\"vorbis\"");
        } else {
            mp3Support = false;
            oggSupport = false;
        }

        loader.soundFileExtn = oggSupport ? ".ogg" : mp3Support ? ".mp3" : undefined;
    },
    loadImage: function(url){
        this.loaded = false;
        this.totalCount++;

        game.showScreen("loadingscreen");

        var image = new Image();

        image.addEventListener("load", loader.itemLoaded, false);
        image.src = url;

        return image
    },

    soundFileExtn: ".ogg",
    loadSound: function(url){
        this.loaded = false;
        this.totalCount++;

        game.showScreen("loadingscreen");

        var audio = new (window.wAudio || Audio)();

        audio.addEventListener("canplaythrough", loader.itemLoaded, false);
        audio.src = url + loader.soundFileExtn;

        return audio;
    },
    itemLoaded: function(ev){
        ev.target.removeEventListener(ev.type, loader.itemLoaded, false);

        loader.loadedCount++;

        document.getElementById("loadingmessage").innerHTML = "Loaded " + loader.loadedCount + " of " + loader.totalCount;

        if(loader.loadedCount === loader.totalCount){
            loader.loaded = true;
            loader.loadedCount = 0;
            loader.totalCount = 0;

            game.hideScreen("loadingscreen");

            if(loader.onload){
                loader.onload();
                loader.onload = undefined;
            }
        }
    }
};

function loadItem(name){

    var item = this.list[name];
    
    if (item.spriteArray) {
        return;
    }

    item.spriteSheet = loader.loadImage("images/" + this.defaults.type + "/" + name + ".png");
    item.spriteArray = [];
    item.spriteCount = 0;

    item.spriteImages.forEach(function(spriteImage) {
        
        let constructImageCount = spriteImage.count;
        let constructDirectionCount = spriteImage.directions;

        if(constructDirectionCount) {
            for(let i = 0; i < constructDirectionCount; i++) {
                let constructImageName = spriteImage.name + "-" + i;

                item.spriteArray[constructImageName] = {
                    name: constructImageName,
                    count: constructImageCount,
                    offset: item.spriteCount
                };
                item.spriteCount += constructImageCount;
            }
        } else{
            let constructImageName = spriteImage.name;

            item.spriteArray[constructImageName] = {
                name: constructImageName,
                count: constructImageCount,
                offset: item.spriteCount
            };
            item.spriteCount += constructImageCount;
        }
    });

    if (item.weaponType) {
        bullets.load(item.weaponType);
    }
}
    
function addItem(details) {
    var name = details.name;

    var item = Object.assign({}, baseItem);

    Object.assign(item, this.defaults);

    Object.assign(item, this.list[name]);

    item.life = item.hitPoints;

    Object.assign(item, details);

    Object.assign(item, details);
    return item;
}

var baseItem = {
    animationIndex: 0,
    direction: 0,

    selected: false,
    selectable: true,

    orders: { type: "stand" },
    action: "stand",

    animate: function() {

        if(this.life > this.hitPoints * 0.4) {
            this.lifeCode = "healthy";
        } else if (this.life > 0) {
            this.lifeCode = "damaged";
        } else {
            this.lifeCode = "dead";
            game.remove(this);

            return;
        }

        this.processActions();
    },

    draw: function(){
        this.drawingX = (this.x * game.gridSize) - game.offsetX - this.pixelOffsetX;
        this.drawingY = (this.y * game.gridSize) - game.offsetY - this.pixelOffsetY;

        if (this.canMove) {
            this.drawingX += this.lastMovementX * game.drawingInterpolationFactor * game.gridSize;
            this.drawingY += this.lastMovementY * game.drawingInterpolationFactor * game.gridSize;
        }

        if(this.selected) {
            this.drawSelection();
            this.drawLifeBar();
        }

        this.drawSprite();

        if (this.brightness) {
            let x = this.drawingX + this.pixelOffsetX;
            let y = this.drawingY + this.pixelOffsetY - (this.pixelShadowHeight ? this.pixelShadowHeight : 0);

            game.foregroundContext.beginPath();
            game.foregroundContext.arc(x, y, this.radius, 0, Math.PI * 2, false);
            game.foregroundContext.fillStyle = "rgba(255, 255, 255" + this.brightness + ")";
            game.foregroundContext.fill();
        }
    },

    selectionBorderColor: "rgba(255, 255, 0, 0.5)",
    selectionFillColor: "rgba(255, 215, 0, 0.2)",
    lifeBarBorderColor: "rgba(0, 0, 0, 0.8)",
    lifeBarHealthyFillColor: "rgba(0, 255, 0, 0.5)",
    lifeBarDamagedFillColor: "rgba(255, 0, 0, 0.5)",

    lifeBarHeight: 5,

    speedAdjustmentFactor: 1 / 64,
    turnSpeedAdjustmentFactor: 1 / 8,

    findAngle: function (destination) {
        var dy = destination.y - this.y;
        var dx = destination.x - this.x;

        var angle = this.directions / 2 - (Math.atan2(dx, dy) * this.directions / (2 * Math.PI));

        angle = (angle + this.directions) % this.directions;

        return angle;
    },

    angleDiff: function(newDirection) {
        let currentDirection = this.direction;
        let directions = this.directions;

        if (currentDirection >= directions / 2) {
            currentDirection -= directions;
        }

        if (newDirection >= directions / 2) {
            newDirection -= directions;
        }

        var difference = newDirection - currentDirection;

        if (difference < -directions / 2) {
            difference += directions;
        }

        if (difference > directions / 2) {
            difference -= directions;
        }

        return difference;
    },

    turnTo: function(newDirection) {
        let difference = this.angleDiff(newDirection);

        let turnAmount = this.turnSpeed * this.turnSpeedAdjustmentFactor;

        if (Math.abs(difference) > turnAmount) {
            this.direction += turnAmount * Math.abs(difference) / difference;

            this.direction = (this.direction + this.directions) % this.directions;

            this.turning = true;
        } else {
            this.direction = newDirection;
            this.turning = false;
        }
    },

    findAngleForFiring: function(target) {
        var dy = target.y - this.y;
        var dx = target.x - this.x;

        if (target.type === "buildings") {
            dy += target.baseWidth / 2 / game.gridSize;
            dx += target.baseHeight / 2 / game.gridSize;
        } else if (target.type === "aircraft") {
            dy -= target.pixelShadowHeight / game.gridSize;
        }

        if (this.type === "buildings") {
            dy -= this.baseWidth / 2 / game.gridSize;
            dx -= this.baseHeight / 2 / game.gridSize;
        } else if (this.type === "aircraft") {
            dy += this.pixelShadowHeight / game.gridSize;
        }

        var angle = this.directions / 2 - (Math.atan2(dx, dy) * this.directions / (2 * Math.PI));

        angle = (angle + this.directions) % this.directions;

        return angle;
    },

    isValidTarget: function(item) {
        if (!item || item.lifeCode === "dead" || item.team === this.team) {
            return false;
        }

        if (item.type === "buildings" || item.type === "vehicles") {
            return this.canAttackLand;
        } else if (item.type === "aircraft") {
            return this.canAttackAir;
        }
    },

    isTargetInSight: function(item, sightBonus = 0) {
        return Math.pow(item.x - this.x, 2) + Math.pow(item.y - this.y, 2) < Math.pow(this.sight + sightBonus, 2);
    },

    findTargetsInSight: function(sightBonus = 0) {
        var targets = [];

        game.items.forEach(function(item) {
            if (this.isValidTarget(item) && this.isTargetInSight(item, sightBonus)) {
                targets.push(item);
            }
        }, this);

        var attacker = this;

        targets.sort(function(a, b) {
            return (Math.pow(a.x - attacker.x, 2) + Math.pow(a.y - attacker.y, 2)) - (Math.pow(b.x - attacker.x, 2) + Math.pow(b.y - attacker.y, 2));
        });

        return targets;
    },

    cancelCurrentOrder: function() {
        if (this.orders.previousOrder) {
            this.orders = this.orders.previousOrder;
        } else {
            this.orders = { type: "stand" };
        }
    },
};




 

