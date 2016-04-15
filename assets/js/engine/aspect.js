// TODO: Relational algebra for more complex aspects
var Aspect = (function() {
    function Aspect(relation, components) {
        this.relation = relation;
        this.components = components.slice(0);
    }
    
    Aspect.prototype = {
        constructor: Aspect
    };
    
    Aspect.any = function(components) {
        return new Aspect('any', components);
    };
    
    Aspect.all = function(components) {
        return new Aspect('all', components);
    };
    
    return Aspect;
})();