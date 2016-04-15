var PhysicsSystem = System.extend('PhysicsSystem',
    function(max_velocity_vector) {
        this.maxVelocity = max_velocity_vector;
        this.lastDelta = 1/30;
    },
    {
        aspects: {
            bodies: Aspect.all(['RigidBody', 'Transform2d'])
        },
        defaultTotalVelocity: function() {
            return {x: 0, y: 0};
        },
        getDefaultBody: function() {
            return {
                getTotalVelocity: this.defaultTotalVelocity,
                mass: Infinity,
                elasticity: 0.0,
                addVelocity: Util.Func.noop,
                subtractVelocity: Util.Func.noop
            };
        },
        onUpdate: function(dt, nodes) {
            
            this.lastDelta = dt;
            for (var i = 0; i < nodes.bodies.length; ++i) {
                var obj = this.ecs.getAspect(this.aspects.bodies, nodes.bodies[i]);
                var body = obj.RigidBody;
                
                var collider = this.ecs.getComponent('PolygonCollider', nodes.bodies[i]);
                var friction = 0.0;
                if (collider) {
                    for (var j = 0; j < collider.touchingEntities.length; ++j) {
                        var touching_body = this.ecs.getComponent('RigidBody', collider.touchingEntities[j]);
                        if (touching_body) {
                            friction = Math.max(touching_body.friction, friction);
                        }
                    }
                }
                
                //var inv_friction = 1.0 - friction;
                
                var vel = body.getTotalVelocity();
                var acc = body.getTotalAcceleration();
                body.addAcceleration({x: -vel.x * friction * dt, y: 0});
                
                
                //assert(Util.Numeric.isFiniteNumber(acc.x));
                //assert(Util.Numeric.isFiniteNumber(vel.x));
                
                body.setVelocity({
                    x: Util.Numeric.clampAbs(vel.x + acc.x * dt, 0.0, this.maxVelocity.x),
                    y: Util.Numeric.clampAbs(vel.y + acc.y * dt, 0.0, this.maxVelocity.y)
                });
                vel = body.getTotalVelocity();
                
                obj.Transform2d.pos.x += vel.x * dt;
                obj.Transform2d.pos.y += vel.y * dt;
                if (isNaN(obj.Transform2d.pos.x)) {
                    throw new Error();
                }
                // TODO: This should clearly be among the last things in each frame,
                //       use events instead
                obj.RigidBody.clearAcceleration();
            }
        },
        stopCollidingBodies: function(collision) {
            if (collision.isTrigger) return;
            
            a = this.ecs.getAllComponents(collision.a);
            b = this.ecs.getAllComponents(collision.b);

            if (!a.RigidBody && !b.RigidBody) return;
            var a_center = Util.Geometry.rectCenter(a.PolygonCollider.getAABB());
            var b_center = Util.Geometry.rectCenter(b.PolygonCollider.getAABB());
            var ab_dx = Math.sign(b_center.x - a_center.x);
            var ab_dy = Math.sign(b_center.y - a_center.y);
            // TODO: Test this, use approxEquals
            
            // TODO: TEST FOR NON-RECTANGLES!!!
            // SAT.js puts only one component into overlap vector for rectangles. it is either (n, 0) or (0, n). This may not always be the case in other systems.
            
            // TODO: Is it really even constant? Is this the best solution?
            //var constant_dt = this.lastDelta;
            
            var body_a = a.RigidBody || this.getDefaultBody();
            var body_b = b.RigidBody || this.getDefaultBody();
            
            var restitution = 1.0 + body_a.elasticity * body_b.elasticity; // TODO
            
            var vel_a = body_a.getTotalVelocity();
            var vel_b = body_b.getTotalVelocity();
            var inv_mass_a = 1 / body_a.mass;
            var inv_mass_b = 1 / body_b.mass;
            var impulse_x = 0,
                impulse_y = 0;

            if ((Math.sign(vel_a.x) === ab_dx || Math.sign(vel_b.x) === -ab_dx) && Math.abs(collision.overlapVector.x) > 0) {
                var relative_vx = (vel_b.x - vel_a.x);
                impulse_x = (-(restitution) * relative_vx) / (inv_mass_a + inv_mass_b);
            };
            
            if ((Math.sign(vel_a.y) === ab_dy || Math.sign(vel_b.y) === -ab_dy) && Math.abs(collision.overlapVector.y) > 0) {
                var relative_vy = (vel_b.y - vel_a.y);
                impulse_y = (-(restitution) * relative_vy) / (inv_mass_a + inv_mass_b);
            };
                
            body_a.subtractVelocity({x: inv_mass_a * impulse_x, y: inv_mass_a * impulse_y});
            body_b.addVelocity({x: inv_mass_b * impulse_x, y: inv_mass_b * impulse_y});
        },
        onCollisionEnter: function(collision) {
            this.stopCollidingBodies(collision);
        },
        onCollisionStay: function(collision) {
            this.stopCollidingBodies(collision);
        }
    }
);


BUILTIN_COMPONENTS['Transform2d'] = {
    // TODO: Support rotations
    // TODO: Use affine matrix for transformations
    pos: {x: 0.0, y: 0.0}, 		// World units, relative to parent
    rotation: 0.0,				// Radians, around Z axis
    scale: {x: 1.0, y: 1.0},	// Unitless
    pivot: {x: 0.0, y: 0.0},	// 
    parent: null,
    root: function() { return this.parent == null ? this : this.parent.root; },
    // TODO: Nesting and matrices
    worldPos: function() {
        return this.pos;
    }
};

BUILTIN_COMPONENTS['RigidBody'] = {
    _totalVelocity: {x: 0, y: 0},
    _totalAcceleration: {x: 0, y: 0},
    mass: 1,
    elasticity: 0.0,
    friction: 200,
    
    getImpulse: function() {
        var vel = this.getTotalVelocity();
        return {
            x: vel.x * this.mass,
            y: vel.y * this.mass
        };
    },
    
    // TODO: Avoid code duplication from velocity and acceleration. Probably using some utility class
    getTotalVelocity: function() {
        return this._totalVelocity;
    },
    setVelocity: typeCheckedFn(['Vector2'], function(vector) {
        this._totalVelocity = vector;
    }),
    addVelocity: typeCheckedFn(['Vector2'], function(vector) {
        this._totalVelocity.x += vector.x;
        this._totalVelocity.y += vector.y;
    }),
    subtractVelocity: typeCheckedFn(['Vector2'], function(vector) {
        this._totalVelocity.x -= vector.x;
        this._totalVelocity.y -= vector.y;
    }),
    clearVelocity: function() {
        this._totalVelocity = {x: 0, y: 0};
    },
    
    getTotalAcceleration: function() {
        return this._totalAcceleration;
    },
    setAcceleration: typeCheckedFn(['Vector2'], function(vector) {
        this._totalAcceleration = vector;
    }),
    addAcceleration: typeCheckedFn(['Vector2'], function(vector) {
        this._totalAcceleration.x += vector.x;
        this._totalAcceleration.y += vector.y;
    }),
    subtractAcceleration: typeCheckedFn(['Vector2'], function(vector) {
        this._totalAcceleration.x -= vector.x;
        this._totalAcceleration.y -= vector.y;
    }),
    clearAcceleration: function() {
        this._totalAcceleration = {x: 0, y: 0};
    }
};