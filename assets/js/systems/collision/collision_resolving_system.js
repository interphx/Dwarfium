var CollisionResolvingSystem = System.extend('CollisionResolvingSystem',
    function(worldBounds) {
        this.worldBounds = worldBounds;
    },
    {
        aspects: {
            colliders: Aspect.all(['Transform2d', 'PolygonCollider'])
        },
        resolveCollision: function(collision) {
            if (collision.isTrigger) return;
            var a = ecs.getAspect(this.aspects.colliders, collision.a);
            var b = ecs.getAspect(this.aspects.colliders, collision.b);
            
            var resolving_vector = collision.overlapVector.clone();
            var resolving_coeff, entities_to_move;
            // Dynamic bodies are moved, kinematic and static are not affected.
            
            if (a.PolygonCollider.type === 'dynamic' && b.PolygonCollider.type !== 'dynamic') {
                // Move only A
                entities_to_move = [a];
            } else if (b.PolygonCollider.type === 'dynamic' && a.PolygonCollider.type !== 'dynamic') {
                // Move only B
                
                // collision.overlapVector moves A out of B.
                // We need to invert it if B is to be moved out of A.
                resolving_vector.invert();
                entities_to_move = [b];
            } else if (a.PolygonCollider.type === 'dynamic' && b.PolygonCollider.type === 'dynamic') {
                // Move both colliders by half
                resolving_vector.div(2);
                entities_to_move = [a, b];
            } else {
                return;
            }
            
            for (var i = 0; i < entities_to_move.length; ++i) {
                var transform = entities_to_move[i].Transform2d;
                transform.pos.x -= resolving_vector.x;
                transform.pos.y -= resolving_vector.y;
                // If we move both bodies, second one must be moved in opposite direction
                resolving_vector.invert();
            }
        },
        clampToWorldBounds: function(obj) {
            if (!this.worldBounds || obj.PolygonCollider.type === 'static') return;
            obj.Transform2d.pos.x = Util.Numeric.clamp(
                obj.Transform2d.pos.x,
                this.worldBounds.x,
                this.worldBounds.x + this.worldBounds.w
            );
            obj.Transform2d.pos.y = Util.Numeric.clamp(
                obj.Transform2d.pos.y,
                this.worldBounds.y,
                this.worldBounds.y + this.worldBounds.h
            );
        },
        onUpdate: function(dt, nodes) {
            for (var i = 0; i < nodes.colliders.length; ++i) {
                this.clampToWorldBounds(ecs.getAspect(this.aspects.colliders, nodes.colliders[i]));
            }
        },
        onCollisionEnter: function(collision) {
            this.resolveCollision(collision);
        },
        onCollisionStay: function(collision) {
            this.resolveCollision(collision);
        }
    }
);