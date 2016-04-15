var PrefabManager = (function(){
	function PrefabManager(ecs, component_manager) {
		this.ecs = ecs;
        this.componentManager = component_manager;
		this.prefabs = {};
	}

	PrefabManager.prototype = {
		constructor: PrefabManager,
		get: function(prefab_name, customization) {
			if (this.prefabs[prefab_name] === void 0) {
				throw new Error('No prefab with name ' + prefab_name.toString());
			}
            
            // This logic previously was in #add and was a source of major bug.
            // Never try to initialize component templates, initialize components only when instantiating (here).
            var result = Util.Object.merged([this.prefabs[prefab_name], customization || {}]);
            for (var component_name in result) {
                if (!result.hasOwnProperty(component_name)) continue;
                result[component_name] = this.componentManager.get(component_name, result[component_name]);
            }
            
			return result;
		},
		create: function(prefab_name, customization) {
			return this.ecs.buildEntity(this.get(prefab_name, customization));
		},
		add: function(prefab_name, prefab_data) {
			if (this.prefabs[prefab_name] !== void 0) {
				throw new Error('Prefab with name "' + prefab_name + '" already exists')
			}
            
			this.prefabs[prefab_name] = prefab_data;
		},
		remove: function(prefab_name) {
			this.prefabs[prefab_name] = void 0;
		}
	};

	return PrefabManager;
})();