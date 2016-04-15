(function() {
    /**
    *	Throws exception with optional message if condition is false.
    *	@param {boolean} condition
    *	@param {string} [message=Assertion failed]
    */
    function assert(condition, message) {
        if (!condition) {
            message = message || "Assertion failed";
            if (typeof Error !== "undefined") {
                throw new Error(message);
            }
            throw message;
        }
    }

	function testEcs() {
		var ecs = new ECS([]);

		/**
		*	JUST ENTITIES AND COMPONENTS
		*/

		// Creating entities
		var ent0 = ecs.createEntity();

		// Adding components
		var pos = {x: 0, y: 42, _componentType: 'Position'};
		var graph = {shape: 'rect', color: {fill: 'blue', border: 'black'}, _componentType: 'Graphics'};
		ecs.addComponent(pos, ent0);
		ecs.addComponent(graph, ent0);

		// Building entities
		var ent1 = ecs.buildEntity({
			Foo: {value: 'bar', _componentType: 'Foo'},
			Position: {x: 0, y: 133, _componentType: 'Position'}
		});

		// Retrieving components

		assert( ecs.getComponent('Graphics', ent0).color.fill === 'blue' );
		assert( ecs.getComponent('NonExistingComponent', ent0) === null );
		assert( ecs.getComponent('Foo', ent1) );
		assert( ecs.getComponent('Position', ent1).y === 133 );
		var comps = ecs.getComponents(['Position', 'Graphics'], ent0);
		assert( comps.Position.x === 0 );
		assert( comps.Graphics.color.fill === 'blue' );
		var renderable = ecs.getAspect(Aspect.all(['Position', 'Graphics']), ent0);
		assert( renderable.Position.x === 0 );
		assert( renderable.Graphics.color.fill === 'blue' );
		// Removing components

		ecs.removeComponent('Position', ent1);
		assert( ecs.getComponent('Position', ent1) === null );

		// Checking

		assert( ecs.hasComponent('Graphics', ent0) === true );
		assert( ecs.hasComponent('NonExistingComponent', ent0) === false );
		assert( ecs.hasComponent('Position', ent1) === false );

		// Matching aspects

		var renderables = Aspect.all(['Graphics', 'Position']);
		assert( ecs.isMatchingAspect(renderables, ent0) );
		assert( !ecs.isMatchingAspect(renderables, ent1) );

		var fooOrPos = Aspect.any(['Foo', 'Position']);
		assert( ecs.isMatchingAspect(fooOrPos, ent0) );
		assert( ecs.isMatchingAspect(fooOrPos, ent1) );

		var empty = Aspect.all([]);
		assert( ecs.isMatchingAspect(fooOrPos, ent0) );
		assert( ecs.isMatchingAspect(fooOrPos, ent1) );

		// Removing entities

		ecs.removeEntity(ent0);
		assert( ecs.getComponent('Position', ent0) !== null );
        assert( !ecs.isentity(ent0) );
		ecs.removeEntity(ent1);
		assert( ecs.getComponent('Foo', ent1) !== null );
        ecs.doRemovals();
		assert( ecs.getComponent('Position', ent0) === null );
        assert( ecs.getComponent('Foo', ent1) === null );
        assert( !ecs.isentity(ent0) );

		/**
		*	SYSTEMS
		*/

		var TestSystem = (function(){
			function TestSystem() {
			}

			TestSystem.prototype = {
				constructor: TestSystem,

				aspects: {
					tests: Aspect.any(['Test1', 'Test2']),
					foobars: Aspect.all(['TestFoo', 'TestBar']),
					empty: Aspect.all(['NonExistingComponent']),
					notfound: Aspect.all(['TestThatShouldNeverBeFound'])
				},

				name: 'TestSystem',

				onInit: function(ecs) {
					this.ecs = ecs;
				},

				onUpdate: function(dt, nodes) {
					for (var i = 0; i < nodes.tests.length; ++i) {
						var test1 = this.ecs.getComponent('Test1', nodes.tests[i]);
						if (test1) test1._testVal = dt;
						var test2 = this.ecs.getComponent('Test2', nodes.tests[i]);
						if (test2) test2._testVal = dt;
					}
					for (var i = 0; i < nodes.foobars.length; ++i) {
						//console.log(nodes);
						//console.log(this.ecs.components);
						//console.log('Has Foo: ', this.ecs.hasComponent('TestFoo', nodes.foobars[i]));
						var foo = this.ecs.getComponent('TestFoo', nodes.foobars[i]);
						foo._testVal = dt;
						var bar = this.ecs.getComponent('TestBar', nodes.foobars[i]);
						bar._testVal = dt;
					}
					//console.log('Tests found: ', nodes.tests.length);
					//console.log('Foobars found: ', nodes.foobars.length);
					//console.log('Empty is empty: ', nodes.empty.length === 0 && nodes.empty.length === nodes.notfound.length);
				},

				onEntityAdded: function(entity_id) {
					//console.log('Entity added to test system: ', entity_id);
				},

				onEntityRemoved: function(entity_id) {
					//console.log('Entity removed from test system: ', entity_id);
				}
			};

			return TestSystem;
		})();


		// Init
		var testval = Math.floor(Math.random() * Math.pow(2, 16)).toString();
		var ecs = new ECS([ new TestSystem() ]);

		// Adding entities
		var t0 = ecs.buildEntity({Test1: {}, Test2: {}});
		var t1 = ecs.buildEntity({Test1: {}});
		var t2 = ecs.buildEntity({Test2: {}});

		var fb0 = ecs.buildEntity({TestFoo: {}, TestBar: {}});
		var f0 = ecs.buildEntity({TestFoo: {}});
		var b0 = ecs.buildEntity({TestBar: {}});
		var ft0 = ecs.buildEntity({TestFoo: {}, Test1: {}});

		// Updating

		function testSystemWithDt(dt) {
			ecs.update('TestSystem', dt);

			if (ecs.hasComponent('Test1', t0)) {
				assert( ecs.getComponent('Test1', t0)._testVal === dt );
			}
			if (ecs.hasComponent('Test2', t0)) {
				assert( ecs.getComponent('Test2', t0)._testVal === dt );
			}
			assert( ecs.getComponent('Test1', t1)._testVal === dt );
			assert( ecs.getComponent('Test2', t2)._testVal === dt );
			if (ecs.hasComponent('Test1', ft0)) {
				assert( ecs.getComponent('Test1', ft0)._testVal === dt );
			}

			assert( ecs.getComponent('TestFoo', fb0)._testVal === dt );
			assert( ecs.getComponent('TestBar', fb0)._testVal === dt );

			assert( ecs.getComponent('TestFoo', f0)._testVal == null );
			if (ecs.hasComponent('TestFoo', t0)) {
				assert( ecs.getComponent('TestFoo', ft0)._testVal == null );
			}
			assert( ecs.getComponent('TestBar', b0)._testVal == null );
		}

		testSystemWithDt(1);
		testSystemWithDt(100500);
		testSystemWithDt(333);
		testSystemWithDt(0);

		// Removing entities

		ecs.removeEntity(t0);
		ecs.removeEntity(ft0);
        ecs.doRemovals();

		testSystemWithDt(1);
		testSystemWithDt(100500);
		testSystemWithDt(333);
		testSystemWithDt(0);

		// Adding components to entities
		ecs.addComponent({_componentType: 'TestFoo'}, t1);
		ecs.addComponent({_componentType: 'TestBar'}, t1);
		testSystemWithDt(1);
		assert( ecs.getComponent('TestFoo', t1)._testVal === 1 );
		assert( ecs.getComponent('TestBar', t1)._testVal === 1 );

	}
    
    function testFsm() {
		/**
		*	Coroutine-like FSMs
		*/
        var coroutines = new FsmManager();
        
        function getMovementVector(ax, ay, bx, by) {
            var dx = bx - ax;
            var dy = by - ay;
            var magnitude = Math.sqrt(dx*dx + dy*dy);
            return {
                x: dx / magnitude,
                y: dy / magnitude
            };
        }

        function getMovementStep(obj, destination, velocity) {
            var vector = getMovementVector(obj.x, obj.y, destination.x, destination.y);
            var sign_x = Math.sign(vector.x);
            var sign_y = Math.sign(vector.y);
            var abs_movement_dx = Math.abs(vector.x * velocity);
            var abs_movement_dy = Math.abs(vector.y * velocity);
            var abs_dx = Math.abs(destination.x - obj.x);
            var abs_dy = Math.abs(destination.y - obj.y);
            return {
                x: Math.min(abs_movement_dx, abs_dx) * sign_x,
                y: Math.min(abs_movement_dy, abs_dy) * sign_y
            };
        }

        var moveTo = coroutines.wrap(Fsm({
            enter: function(obj, x, y, velocity) {
                this.velocity = velocity;
                this.obj = obj;
                this.destination = {x: x, y: y};
                //console.log('Object movement begin...');
                return this.states.update;
            },
            update: function(dt) {
                //console.log(this);
                var step = getMovementStep(this.obj, this.destination, this.velocity);
                this.obj.x += step.x * dt;
                this.obj.y += step.y * dt;
                //console.log('Moving object by ', step, ' | Obj: ', this.obj);
                if (this.obj.x === this.destination.x && this.obj.y === this.destination.y) {
                    return this.states.exit;
                }
                return this.states.update;
            },
            exit: function() {
                //console.log('Object successfully moved to ', this.destination);
            }
        }));
        
        var obj = {x: 0, y: 0};
        moveTo(obj, 50, 100, 10);
        coroutines.update(1);
        assert(obj.x > 0);
        assert(obj.x < 50);
        for (var i = 0; i < 20; ++i) {
            coroutines.update(1);
        }
        assert(Math.abs(obj.x - 50) < 0.0001);
        assert(Math.abs(obj.y - 100) < 0.0001);
    }

	try {
		testEcs();
        testFsm();
	} catch(e) {
		console.log('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!');
		console.log('!                   TESTS FAILED                   !')
		console.log('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!');
	}

})();