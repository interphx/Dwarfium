var GravitySystem = System.extend('GravitySystem',
    function(gravity) {
        this.setGravity(gravity);
    },
    {
        aspects: {
            fallables: Aspect.all(['Transform2d', 'Gravity', 'RigidBody'])
        },
        onUpdate: function(dt, nodes) {
            for (var i = 0; i < nodes.fallables.length; ++i) {
                var fallable = ecs.getAspect(this.aspects.fallables, nodes.fallables[i]); 
                fallable.RigidBody.addAcceleration(this.gravity);
            }
        },
        setGravity: function(gravity) {
            if (typeof gravity === 'number') gravity = {x: 0.0, y: gravity};
            if (!gravity) gravity = {x: 0.0, y: 40};
            this.gravity = gravity;
        }
    }
);

BUILTIN_COMPONENTS['Gravity'] = {};