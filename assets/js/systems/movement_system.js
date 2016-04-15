var MovementSystem = System.extend('MovementSystem',
    function(input) {
        this.input = input;
        this.zeroSpeedThreshold = 0.001;
        this.nodes = {movables: []};
        this.lastDelta = 1/30;
    },
    {
        aspects: {
            movables: Aspect.all(['Movement', 'RigidBody', 'GroundSensor'])
        },
        onUpdate: function(dt, nodes) {
            this.lastDelta = dt;
            this.nodes = nodes;

            for (var i = 0; i < this.nodes.movables.length; ++i) {
                var body = ecs.getComponent('RigidBody', this.nodes.movables[i]);
                var movement = ecs.getComponent('Movement', this.nodes.movables[i]);
                var ground_sensor = ecs.getComponent('GroundSensor', this.nodes.movables[i]);
                
                var body_vel = body.getLinearVelocity();
                
                var speed = ground_sensor.isOnGround ? movement.speed : movement.airSpeed;

                if (this.input.isDown(KeyCodes.A)) {
                    if (body_vel.x > -speed) {
                        var dx = -speed - body_vel.x;
                        var acc_x = dx / (1/5);
                        
                        body.setAwake(true);
                        body.applyAcceleration({x: acc_x, y: 0});
                    }
                }
                if (this.input.isDown(KeyCodes.D)) {
                    if (body_vel.x < speed) {
                        var dx = speed - body_vel.x;
                        var acc_x = dx / (1/5);
                        
                        body.setAwake(true);
                        body.applyAcceleration({x: acc_x, y: 0});
                    }
                }
                if (!this.input.isDown(KeyCodes.A) && !this.input.isDown(KeyCodes.D)) {
                    if (Math.abs(body_vel.x) <= this.zeroSpeedThreshold) {
                        var dx = -body_vel.x;
                        var acc_x = dx / this.lastDelta;
                        body.applyAcceleration({x: acc_x, y: 0});
                    } else {
                        var dx = 0 - body_vel.x;
                        var acc_x = dx / (1/8);
                        body.applyAcceleration({x: acc_x, y: 0});
                    }
                }
            }
        }
    }
);

BUILTIN_COMPONENTS['Movement'] = {
    speed: 10,
    airSpeed: 7
};