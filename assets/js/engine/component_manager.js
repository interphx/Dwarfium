var ComponentManager = (function(){
	function ComponentManager() {
		this.components = [];
	}

	ComponentManager.prototype = {
		constructor: ComponentManager,
		get: function(component_name, customization) {
            // TODO: If we delete with void 0, will this even work?
			if (this.components[component_name] === void 0) {
				throw new Error('No component with name ' + component_name.toString());
			}
			var result = Util.Object.merged([this.components[component_name], customization || {}]);
			if (result.onInit) {
				result.onInit();
			}
			return result;
		},
		add: function(component_name, component_data) {
			if (this.components[component_name] !== void 0) {
				throw new Error('Component with name "' + component_name + '" already exists')
			}
			this.components[component_name] = Util.Object.clone(component_data);
			if (!this.components[component_name]._componentType) {
				this.components[component_name]._componentType = component_name;
			}
		},
		remove: function(component_name) {
			this.components[component_name] = void 0;
		}
	};

	return ComponentManager;
})();