var canvas = document.getElementById('display');
var ctx = canvas.getContext('2d');

// Людям, которые придумали NaN, следует разбить ебало
Object.defineProperty(Object.prototype, 'originalValueOf', {
    value: Object.prototype.valueOf,
    enumerable: false
});
Object.prototype.valueOf = function() {
  if (typeof this !== 'number') {
    throw new Error('Object is not a Number');
  }
  return this.originalValueOf();
}

var input = new KeyboardInputSystem();

var ecs = new ECS([
    new Box2dPhysicsSystem(),
	new Canvas2dRenderingSystem(ctx),
	new GravitySystem({x: 0, y: 40.0}),
	new GroundTrackingSystem(),
    input,
    new MovementSystem(input),
    new JumpingSystem(input),
    new CollectibleSystem()
]);

var comps = new ComponentManager();
var prefabs = new PrefabManager(ecs, comps);

for (var comp in BUILTIN_COMPONENTS) {
	if (!BUILTIN_COMPONENTS.hasOwnProperty(comp)) continue;
	comps.add(comp, BUILTIN_COMPONENTS[comp]);
}

/*****************************************************************************/
'use strict';

prefabs.add('Dwarf', {
	Transform2d: {pos: {x: 0, y: 0.0}},
	SimpleGraphics: {
		color: 'white',
		size: {x: 2, y: 2},
        shape: 'circle'
	},
	RigidBody: {
		type: 'dynamic',
		size: {x: 2, y: 2},
        shape: 'circle',
        gravityScale: 1,
        
        friction: 1
	},
    Gravity: {},
    Movement: {
        speed: 10,
        airSpeed: 5
    },
    Jumping: {},
    GroundSensor: {
        size: {
            x: 1.9,
            y: 0.2
        },
        pos: {
            x: 0,
            y: -1
        }
    },
    Collector: {}
});

prefabs.add('Platform', {
	Transform2d: {},
	SimpleGraphics: {
		color: 'blue',
		size: {x: 5, y: 3}
	},
	RigidBody: {
		type: 'static',
		size: {x: 5, y: 3}
	}
});

prefabs.add('StoneBlock', {
	Transform2d: {},
	SimpleGraphics: {
		color: 'grey',
		size: {x: 4, y: 2}
	},
	RigidBody: {
		type: 'dynamic',
		size: {x: 4, y: 2}
	},
    Gravity: {}
});

prefabs.add('Camera', {
	Transform2d:{},
	Camera2d: {}
});

prefabs.add('Coin', {
	Transform2d: {},
	Collectible: {},
    SimpleGraphics: {
        color: 'yellow',
        shape: 'circle',
        size: {x: 0.3, y: 0.3}
    },
    RigidBody: {
        type: 'static',
        isSensor: true,
        size: {x: 0.3, y: 0.3}
    }
});

//////////////////////////////////////////
var cam = prefabs.create('Camera', {
    Camera2d: {
        viewSize: {x: 40.0, y: 30.0}
    },
    Transform2d: {
        pos: {x: 0, y: 0}
    }
});

var dwarf = prefabs.create('Dwarf', {
	Transform2d: {
		pos: {x: -1.01, y: 20.0}
	}
});

var platform = prefabs.create('Platform', {
	Transform2d: {
		pos: {x: 0, y: 0}
	}
});

var center_marker = prefabs.create('Platform', {
	Transform2d: {
		pos: {x: 0, y: 0}
	},
    SimpleGraphics: {
        size: {x: 2, y: 2},
        color: 'red'
    }
});


var platform2 = prefabs.create('Platform', {
	Transform2d: {
		pos: {x: 5, y: 2}
	},
    RigidBody: {
        size: {y: 5}
    },
    SimpleGraphics: {
        size: {y: 5}
    }
});

/*
for (var i = 0; i < 5; ++i) {
    prefabs.create('Coin', {
        Transform2d: {
            pos: {x: 22 + i * 4, y: 36}
        }
    });
    prefabs.create('Coin', {
        Transform2d: {
            pos: {x: 72 + i * 4, y: 46}
        }
    });
    prefabs.create('Coin', {
        Transform2d: {
            pos: {x: 42 + i * 4, y: 56}
        }
    });
}*/

var testPushableBody = prefabs.create('StoneBlock', {
    Transform2d: {
        pos: {x: 7, y: 4}
    }
});



/*****************************************************************************/



var game = new GameUpdater(30, 60, {
	preUpdate: function(dt) {
        if (input.isPressed(KeyCodes.G, 1000)) {
            alert('!');
        }
    },
	onUpdate: function(dt) {
		//ecs.update('GravitySystem', dt);
        ecs.update('Box2dPhysicsSystem', dt);
        
        ecs.update('KeyboardInputSystem', dt);
        ecs.update('MovementSystem', dt);
        ecs.update('JumpingSystem', dt);
        
		
        ecs.update('GroundTrackingSystem', dt);
        ecs.update('CollectibleSystem', dt);
        ecs.doRemovals();
	},
	postUpdate: function(dt) {
		ecs.update('Canvas2dRenderingSystem', dt);
	}
});

setTimeout(function() {
    game.start();
}, 2000);
