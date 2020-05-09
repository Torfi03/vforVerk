var aircraft = {
    list: {
        "chopper": {
            name: "chopper",
            cost: 900,
            canConstruct: true,
            pixelWidth: 40,
            pixelHeight: 40,
            pixelOffsetX: 20,
            pixelOffsetY: 20,
            weaponType: "heatseeker",
            radius: 18,
            sight: 6,
            canAttack: true,
            canAttackLand: true,
            canAttackAir: true,
            hitPoints: 50,
            speed: 25,
            turnSpeed: 4,
            pixelShadowHeight: 40,
            spriteImages: [
                { name: "stand", count: 4, directions: 8}
            ],
        },
        "wraith": {
            name: "wraith",
            cost: 600,
            canConstruct: true,
            pixelWidth: 30,
            pixelHeight: 30,
            pixelOffsetX: 15,
            pixelOffsetY: 15,
            weaponType: "fireball",
            radius: 15,
            sight: 8,
            canAttack: true,
            canAttackLand: false,
            canAttackAir: true,
            hitPoints: 50,
            speed: 40,
            turnSpeed: 4,
            pixelShadowHeight: 40,
            spriteImages: [
                { name: "stand", count: 1, directions: 8}
            ],
        }
    },

    defaults: {
        type: "aircrafts",
        directions: 8,
        canMove: true,

        processActions: function() {
            let direction = Math.round(this.direction) % this.directions;

            switch (this.action) {
                case "stand":
                this.imageList = this.spriteArray["stand-" + direction];
                this.imageOffset = this.imageList.offset + this.animationIndex;
                this.animationIndex++;

                if (this.animationIndex >= this.imageList.count) {
                    this.animationIndex = 0;
                }

                break;
            
                case "teleport":
                    
                    this.imageList = this.spriteArray["stand-" + direction];
                    this.imageOffset = this.imageList.offset + this.animationIndex;
                    this.animationIndex++;

                    if (this.animationIndex >= this.imageList.count) {
                        this.animationIndex = 0
                    }

                    if (this.brightness === undefined) {
                        this.brightness = 0.6;
                    }

                    this.brightness -= 0.05;

                    if (this.brightness <= 0) {
                        this.brightness = undefined;
                        this.action = "stand"
                    }

                    break;

            }
        },

        drawSprite: function() {
            let x = this.drawingX;
            let y = this.drawingY;

            let colorIndex = (this.team === "blue") ? 0 : 1;
            let colorOffset = colorIndex * this.pixelHeight;
            let shadowOffset = this.pixelHeight * 2;

            game.foregroundContext.drawImage(this.spriteSheet, this.imageOffset * this.pixelWidth, colorOffset, this.pixelWidth, this.pixelHeight, x, y - this.pixelShadowHeight, this.pixelWidth, this.pixelHeight);

            game.foregroundContext.drawImage(this.spriteSheet, this.imageOffset * this.pixelWidth, shadowOffset, this.pixelWidth, this.pixelHeight, x, y, this.pixelWidth, this.pixelHeight);

        },
        drawLifeBar: function() {
            let x = this.drawingX;
            let y = this.drawingY - 2 * this.lifeBarHeight - this.pixelShadowHeight;
    
            game.foregroundContext.fillStyle = (this.lifeCode === "healthy") ? this.lifeBarHealthyFillColor : this.lifeBarDamagedFillColor;
            game.foregroundContext.fillRect(x, y, this.pixelWidth * this.life / this.hitPoints,
            this.lifeBarHeight);
            game.foregroundContext.strokeStyle = this.lifeBarBorderColor;
            game.foregroundContext.lineWidth = 1;
            game.foregroundContext.strokeRect(x, y, this.pixelWidth, this.lifeBarHeight);
        },
    
        drawSelection: function() {
            let x = this.drawingX + this.pixelOffsetX;
            let y = this.drawingY + this.pixelOffsetY - this.pixelShadowHeight;
            
            game.foregroundContext.strokeStyle = this.selectionBorderColor;
            game.foregroundContext.fillStyle = this.selectionFillColor;
            game.foregroundContext.lineWidth = 2;
    
            game.foregroundContext.beginPath();
            game.foregroundContext.arc(x, y, this.radius, 0, Math.PI * 2, false),
            game.foregroundContext.stroke();
            game.foregroundContext.fill();
    
            game.foregroundContext.beginPath();
            game.foregroundContext.arc(x, y + this.pixelShadowHeight, 4, 0, Math.PI * 2, false);
            game.foregroundContext.stroke();
    
            game.foregroundContext.beginPath();
            game.foregroundContext.moveTo(x, y);
            game.foregroundContext.lineTo(x, y + this.pixelShadowHeight);
            game.foregroundContext.stroke();
        },

        processOrders: function() {
            this.lastMovementX = 0;
            this.lastMovementY = 0;
    
            if (this.orders.to) {
                var distanceFromDestination = Math.pow(Math.pow(this.orders.to.x - this.x, 2) +
                Math.pow(this.orders.to.y - this.y, 2), 0.5);
                var radius = this.radius / game.gridSize;
            }

            if (this.reloadTimeLeft) {
                this.reloadTimeLeft--;
            }

            var targets;

            switch (this.orders.type) {
                case "move":
                    if (distanceFromDestination < radius) {
                        this.orders = { type: "stand"};
                    } else {
                        this.moveTo(this.orders.to, distanceFromDestination);
                    }
    
                    break;

                case "stand":
                    targets = this.findTargetsInSight();

                    if (targets.length > 0) {
                        this.orders = { type: "attack", to: targets[0] };
                    }

                    break;
                
                case "sentry":
                    targets = this.findTargetsInSight(2);

                    if (targets.length > 0) {
                        this.orders = { type: "attack", to: targets[0], previousOrder: this.orders };
                    }

                    break;
                
                case "hunt":
                    targets = this.findTargetsInSight(100);

                    if (targets.length > 0) {
                        this.orders = { type: "attack", to: targets[0], previousOrder: this.orders };
                    }

                    break;

                case "attack":
                    if (!this.isValidTarget(this.orders.to)) {
                        this.cancelCurrentOrder();
                        break;
                    }

                    if (this.isTargetInSight(this.orders.to)) {
                        var targetDirection = this.findAngleForFiring(this.orders.to);
                        
                        this.turnTo(targetDirection);

                        if (!this.turning) {
                            if (!this.reloadTimeLeft) {
                                this.reloadTimeLeft = bullets.list[this.weaponType].reloadTime;
                                var angleRadians = -(targetDirection / this.direction) * 2 * Math.PI;

                                var bulletX = this.x - (this.radius * Math.sin(angleRadians) / game.gridSize);
                                var bulletY = this.y - (this.radius * Math.cos(angleRadians) / game.gridSize) - this.pixelShadowHeight / game.gridSize;

                                game.add({ name: this.weaponType, type: "bullets", x: bulletX, y: bulletY, direction: targetDirection, target: this.orders.to });
                            }
                        }
                    } else {
                        this.moveTo(this.orders.to, distanceFromDestination);
                    }

                    break;

                case "patrol":
                    targets = this.findTargetsInSight(1);

                    if (targets.length > 0) {
                        this.orders = { type: "attack", to: targets[0], previousOrder: this.orders };
                        break;
                    }

                    if (distanceFromDestination < this.sight) {
                        var to = this.orders.to;

                        this.orders.to = this.orders.from;
                        this.orders.from = to;

                    } else {
                        this.moveTo(this.orders.to, distanceFromDestination);
                    }

                    break;

                case "guard":
                    if (this.orders.to.lifecode === "dead") {
                        this.cancelCurrentOrder();
                        break;
                    }

                    if (distanceFromDestination < this.sight) {
                        targets = this.findTargetsInSight(1);
                        if (targets.length > 0) {
                            this.orders = { type: "attack", to: targets[0], previousOrder: this.orders };
                            break;
                        }
                    } else {
                        this.moveTo(this.orders.to, distanceFromDestination);
                    }

                    break;
            }
        },
    
        speedAdjustmentWhileTurningFactor: 0.4,
        
        moveTo: function(destination, distanceFromDestination) {
            let newDirection = this.findAngle(destination);
    
            this.turnTo(newDirection);
    
            let maximumMovement = this.speed * this.speedAdjustmentFactor * (this.turning ? this.speedAdjustmentWhileTurningFactor : 1);
            let movement = Math.min(maximumMovement, distanceFromDestination);
    
            let angleRadians = -(this.direction / this.directions) * 2 * Math.PI;
    
            this.lastMovementX = -(movement * Math.sin(angleRadians));
            this.lastMovementY = -(movement * Math.cos(angleRadians));
    
            this.x = this.x + this.lastMovementX;
            this.y = this.y + this.lastMovementY;
        },
    },

   

    load: loadItem,
    add: addItem,
};