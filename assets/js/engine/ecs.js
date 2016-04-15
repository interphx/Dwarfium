var ECS = (function(){
	var IdGenerator = (function(){
		function IdGenerator() {
			this.nextId = 0;
		}
	
		IdGenerator.prototype = {
			constructor: IdGenerator,
			next: function() {
				return this.nextId++;
			},
			setLast: function(last) {
				this.next = last + 1;
			}
		};
	
		return IdGenerator;
	})();


	var Component = (function(){
		function Component(state) {
			if (state == null) { state = {}; }
			
			$.extend(true, this, state);
			
			if (this.onInit != null) { this.onInit(); }
		}
	
		Component.prototype = {
			constructor: Component
		};
	
		return Component;
	})();


	function ECS(systems) {
		this.entityLists = {};
        this.toRemove = [];
        this.existingEntities = {};
		this.components = {};
		this.systems = systems || [];
		this.idGen = new IdGenerator();
		for (var i = 0; i < this.systems.length; ++i) {
			var system = this.systems[i];
			this.entityLists[system.name] = {};
			for (var list in system.aspects) {
				if (!system.aspects.hasOwnProperty(list)) continue;
				this.entityLists[system.name][list] = [];
			}
			if (typeof system.onInit === 'function') {
				system.onInit(this);
			}
            this.registerNewSystemEvents(system);
		}
	}

	ECS.prototype = {
		constructor: ECS,
        
        registerNewSystemEvents: function(new_system) {
            console.log('Reg new sys events: ', new_system.name);
            for (var i = 0; i < this.systems.length; ++i) {
                var system = this.systems[i];
                // This is dumb. It must surely be possible to subscribe to own events.
                //if (system === new_system) continue;
                new_system.bindEvents(system);
                // Absence of this prevents binding same callback multiple times (good thing),
                // but does not allow to add new systems in non-RAII way (not so good thing)
                //system.bindEvents(new_system);
            }
        },
        
        isEntity: function(entity_id) {
            return !!this.existingEntities[entity_id];
        },

		hasComponent: function(component_name, entity_id) {
			return !!this.components[component_name] && !!this.components[component_name][entity_id];
		},

		getComponent: typeCheckedFn(['String', 'Number'], function(component_name, entity_id) {
			if (!this.components[component_name]) {
				return null;
			}
			return this.components[component_name][entity_id] || null;
		}),

		getComponents: function(component_names, entity_id) {
			var result = {};
			for (var i = 0; i < component_names.length; ++i) {
				result[component_names[i]] = this.getComponent(component_names[i], entity_id);
			}
			return result;
		},

		getAspect: function(aspect, entity_id) {
			return this.getComponents(aspect.components, entity_id);
		},
        
        getAllComponents: function(entity_id) {
            var result = {};
            var component_names = Object.keys(this.components);
            for (var i = 0; i < component_names.length; ++i) {
                if (!this.hasComponent(component_names[i], entity_id)) continue;
                result[component_names[i]] = this.getComponent(component_names[i], entity_id);
            }
            return result;
        },

		getComponentNames: function(entity_id)  {
			var result = [];
			for (var component_name in this.components) {
				if (!this.components.hasOwnProperty(component_name)) continue;
				if (this.components[component_name][entity_id]) {
					result.push(component_name);
				}
			}
			return result;
		},

		isMatchingAspect: function(aspect, entity_id) {
			switch (aspect.relation) {
				case 'all':
					for (var i = 0; i < aspect.components.length; ++i) {
						if (!this.hasComponent(aspect.components[i], entity_id)) {
							return false;
						}						
					}
					return true;
					break;
				case 'any':
					for (var i = 0; i < aspect.components.length; ++i) {
						if (this.hasComponent(aspect.components[i], entity_id)) {
							return true;
						}						
					}
					return false;
					break;
				default:
					throw new Error('Invalid aspect relation: ' + aspect.relation.toString());
			}
		},
        
        getSystem: function(system_name) {
            for (var i = 0; i < this.systems.length; ++i) {
                if (this.systems[i].name !== system_name) continue;
                return this.systems[i];
            }
            throw new Error('No system named "' + system_name.toString() + '"');
        },
		
		// TODO: Performance for many entities?
		updateSystemsForEntity: function(entity_id) {
			for (var i = 0; i < this.systems.length; ++i) {
				var system = this.systems[i];
				for (var list in system.aspects) {
					if (!system.aspects.hasOwnProperty(list)) continue;
					var aspect = system.aspects[list];
					var is_matching = this.isMatchingAspect(aspect, entity_id);
					var watching_idx = this.entityLists[system.name][list].indexOf(entity_id);
					var is_watched = watching_idx >= 0;
					if (is_matching && !is_watched) {
						this.entityLists[system.name][list].push(entity_id);
                        system.onEntityAdded(entity_id, aspect);
					}
					if (!is_matching && is_watched) {
						this.entityLists[system.name][list].splice(watching_idx, 1);
                        system.onEntityRemoved(entity_id, aspect);
					}
				}
			}
		},

		addComponent: function(component, entity_id) {
			if (!this.components[component._componentType]) {
				this.components[component._componentType] = {};
			}

			this.components[component._componentType][entity_id] = component;
			this.updateSystemsForEntity(entity_id);
		},

		removeComponent: function(component_name, entity_id, update_systems) {
			if (!this.hasComponent(component_name, entity_id)) return;
			this.components[component_name][entity_id] = void 0;
            if (update_systems) {
                this.updateSystemsForEntity(entity_id);
            }
		},

		createEntity: function() {
			var entity_id = this.idGen.next();
            this.existingEntities[entity_id] = true;
            return entity_id;
		},
        
        doRemovals: function() {
            for (var i = this.toRemove.length - 1; i >= 0; --i) {
                var entity_id = this.toRemove[i];
                var component_names = this.getComponentNames(entity_id);
                for (var i = 0; i < component_names.length; ++i) {
                    this.removeComponent(component_names[i], entity_id, false);
                }
                this.updateSystemsForEntity(entity_id);
                this.toRemove.splice(i, 1);
            }
        },

        // TODO: Document that ths schedules, not removes immediately
		removeEntity: function(entity_id) {
            if (this.toRemove.indexOf(entity_id) < 0) {
                this.toRemove.push(entity_id);
            }
            if (this.existingEntities[entity_id]) {
                this.existingEntities[entity_id] = void 0;
            }
		},

		buildEntity: function(state) {
			state = Util.Object.clone(state || {});
			var entity_id = this.createEntity();
			for (var component_name in state) {
				if (!state.hasOwnProperty(component_name)) continue;
				var component_state = state[component_name];
				var component = new Component(component_state);
				if (!component._componentType) {
					component._componentType = component_name;
				}
				this.addComponent(component, entity_id);
			}
			return entity_id;
		},


		// TODO: Powerful nice update strategies
		update: function(system_name, dt) {
            var system = this.getSystem(system_name);
            //try {
                system.onUpdate(dt, this.entityLists[system_name]);
            //} catch(e) {
            //    console.log('SYSTEM UPDATE FAIL: ' + system.name.toString());
            //    throw e;
            //}
		}
	};

	ECS.Component = Component;

	return ECS;
})();