var canvas = document.getElementById('display');
var ctx = canvas.getContext('2d');
var scripts = new ScriptManager();

var PongAISystem = (function() {
   function PongAISystem() {
       System.call(this);
   }
   
   PongAISystem.prototype = Object.create(System.prototype);
   PongAISystem.prototype.constructor = PongAISystem;
   PongAISystem.prototype.aspects = {
        paddles: Aspect.all(['PongAI', 'Transform2d', 'MovementControl', 'RectCollider']),
        balls: Aspect.all(['Ball', 'Transform2d', 'RectCollider'])
   };

   PongAISystem.prototype.onUpdate = function(dt, nodes) {
        if (!nodes.balls[0]) return;
        var ball = ecs.getAspect(this.aspects.balls, nodes.balls[0]);
        
        for (var i = 0; i < nodes.paddles.length; ++i) {
            var paddle = ecs.getAspect(this.aspects.paddles, nodes.paddles[i]); 
            // TODO: Это блять надо через CollisionSystem.getAabb(...).getCenter() получать, а не всякую еботню воротить
            var halfPaddleWidth = paddle.RectCollider.size.x / 2.0;
            var paddleCenter = paddle.Transform2d.pos.x + halfPaddleWidth;
            var ballCenter = ball.Transform2d.pos.x + ball.RectCollider.size.x / 2.0;
            var dx = ballCenter - paddleCenter;
            var dx_coeff = Util.Numeric.clampAbs(dx, 0.0, 1.0);
            
            var x_acc = Util.Numeric.clampAbs(Math.sign(dx) * 2.0, 0.0, 1.0);
                        
            paddle.MovementControl.acceleration.x = x_acc;
            if (Math.abs(ballCenter - paddleCenter) <= halfPaddleWidth) {
               paddle.MovementControl.velocity.x = Util.Numeric.clampAbs(paddle.MovementControl.velocity.x, 0.0, 0.5);
            }
            if (!Util.Numeric.isFiniteNumber(x_acc)) {
                alert('PIZDEC_3: ' + dx + ', vel: ' + x_vel);
                console.log(paddle);
                game.stop();
            }
        }
   };
   
    return PongAISystem;
   
})();

var ecs = new ECS([
    new PongAISystem(),
	new Canvas2dRenderingSystem(ctx),
	new SimpleMovementSystem(),
	new CollisionResolvingSystem(scripts, {x: 0.0, y: 0.0, w: 1.0, h: 1.0})
]);
var comps = new ComponentManager();
var prefabs = new PrefabManager(ecs);

for (var comp in BUILTIN_COMPONENTS) {
	if (!BUILTIN_COMPONENTS.hasOwnProperty(comp)) continue;
	comps.add(comp, BUILTIN_COMPONENTS[comp]);
}

/*****************************************************************************/
'use strict';

var scores = [0, 0];

function initBall(ball) {
	ball = ecs.getComponents(['Transform2d', 'MovementControl'], ball);
	var angle = Util.Random.int(4) * 2 * Math.PI / 4.0 + Math.PI / 4.0;
	ball.MovementControl.velocity.x = 0.5 * Math.cos(angle);
	ball.MovementControl.velocity.y = 0.5 * Math.sin(angle);
	ball.Transform2d.pos.x = 0.485;
	ball.Transform2d.pos.y = 0.485;
}

function hitGoal(loser) {
	scores[scores.length - loser - 1]++;
	console.log('New score: ', scores);
	initBall(ball);
}

comps.add('Owner', {
	value: null
});

comps.add('Ball', {});
comps.add('PongAI', {});

prefabs.add('Paddle', {
	Transform2d: comps.get('Transform2d'),
	SimpleGraphics: comps.get('SimpleGraphics', {
		color: 'white',
		size: {x: 0.2, y: 0.05}
	}),
	RectCollider: comps.get('RectCollider', {
		type: 'kinematic',
		size: {x: 0.2, y: 0.05},
		onCollisionEnter: function(ball) {
			var movement = ecs.getComponent('MovementControl', ball);
			if (movement) movement.velocity.y *= -1;
		}
	}),
	MovementControl: comps.get('MovementControl')
});

prefabs.add('WallVertical', {
	Transform2d: comps.get('Transform2d'),
	SimpleGraphics: comps.get('SimpleGraphics', {
		color: 'blue',
		size: {x: 0.01, y: 1.0}
	}),
	RectCollider: comps.get('RectCollider', {
		type: 'static',
		size: {x: 0.01, y: 1.0},
		onCollisionEnter: function(ball) {
			var movement = ecs.getComponent('MovementControl', ball);
			if (movement) movement.velocity.x *= -1;
		}
	})
});

prefabs.add('Goal', {
	Transform2d: comps.get('Transform2d'),
	Owner: comps.get('Owner'),
	SimpleGraphics: comps.get('SimpleGraphics', {
		color: 'blue',
		size: {x: 1.0, y: 0.01}
	}),
	RectCollider: comps.get('RectCollider', {
		type: 'static',
		size: {x: 1.0, y: 0.01},
		onCollisionEnter: function(ball) {
			var owner = ecs.getComponent('Owner', this).value;
			hitGoal(owner);
		}
	})
});

prefabs.add('Ball', {
    Ball: {},
	Transform2d: comps.get('Transform2d'),
	SimpleGraphics: comps.get('SimpleGraphics', {
		shape: 'circle',
		color: 'white',
		size: {x: 0.03, y: 0.03}
	}),
	RectCollider: comps.get('RectCollider', {
		type: 'dynamic',
		size: {x: 0.03, y: 0.03}
	}),
	MovementControl: comps.get('MovementControl')
});

prefabs.add('Camera', {
	Transform2d: comps.get('Transform2d'),
	Camera2d: comps.get('Camera2d')
});


var cam = prefabs.create('Camera', {
	MovementControl: comps.get('MovementControl', {
		acceleration: {x: 0.0, y: 0.0}
	})
});

var paddle1 = prefabs.create('Paddle', {
	Transform2d: {
		pos: {x: 0.4, y: 0.9}
	}
});

var paddle2 = prefabs.create('Paddle', {
	Transform2d: {
		pos: {x: 0.4, y: 0.05}
	},
    PongAI: comps.get('PongAI')
});

var ball = prefabs.create('Ball', {
	Transform2d: {
		pos: {x: 0.485, y: 0.485}
	}
});
initBall(ball);

var w1 = prefabs.create('WallVertical', {
	Transform2d: {
		pos: {x: 0.0, y: 0.0}
	}
});

var w2 = prefabs.create('WallVertical', {
	Transform2d: {
		pos: {x: 0.99, y: 0.0}
	}
});

var goal0 = prefabs.create('Goal', {
	Owner: { value: 0 },
	Transform2d: {
		pos: {x: 0.0, y: 0.99}
	}
});

var goal1 = prefabs.create('Goal', {
	Owner: { value: 1 },
	Transform2d: {
		pos: {x: 0.0, y: 0.0}
	}
});



$(canvas).on('pointermove', function(e) {
	var transform = ecs.getComponent('Transform2d', paddle1);
	var body = ecs.getComponent('RectCollider', paddle1);
	var movement = ecs.getComponent('MovementControl', paddle1);

	var world_x = e.clientX / canvas.width;
    var paddle_center_x = transform.pos.x + body.size.x / 2.0;
    var dx = paddle_center_x - world_x;
    
    if (Math.abs(paddle_center_x - world_x) < body.size.x / 10.0) {
        movement.velocity.x = 0.0;
        movement.acceleration.x = 0.0; 
    } else if (Math.abs(paddle_center_x - world_x) < body.size.x / 2.0) {
        movement.velocity.x = Util.Numeric.clampAbs(movement.velocity.x, 0, dx);
        movement.acceleration.x = 0.0;
    } else {
        movement.acceleration.x = Math.sign(world_x - paddle_center_x) * 2.0;
        //movement.velocity.x = Math.sign(world_x - paddle_center_x);
    }
	//transform.pos.y = world_y;
});

/*****************************************************************************/



var game = new Game(30, 60, {
	preUpdate: function(dt) {},
	onUpdate: function(dt) {
		ecs.update('SimpleMovementSystem', dt);
		ecs.update('CollisionResolvingSystem', dt);
		ecs.update('PongAISystem', dt);
	},
	postUpdate: function(dt) {
		ecs.update('Canvas2dRenderingSystem', dt);
	}
});

game.start();
