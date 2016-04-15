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

var Coroutine = {
    moveTo: coroutines.wrap(Fsm({
        enter: function(obj, x, y, velocity) {
            this.velocity = velocity;
            this.obj = obj;
            this.destination = {x: x, y: y};
            console.log('Object movement begin...');
            return this.states.update;
        },
        update: function(dt) {
            console.log(this);
            var step = getMovementStep(this.obj, this.destination, this.velocity);
            this.obj.x += step.x * dt;
            this.obj.y += step.y * dt;
            console.log('Moving object by ', step, ' | Obj: ', this.obj);
            if (this.obj.x === this.destination.x && this.obj.y === this.destination.y) {
                return this.states.exit;
            }
            return this.states.update;
        },
        exit: function() {
            console.log('Object successfully moved to ', this.destination);
        }
    }))
};