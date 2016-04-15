var JumpingSystem = System.extend('JumpingSystem',
    function (input, options) {
        options = Util.Object.merged([{
            jumpVelocity: 15,
            firstStageVelocity: 15, 
            firstStageDuration: 200,
            jumpAcceleration: 0,
            jumpInterruptAcceleration: -30,
            jumpPreemptTime: 140,
            maxDuration: 500,
            ghostingTime: 130
        }, options || {}]);
        
        this.input = input;
        this.jumpVelocity = options.jumpVelocity;
        this.firstStageVelocity = options.firstStageVelocity;
        this.firstStageDuration = options.firstStageDuration;
        this.jumpAcceleration = options.jumpAcceleration;
        this.jumpInterruptAcceleration = options.jumpInterruptAcceleration;
        this.jumpPreemptTime = options.jumpPreemptTime;
        this.maxDuration = options.maxDuration;
        this.ghostingTime = options.ghostingTime;
    },
    {
        aspects: {
            jumpers: Aspect.all(['Jumping', 'GroundSensor'])
        },
        onUpdate: function(dt, nodes) {
            for (var i = 0; i < nodes.jumpers.length; ++i) {
                var body = ecs.getComponent('RigidBody', nodes.jumpers[i]);
                var jumping = ecs.getComponent('Jumping', nodes.jumpers[i]);
                var ground_tracker = ecs.getComponent('GroundSensor', nodes.jumpers[i]);
                                
                if (this.input.isPressed(KeyCodes.W, this.jumpPreemptTime) && ground_tracker.wasOnGround(this.ghostingTime) && !jumping.isJumping) {
                    body.addLinearVelocity({x: 0, y: this.jumpVelocity});
                    body.applyAcceleration({x: 0, y: this.jumpAcceleration});
                    jumping.isJumping = true;
                    jumping.jumpStartTime = Util.Time.now();
                } else if (this.input.isDown(KeyCodes.W) && jumping.isJumping && jumping.getJumpDuration() <= this.firstStageDuration && jumping.getJumpDuration() <= this.maxDuration) {
                    var vel = body.getLinearVelocity();
                    if (vel.y > this.firstStageVelocity) {
                        body.setLinearVelocity({x: vel.x, y: this.firstStageVelocity});
                    }
                } else if ((!this.input.isDown(KeyCodes.W) && jumping.isJumping) || jumping.getJumpDuration() > this.maxDuration) {
                    body.applyAcceleration({x: 0, y: this.jumpInterruptAcceleration});
                }
                if (!this.input.isDown(KeyCodes.W) && ground_tracker.isOnGround) {
                    jumping.isJumping = false;
                }
            }
        }
    }
);

BUILTIN_COMPONENTS['Jumping'] = {
    isJumping: false,
    jumpStartTime: -Infinity,
    getJumpDuration: function() {
        if (!this.isJumping) return 0;
        return Util.Time.now() - this.jumpStartTime;
    }
};