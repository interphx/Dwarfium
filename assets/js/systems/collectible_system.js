var CollectibleSystem = System.extend('CollectibleSystem',
    function () {
    },
    {
        aspects: {
            //collectables: Aspect.all([...]),
            //collectors: Aspect.all([...]),
        },
        onUpdate: function(dt, nodes) {
        },
        onCollisionEnter: function(collision) {
            var a = this.ecs.getAllComponents(collision.a);
            var b = this.ecs.getAllComponents(collision.b);
            if (a.Collector && b.Collectible) {
                a.Collector.collect(b.Collectible.type, 1);
                this.ecs.removeEntity(collision.b);
            }
            if (b.Collector && a.Collectible) {
                b.Collector.collect(a.Collectible.type, 1);
                this.ecs.removeEntity(collision.a);
            }
        }
    }
);

BUILTIN_COMPONENTS['Collectible'] = {
    type: 'coin'
};

BUILTIN_COMPONENTS['Collector'] = {
    contents: {},
    set: function(type, amount) {
        this.contents[type] = this.contents[type] || 0;
        this.contents[type] = amount;
    },
    get: function(type) {
        this.contents[type] = this.contents[type] || 0;
        return this.contents[type];
    },
    collect: function(type, amount) {
        this.set(type, this.get(type) + amount);
    }
};