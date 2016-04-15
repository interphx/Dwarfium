// TODO: Use some generalized event dispatcher, probably from one of my libs
// TODO: Revamp event dispatching to use signals/slots and more performant approach
var SystemEventSource = (function() {
    function SystemEventSource() {
        this.listeners = {};
    }
    
    SystemEventSource.prototype = {
        constructor: SystemEventSource,
        addListener: function(event_type, callback) {
            if (!this.listeners[event_type]) {
                this.listeners[event_type] = [];
            }
            // Useless when using bind() on callbacks
            if (this.listeners[event_type].indexOf(callback) >= 0 && event_type === 'onCollisionEnter') {
                throw new Error('Callback is already registered');
            }
            // TODO: DO BETTER? HANDLE UNBOUND CALLBACKS?
            this.listeners[event_type].push(callback);
        },
        removeListener: function(event_type, callback) {
            var idx = this.listeners[event_type].indexOf(callback);
            if (idx >= 0) {
                this.listeners[event_type].splice(idx, 1);
            }
        },
        trigger: function(event_type, args) {
            if (!this.listeners[event_type]) return;
            for (var i = 0; i < this.listeners[event_type].length; ++i) {
                // TODO: Passing null context to bound function is unclean
                this.listeners[event_type][i].apply(null, args);
            }
        }
    }
    
    return SystemEventSource;
    
})();

var System = (function() {    
    function isEventHandlerName(property_name) {
        return  property_name.length >= 3 &&
                property_name.substr(0, 2) === 'on' &&
                Util.String.isUpper(property_name.charAt(2));
    }
    
    function System() {
        this.eventSource = new SystemEventSource();
        if (!this.name) {
            if (typeof this.constructor.name === 'string' && this.constructor.name.length > 0) {
                this.name = this.constructor.name;
            } else {
                throw new Error("System must define its 'name' or have a constructor with valid 'name' property ");
            }
        }
    }
    
    System.prototype = {
        constructor: System,
        onInit: function(ecs) {
            this.ecs = ecs;
        },
        
        bindEvents: function(system) {
            for (var property_name in system) {
                var property = system[property_name];
                if (typeof property !== 'function') continue;
                if (!isEventHandlerName(property_name)) continue;
                this.eventSource.addListener(property_name, property.bind(system));
            }
        },
        
        onEntityAdded: function(entity) {
        },
        
        onEntityRemoved: function(entity) {
        }
    };
    
    System.extend = function(name, constructor, prototype) {
        // To make debugger show actual function name.
        // Makes debugging easier.
        // TODO: Test if it affects performance or anything; if it does, remove in production builds
        var constructor_wrapped = eval('(function(){ function ' + name + '() { System.call(this); constructor.apply(this, arguments); } return ' + name + '; })();');
        /*var constructor_wrapped = function() {
            System.call(this);
            constructor.apply(this, arguments);
        };*/
        constructor_wrapped.name = name;
        var proto = Object.create(System.prototype);
        proto.constructor = constructor_wrapped;
        proto.name = name;
        for (var key in prototype) {
            proto[key] = prototype[key];
        }
        constructor_wrapped.prototype = proto;
        return constructor_wrapped;
    }
    
    return System;
    
})();