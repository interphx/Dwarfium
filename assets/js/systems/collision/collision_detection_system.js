var CollisionDetectionSystem = System.extend('CollisionDetectionSystem',
    function() {
        this.col_response_buffer = new SAT.Response();
        this.entitiesTouching = {};
    },
    {
        aspects: {
            colliders: Aspect.all(['Transform2d', 'PolygonCollider'])
        },
        addTouching: function(entity_a, entity_b) {
            var touching_a = this.ecs.getComponent('PolygonCollider', entity_a).touchingEntities;
            var touching_b = this.ecs.getComponent('PolygonCollider', entity_b).touchingEntities;
            if (this.entitiesTouching[entity_a] === void 0) {
                this.entitiesTouching[entity_a] = [entity_b];
            } else {
                if (this.entitiesTouching[entity_a].indexOf(entity_b) < 0) {
                    this.entitiesTouching[entity_a].push(entity_b);
                }
            }
            
            if (this.entitiesTouching[entity_b] === void 0) {
                this.entitiesTouching[entity_b] = [entity_a];
            } else {
                if (this.entitiesTouching[entity_b].indexOf(entity_a) < 0) {
                    this.entitiesTouching[entity_b].push(entity_a);
                }
            }
            var idx_b_in_a = touching_a.indexOf(entity_b);
            var idx_a_in_b = touching_b.indexOf(entity_a);
            if (idx_b_in_a < 0) touching_a.push(entity_b);
            if (idx_a_in_b < 0) touching_a.push(entity_a);
        },
        removeTouching: function(entity_a, entity_b) {
            var touching_a = this.ecs.getComponent('PolygonCollider', entity_a).touchingEntities;
            var touching_b = this.ecs.getComponent('PolygonCollider', entity_b).touchingEntities;
            var list_a = this.entitiesTouching[entity_a];
            var list_b = this.entitiesTouching[entity_b];
            if (list_a) {
                var idx = list_a.indexOf(entity_b);
                if (idx >= 0) {
                    list_a.splice(idx, 1);
                }
            }
            if (list_b) {
                var idx = list_b.indexOf(entity_a);
                if (idx >= 0) {
                    list_b.splice(idx, 1);
                }
            }
            var idx_b_in_a = touching_a.indexOf(entity_b);
            var idx_a_in_b = touching_b.indexOf(entity_a);
            if (idx_b_in_a >= 0) touching_a.splice(idx_b_in_a, 1);
            if (idx_a_in_b >=0) touching_a.splice(idx_a_in_b, 1);
        },
        removeAllTouchesFor(entity_id) {
            var list = this.entitiesTouching[entity_id];
            if (!list) return;
            for (var i = 0; i < list.length; ++i) {
                var touching = list[i];
                if (!this.ecs.isEntity(touching)) continue;
                var touching_collider = this.ecs.getComponent('PolygonCollider', touching);
                var idx = touching_collider.touchingEntities.indexOf(entity_id);
                if (idx >= 0) {
                    touching_collider.touchingEntities.splice(idx, 1);
                }
                var global_list = this.entitiesTouching[touching];
                if (global_list) {
                    var idx = global_list.indexOf(entity_id);
                    if (idx >= 0) {
                        global_list.splice(idx, 1);
                    }
                }
            }
        },
        getCollision: function(aspect_a, aspect_b) {
            var sat_poly_a = aspect_a.PolygonCollider.satPolygon;
            var sat_poly_b = aspect_b.PolygonCollider.satPolygon;
            if (aspect_a.PolygonCollider.type !== 'dynamic' && aspect_b.PolygonCollider.type !== 'dynamic') return null;
            // TODO: This will cause problems at some point;
            // Make synchronisation of all important values implicit, declarative and automatic
            sat_poly_a.pos.x = aspect_a.Transform2d.pos.x;
            sat_poly_a.pos.y = aspect_a.Transform2d.pos.y;
            sat_poly_b.pos.x = aspect_b.Transform2d.pos.x;
            sat_poly_b.pos.y = aspect_b.Transform2d.pos.y;
            
            var collision_response = this.col_response_buffer;
            collision_response.clear();
            if (SAT.testPolygonPolygon(sat_poly_a, sat_poly_b, collision_response)) {
                //console.log('RESPONSE: ', aspect_a.Transform2d.pos.y, sat_poly_a.pos.y, collision_response.overlapV.y);
                return collision_response;
            }
            return null;
        },
        collidersHaveSameGroup(collider_a, collider_b) {
            var outer_list = collider_a.groups.length < collider_b.groups.length ? collider_a.groups : collider_b.groups;
            var inner_list = outer_list === collider_a.groups ? collider_b.groups : collider_a.groups;
            for (var i = 0; i < outer_list.length; ++i) {
                if (inner_list.indexOf(outer_list[i]) >= 0) return true;
            }
            return false;
        },
        onUpdate: function(dt, nodes) {
            
            for (var i = 0; i < nodes.colliders.length; ++i) {
                var entity_a = nodes.colliders[i];
                var aspect_a = this.ecs.getAspect(this.aspects.colliders, entity_a);

                for (var j = i + 1; j < nodes.colliders.length; ++j) {
                    //if (i === j) continue;
                    var entity_b = nodes.colliders[j];
                    var aspect_b = this.ecs.getAspect(this.aspects.colliders, entity_b);
                    
                    var collider_a = aspect_a.PolygonCollider;
                    var collider_b = aspect_b.PolygonCollider;
                    
                    if (collider_a.type === 'static' && collider_b.type === 'static') continue;
                    if (!this.collidersHaveSameGroup(collider_a, collider_b)) continue;
                    var collision = this.getCollision(aspect_a, aspect_b);
                    
                    // TODO: Nothing will work for collisions not involving 'dynamic' colliders
                    if (collision) {
                        var idx_b_in_a = collider_a.touchingEntities.indexOf(entity_b);
                        var idx_a_in_b = collider_b.touchingEntities.indexOf(entity_a);
                        if (idx_b_in_a < 0 && idx_a_in_b < 0) {
                            this.addTouching(entity_a, entity_b);
                            console.log('Collided: ', entity_a, entity_b);
                            this.eventSource.trigger('onCollisionEnter', [{
                                a: entity_a, 
                                b: entity_b,
                                colliderA: collider_a,
                                colliderB: collider_b,
                                aInB: collision.aInB,
                                bInA: collision.bInA,
                                overlapVector: new Util.Geometry.Vector2(collision.overlapV.x, collision.overlapV.y),
                                isTrigger: collider_a.isTrigger || collider_b.isTrigger
                            }]);
                        } else {
                            this.eventSource.trigger('onCollisionStay', [{
                                a: entity_a, 
                                b: entity_b,
                                colliderA: collider_a,
                                colliderB: collider_b,
                                aInB: collision.aInB,
                                bInA: collision.bInA,
                                overlapVector: new Util.Geometry.Vector2(collision.overlapV.x, collision.overlapV.y),
                                isTrigger: collider_a.isTrigger || collider_b.isTrigger
                            }]);
                        }
                    } else {
                        var idx_b_in_a = collider_a.touchingEntities.indexOf(entity_b);
                        var idx_a_in_b = collider_b.touchingEntities.indexOf(entity_a);
                        if (idx_b_in_a >= 0 || idx_a_in_b >= 0) {
                            this.eventSource.trigger('onCollisionExit', [{
                                a: entity_a, 
                                b: entity_b,
                                colliderA: collider_a,
                                colliderB: collider_b,
                                isTrigger: collider_a.isTrigger || collider_b.isTrigger
                            }]);
                        }
                        this.removeTouching(entity_a, entity_b);
                    }

                }
            }
        },
        onEntityRemoved: function(entity_id, aspect) {
            this.removeAllTouchesFor(entity_id);
        }
    }
);

// TODO: Make it a polygon, not just a box 
BUILTIN_COMPONENTS['PolygonCollider'] = {
    onInit: function() {
        /*if (this.satPolygon) {
            throw new Error('HORRIBLE FUCKING BUG AGAIN');
        }*/
        this.satPolygon = new SAT.Box(new SAT.Vector(0, 0), this.size.x, this.size.y).toPolygon();
        //console.log(this, this.satPolygon);
    },
    // TODO
    getAABB: function() {
        var points = this.satPolygon.calcPoints;
        var len = points.length;
        var xMin = points[0]["x"];
        var yMin = points[0]["y"];
        var xMax = points[0]["x"];
        var yMax = points[0]["y"];
        for (var i = 1; i < len; i++) {
            var point = points[i];
            if (point["x"] < xMin) {
                xMin = point["x"];
            }
            else if (point["x"] > xMax) {
                xMax = point["x"];
            }
            if (point["y"] < yMin) {
                yMin = point["y"];
            }
            else if (point["y"] > yMax) {
                yMax = point["y"];
            }
        }
        var new_pos = this.satPolygon.pos.clone().add(new SAT.Vector(xMin, yMin));
        return {
            x: new_pos.x,
            y: new_pos.y,
            w: xMax - xMin,
            h: yMax - yMin
        };
    },
    groups: ['default'],
    satPolygon: null,
    size: {x: 1.0, y: 1.0},
    touchingEntities: [],
    isTrigger: false,
    type: 'static'
};