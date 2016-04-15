var GroundTrackingSystem = System.extend('GroundTrackingSystem',
    function() {},
    {
        aspects: {
            'trackables': Aspect.all(['GroundSensor', 'RigidBody'])
        },
        
        createSensorShape: function(ground_sensor, body) {
            var shape = new b2.PolygonShape();
            shape.SetAsBox(ground_sensor.size.x / 2, ground_sensor.size.y / 2, new b2.Vec2(ground_sensor.pos.x, ground_sensor.pos.y), 0);
            return shape;
        },
        createSensorFixtureDef: function(shape) {
            var fixture_def = new b2.FixtureDef();
            fixture_def.set_shape(shape);
            fixture_def.set_isSensor(true);
            return fixture_def;
        },
        handleTouchGround: function(ground_sensor) {
            ground_sensor.lastTimeOnGround = Util.Time.now();
            ground_sensor.groundContactsCount++;
            ground_sensor.isOnGround = true;
        },
        handleUntouchGround: function(ground_sensor) {
            ground_sensor.groundContactsCount--;
            if (ground_sensor.groundContactsCount <= 0) {
                ground_sensor.isOnGround = false;
            }
        },
        
        onBox2DBeginContact: function(contact) {
            
            var fixtureA = contact.GetFixtureA();
            var fixtureB = contact.GetFixtureB();
            var sensorA = fixtureA._ZeroECS_groundSensor;
            var sensorB = fixtureB._ZeroECS_groundSensor;
            //console.log(fixtureA, fixtureB, sensorA, sensorB);
            if (sensorA && !fixtureB.IsSensor()) {
                
                this.handleTouchGround(sensorA);
            }
            
            if (sensorB && !fixtureA.IsSensor()) {
                //console.log('touch ground');
                this.handleTouchGround(sensorB);
            }
        },
        onBox2DEndContact: function(contact) {
            var fixtureA = contact.GetFixtureA();
            var fixtureB = contact.GetFixtureB();
            var sensorA = fixtureA._ZeroECS_groundSensor;
            var sensorB = fixtureB._ZeroECS_groundSensor;
            
            if (sensorA && !fixtureB.IsSensor()) {
                this.handleUntouchGround(sensorA);
            }
            
            if (sensorB && !fixtureA.IsSensor()) {
                this.handleUntouchGround(sensorB);
            }
        },
        onBox2DBodyInitialized: function(entity, body) {
            var ground_sensor = this.ecs.getComponent('GroundSensor', entity);
            
            if (!ground_sensor) return;
            if (ground_sensor._b2SensorFixture) {
                throw new Error('A body was just created, but its entity already has ground sensor. WTF just happened?');
            }
            
            var sensor_fixture = body._b2Body.CreateFixture( this.createSensorFixtureDef(this.createSensorShape(ground_sensor, body)) );
            sensor_fixture._ZeroECS_groundSensor = ground_sensor;
            ground_sensor._b2SensorFixture = sensor_fixture;
        },
        onUpdate: function(dt, nodes) {
            for (var i = 0; i < nodes.trackables.length; ++i) {
                var body = this.ecs.getComponent('RigidBody', nodes.trackables[i]);
                var ground_sensor = this.ecs.getComponent('GroundSensor', nodes.trackables[i]);
                
                // Ground sensor not yet initialized
                if (!ground_sensor._b2SensorFixture) continue;
                
                if (ground_sensor.groundContactsCount > 0) {
                    ground_sensor.lastTimeOnGround = Util.Time.now();
                }
            }
        }
    }
);

BUILTIN_COMPONENTS['GroundSensor'] = {
    lastTimeOnGround: -Infinity,
    groundContactsCount: 0,
    isOnGround: false,
    wasOnGround: function(timeframe) {
        return this.lastTimeOnGround >= Util.Time.now() - timeframe;
    },
    
    _b2SensorFixture: null
};