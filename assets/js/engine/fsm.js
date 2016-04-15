var FsmManager = (function() {
    function NOOP() {};

    function FsmManager() {
        this.fsms = [];
    }
    
    FsmManager.prototype = {
        constructor: FsmManager,
        update: function(dt) {
            for (var i = this.fsms.length - 1; i >= 0; --i) {
                if (!this.fsms[i].state) {
                    this.fsms.splice(i, 1);
                    continue;
                }
                this.fsms[i].state = this.fsms[i].state(dt);
            } 
        },
        runFsm: function(fsm, args) {
            fsm.state = fsm.state.apply(fsm, args);
            this.fsms.push(fsm);
        },
        wrap: function(fsm) {
            var self = this;
            return function() {
                self.runFsm(fsm, Array.prototype.slice.call(arguments, 0));
            }
        }
    }
    
    return FsmManager;

})();

var coroutines = new FsmManager();

var Fsm = (function() {
    function NOOP() {};
    function Fsm(states) {
        var fsm = {};
        fsm.states = states;
        if (!fsm.states.enter) fsm.states.enter = NOOP;
        if (!fsm.states.exit) fsm.states.exit = NOOP;
        fsm.state = fsm.states.enter;
        return fsm;
    }
    return Fsm;
})();