var Box2dPhysicsSystem = System.extend('Box2dPhysicsSystem',
    function(options) {
        options = Util.Object.merged([{
            velocityIterations: 2,
            positionIterations: 3,
        }, options || {}]);
        
        this.velocityIterations = options.velocityIterations;
        this.positionIterations = options.positionIterations;
        
        this.world = new b2.World( new b2.Vec2(0, -40) );
        this.b2BodyTypeMapping = {
            'dynamic': b2._dynamicBody,
            'kinematic': b2._kinematicBody,
            'static' : b2._staticBody
        };
        
        var self = this;
        this.contactListener = new Box2D.JSContactListener();
        this.contactListener.BeginContact = function(contact_ptr) {
            var contact = Box2D.wrapPointer(contact_ptr, Box2D.b2Contact);
            self.eventSource.trigger('onBox2DBeginContact', [contact]);
        };
        
        this.contactListener.EndContact = function(contact_ptr) {
            var contact = Box2D.wrapPointer(contact_ptr, Box2D.b2Contact);
            self.eventSource.trigger('onBox2DEndContact', [contact]);
        };
        
        this.contactListener.PreSolve = function(contact, oldManifold) {
            
        };
        
        this.contactListener.PostSolve = function(contact, impulse) {
            
        };
        
        this.world.SetContactListener(this.contactListener);
    },
    {
        aspects: {
            bodies: Aspect.all(['RigidBody', 'Transform2d'])
        },
        onBox2DBeginContact: function(contact) {
            var b2_fixture_a = contact.GetFixtureA();
            var b2_fixture_b = contact.GetFixtureB();
            var b2_body_a = b2_fixture_a.GetBody();
            var b2_body_b = b2_fixture_b.GetBody();
            var entity_a = b2_body_a._ZeroECS_entity;
            var entity_b = b2_body_b._ZeroECS_entity;
            console.log(entity_a, entity_b);
            this.eventSource.trigger('onCollisionEnter', [{
                entityA: entity_a,
                entityB: entity_b,
                b2FixtureA: b2_fixture_a,
                b2FixtureB: b2_fixture_b,
                b2BodyA: b2_body_a,
                b2BodyB: b2_body_b,
                b2Contact: contact
            }]);
        },
        onBox2DEndContact: function(contact) {
            var b2_fixture_a = contact.GetFixtureA();
            var b2_fixture_b = contact.GetFixtureB();
            var b2_body_a = b2_fixture_a.GetBody();
            var b2_body_b = b2_fixture_b.GetBody();
            var entity_a = b2_body_a._ZeroECS_entity;
            var entity_b = b2_body_b._ZeroECS_entity;
            this.eventSource.trigger('onCollisionExit', [{
                entityA: entity_a,
                entityB: entity_b,
                b2FixtureA: b2_fixture_a,
                b2FixtureB: b2_fixture_b,
                b2BodyA: b2_body_a,
                b2BodyB: b2_body_b,
                b2Contact: contact
            }]);
        },
        createB2BodyDef(body, transform) {
            var b2_body_type = this.b2BodyTypeMapping[body.type];
            var b2_angle = transform.angle || 0;
            var b2_pos = new b2.Vec2(transform.pos.x + body.size.x/2, transform.pos.y - body.size.y/2);
            var result = new b2.BodyDef();
            result.set_type(b2_body_type);
            result.set_angle(b2_angle);
            result.set_position(b2_pos);
            result.set_fixedRotation(body.fixedRotation);
            return result;
        },
        createB2Shape(body) {
            if (!body.size) throw new Error('Currently only rectangle-shaped bodies are supported; please, specify RigidBody.size');
            var size = body.size;
            var shape;
            switch (body.shape) {
                case 'rect':
                    shape = new b2.PolygonShape();
                    shape.SetAsBox( body.size.x / 2, body.size.y / 2 );
                    break;
                case 'circle':
                    shape = new b2.CircleShape();
                    shape.set_m_radius( Math.max(body.size.x, body.size.y) / 2 );
                    break;
                default:
                    throw new Error('Unrecognized RigidBody shape: ' + body.shape.toString());
            }
            return shape;
        },
        createB2FixtureDef(body) {
            var result = new b2.FixtureDef();
            result.set_density(body.density);
            result.set_friction(body.friction);
            result.set_restitution(body.restitution);
            result.set_isSensor(body.isSensor);
            result.set_shape(this.createB2Shape(body));
            return result;
        },
        onUpdate: function(dt, nodes) {
            var objects = [];
            //var to_remove = [];
            for (var i = 0; i < nodes.bodies.length; ++i) {
                var entity = nodes.bodies[i];
                var obj = this.ecs.getAspect(this.aspects.bodies, entity);
                
                if (!this.ecs.isEntity(entity)) {
                    if (obj.RigidBody._b2Body) {
                        //to_remove.push(obj.RigidBody._b2Body);
                        this.world.DestroyBody(obj.RigidBody._b2Body);
                        continue;
                    }
                }
                
                objects.push(obj);
                var body = obj.RigidBody;
                var transform = obj.Transform2d;
                var pos = obj.Transform2d.pos;
                
                if (!body._b2Body) {
                    var body_def = this.createB2BodyDef(body, transform);
                    var b2_body = this.world.CreateBody(body_def);
                    b2_body.CreateFixture(this.createB2FixtureDef(body));
                    b2_body.SetGravityScale(body.gravityScale);
                    
                    /*console.log('var body_def = new Box2D.b2BodyDef(); body_def.set_position( new Box2D.b2Vec2(' + (transform.pos.x + body.size.x/2) + ', ' + (transform.pos.y - body.size.y/2) + ') );');
                    console.log('var body_shape = new Box2D.b2PolygonShape(); body_shape.SetAsBox( '+ body.size.x/2 + ', ' + body.size.y/2 + ' );');
                    console.log('var body = world.CreateBody(body_def);');
                    console.log('var fixture_def = new Box2D.b2FixtureDef(); fixture_def.set_shape(body_shape);');
                    console.log('body.CreateFixture(fixture_def);');*/
                    
                    // Get/SetUserData does not work properly in box2d.js
                    b2_body._ZeroECS_entity = entity;
                    body._b2Body = b2_body;
                    
                    this.eventSource.trigger('onBox2DBodyInitialized', [entity, body]);
                } else {
                    body._b2Body.SetTransform( new b2.Vec2(pos.x, pos.y), body._b2Body.GetAngle() );
                }
            }
            
            this.world.Step(dt, this.velocityIterations, this.positionIterations);
            
            for (var i = 0; i < objects.length; ++i) {
                var obj = objects[i];
                var pos = obj.Transform2d.pos;
                //var extents = obj.RigidBody._b2Body.GetFixtureList().GetAABB().GetExtents();
                //var dx = extents.get_x();
                //var dy = extents.get_y();
                var b2_pos = obj.RigidBody._b2Body.GetPosition();
                pos.x = b2_pos.get_x();// - dx;
                pos.y = b2_pos.get_y();// - dy;
            }
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
    type: 'dynamic',
    shape: 'rect', // rect | circle
    friction: 0.2,
    restitution: 0,
    density: 1,
    gravityScale: 1,
    isSensor: false,
    fixedRotation: true,
    size: {x: 4, y: 4},
    
    getLinearVelocity: function() {
        var vel = this._b2Body.GetLinearVelocity();
        return {
            x: vel.get_x(),
            y: vel.get_y()
        };
    },
    setLinearVelocity: function(vector) {
        this._b2Body.SetLinearVelocity( new b2.Vec2(vector.x, vector.y) );
    },
    addLinearVelocity: function(vector) {
        var vel = this.getLinearVelocity();
        this.setLinearVelocity({
            x: vel.x + vector.x || 0,
            y: vel.y + vector.y || 0
        });
    },
    subtractLinearVelocity: function(vector) {
        this.addLinearVelocity({
            x: -vector.x || 0,
            y: -vector.y || 0
        })
    },
    
    getMass: function() {
        return this._b2Body.GetMass();
    },
    
    applyForce: function(vector) {
        this._b2Body.ApplyForceToCenter( new b2.Vec2(vector.x, vector.y) );
    },
    
    applyAcceleration: function(vector) {
        var mass = this.getMass();
        this.applyForce({
            x: vector.x * mass,
            y: vector.y * mass
        });
    },
    
    setAwake: function(awake) {
        this._b2Body.SetAwake(awake);
    },
    
    
    
    _b2Body: null
};