var GameUpdater = (function() {
	function GameUpdater(fps, max_fps, callbacks) {
		var timestep = 1000 / fps;

		this.requestFrame = Util.Async.requestFrame;

	    this.cancelFrame = Util.Async.cancelFrame;

		this.timestep = timestep;

		this.callbacks = callbacks;

		this._fps = fps;
		this._frameId = null;
		this._accumulator = 0.0;
		this._lastTime = 0;
		this._framesThisSecond = 0;
		this._minFrameDelay = 1000 / max_fps;
		this._lastFpsUpdate = 0; // When was the last time we updated fps
		this._panic = false;
		this._running = false;

		this.inititalize();
	}

	GameUpdater.prototype = {
		constructor: GameUpdater,
		inititalize: function() {
			if (this.callbacks.onInitialize) { this.callbacks.onInitialize.call(this); }
		},

		render: function() {
			if (this.callbacks.onRender) { this.callbacks.onRender.call(this); }
		},

		update: function(dt) {
			if (this.callbacks.onUpdate) { this.callbacks.onUpdate.call(this, dt); }
		},

		preUpdate: function(dt) {
			if (this.callbacks.preUpdate) { this.callbacks.preUpdate.call(this, dt); }
		},

		postUpdate: function(dt) {
			if (this.callbacks.postUpdate) { this.callbacks.postUpdate.call(this, dt); }
		},

		panic: function() {
			if (this.callbacks.onPanic) { this.callbacks.onPanic.call(this, dt); }
		},

		run: function() {
			if (!this._running) { console.log('INVALID RUN'); return; }
			var time = Util.Time.now();
			var delta = time - this._lastTime;

			if (time < this._lastTime + this._minFrameDelay) { 
				this._frameId = this.requestFrame(this.run.bind(this));
				return;
			}

			this._accumulator += delta;
			this._lastTime = time;

			if (time > this._lastFpsUpdate + 1000) {
				this._fps = 0.25 * this._framesThisSecond + 0.75 * this._fps;
				this._lastFpsUpdate = time;
				this._framesThisSecond = 0;
			}
			this._framesThisSecond++;

			// TODO: Which timestep to use here?
			this.preUpdate(this.timestep);

			var numUpdateSteps = 0;
			while (this._accumulator >= this.timestep) {
				this.update(this.timestep / 1000.0);
				this._accumulator -= this.timestep;
				if (++numUpdateSteps >= 240) {
					this._panic = true;
					this.panic();
					break;
				}
			}
			
			// TODO: Which timestep to use here?
			this.postUpdate(this.timestep);

			this._panic = false;

			this._frameId = this.requestFrame(this.run.bind(this));
		},

		start: function() {
			if (this.running) { return this; }
			
			this._frameId = this.requestFrame((function(){
				this.render();
				this._running = true;
				var time = Util.Time.now();
				this._lastTime = time;
				this._lastFpsUpdate = time;
				this._framesThisSecond = 0;

				this._frameId = this.requestFrame(this.run.bind(this));
			}).bind(this));
			return this;
		},

		stop: function() {
			this.running = false;
			this.cancelFrame(this._frameId);
			return this;
		},

		isRunning: function() {
			return this._running;
		},

		isPanic: function() {
			return this._panic;
		},

		getFps: function() {
			return this._fps;
		}
	};

	return GameUpdater;
})();