var Util = {
    Type: {
        typeOf: (function() {
            var TYPES = {
                'undefined'        : 'undefined',
                'number'           : 'number',
                'boolean'          : 'boolean',
                'string'           : 'string',
                '[object String]'  : 'string',
                '[object Number]'  : 'number',
                '[object Function]': 'function',
                '[object RegExp]'  : 'regexp',
                '[object Array]'   : 'array',
                '[object Date]'    : 'date',
                '[object Error]'   : 'error',
                '[object Object]'  : 'object'
            };

            function typeOf(obj) {
                return TYPES[typeof obj] || TYPES[Object.prototype.toString.call(obj)] || (obj ? 'object' : 'null');
            };
            return typeOf;
        })()
    },
    Environment: {
        global: (function() {
            var global;
            try {
              global = Function('return this')() || (42, eval)('this');
            } catch(e) {
              global = window;
            }
            return global;
        })(),
        isStrictModeSupported: (function () { "use strict"; return !this; })()
    },
	Numeric: {
		isFiniteNumber: function(n) { return isFinite(n) && !isNaN(n); },
		lerp: function(a, b, t) { return a * t + b * (1.0 - t); },
		clamp: function(n, min, max) { return Math.min( Math.max(min, n), max ); },
		clampAbs: function(n, min, max) { return Util.Numeric.clamp(Math.abs(n), min, max) * Math.sign(n); }
	},
    
    String: {
        isUpper: function(s) { return s === s.toUpperCase(); },
        isLower: function(s) { return s === s.toLowerCase(); },
        isValidNumber: function(s) { return s.trim() && !isNaN(s); },
        isNumeric: function(s) { return (/^[0-9]+$/ig).test(s); },
        isAlpha: function(s) { return (/^[a-z]+$/ig).test(s); },
        isAlphanumeric: function(s) { return (/^[a-z0-9]+$/ig).test(s); },
        alphaLowerCase: 'abcdefghijklmnopqrstuvwxyz',
        alphaUpperCase: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
        alpha: 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ',
        digits: '0123456789',
        alphanumeric: 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
        // TODO: Move into own module, give credit to author
        format: (function(){
            var ValueError = function(message) {
                var err = new Error(message);
                err.name = 'ValueError';
                return err;
            };

            //  defaultTo :: a,a? -> a
            var defaultTo = function(x, y) {
                return y == null ? x : y;
            };

            //  create :: Object -> String,*... -> String
            var create = function(transformers) {
                return function(template) {
                    var args = Array.prototype.slice.call(arguments, 1);
                    var idx = 0;
                    var state = 'UNDEFINED';

                    return template.replace(
                        /([{}])\1|[{](.*?)(?:!(.+?))?[}]/g,
                        function(match, literal, key, xf) {
                            if (literal != null) {
                                return literal;
                            }
                            if (key.length > 0) {
                                if (state === 'IMPLICIT') {
                                    throw ValueError('cannot switch from ' +
                                        'implicit to explicit numbering');
                                }
                                state = 'EXPLICIT';
                            } else {
                                if (state === 'EXPLICIT') {
                                    throw ValueError('cannot switch from ' +
                                        'explicit to implicit numbering');
                                }
                                state = 'IMPLICIT';
                                key = String(idx);
                                idx += 1;
                            }
                            var value = defaultTo('', lookup(args, key.split('.')));

                            if (xf == null) {
                                return value;
                            } else if (Object.prototype.hasOwnProperty.call(transformers, xf)) {
                                return transformers[xf](value);
                            } else {
                                throw ValueError('no transformer named "' + xf + '"');
                            }
                        }
                    );
                };
            };

            var lookup = function(obj, path) {
                if (!/^\d+$/.test(path[0])) {
                    path = ['0'].concat(path);
                }
                for (var idx = 0; idx < path.length; idx += 1) {
                    var key = path[idx];
                    obj = typeof obj[key] === 'function' ? obj[key]() : obj[key];
                }
                return obj;
            };

            //  format :: String,*... -> String
            var format = create({});

            //  format.create :: Object -> String,*... -> String
            format.create = create;
            
            return format
        })()
    },

	Random: {
		real: function(min, max) {
			if (min == null && max == null) return Math.random();
			if (min == null) throw new Error('Invalid call to Random.real: you cannot omit first argument');
			if (max == null) {
				max = min;
				min = 0.0;
			}
			return Math.random() * (max - min) + min;
		},

		int: function(min, max) {
			// Random integer 0..2^32 safe for bitwise operation
			if (min == null && max == null) return Math.floor(Math.random() * Math.pow(2, 32));
			if (min == null) throw new Error('Invalid call to Random.int: you cannot omit first argument');
			if (max == null) {
				max = min;
				min = 0;
			}
			return Math.floor(Math.random() * (max - min + 1) + min);
		},

		sign: function(allow_zero) {
			if (allow_zero) return Util.Random.int(-1, 1);
			return Util.Random.int(2) === 0 ? -1 : 1;
		},
        
        bool: function() {
            return !!Math.round(Math.random());
        },
        
        shuffle: function(array) {
            for (var i = array.length - 1; i > 0; i--) {
                var j = Math.floor(Math.random() * (i + 1));
                var temp = array[i];
                array[i] = array[j];
                array[j] = temp;
            }
            return array;
        },
        
        shuffled: function(array) {
            var result = array.slice(0);
            Util.Random.shuffle(result);
            return result;
        },
        
        /**
        *	Return n random items from population. If n is not specified, return random element.
        *	With (repetitions=false) and (n >= population.length) returns all values in random order.
        *	@param {array} population
        *	@param {number} [n] Number of elements to return
        *	@param {boolean} [repetitions=false] Whether to allow repetitions in resulting array.
        *	@returns {array}
        */
        sample: function(population, n, repetitions) {
            if (repetitions == null) { repetitions = false }
            if (n == null) { return population[Math.floor(Math.random() * population.length)] }

            var shuffled = Util.Random.shuffled( population.slice(0) );

            if (!repetitions) {
                return shuffled.slice(0, n);
            }

            result = shuffled;

            while (result.length < n) {
                result = result.concat( Util.Random.shuffled(population.slice(0)) );
            }
            return result.slice(0, n);
        },

        /**
        *	Samples n values from list of [value, probability] pairs. Probability is relative. 
        *	If n is not specified, return random element with regard to probability.
        *	With (repetitions=false) and (n > population.length) returns population.length items.
        *	@param {array} population Array of [value, probability] pairs
        *	@param {number} [n] Number of elements to return
        *	@param {boolean} [repetitions=false] Whether to allow repetitions in resulting array
        *	@returns {array}
        */
        sampleWeighted: function(population, n, repetitions) {
            if (repetitions == null) { repetitions = false }
            population = population.slice(0);
            
            population.sort(function(a, b) {
                if (typeof a[1] !== 'number' || typeof b[1] !== 'number') {
                    throw new Error('Probability must be a number');
                }
                return (a[1] < b[1]) ? -1 : 1; 
            });
            
            var total = 0,
                cdf = [];
            
            // Calculate cumulative distribution function (cdf)
            for (var i = 0; i < population.length; ++i) {
                total += population[i][1];
                cdf.push(total);
            }
            
            var picked;

            // Handle case for single element
            if (n == null) {
                picked = Util.Random.real(0, total);
                for (i = 0; i < population.length; ++i) {
                    if ( picked <= cdf[i] ) { return population[i][0] }
                }
                throw new Error('Should not reach here');
            }
            
            var result = [];

            for (var k = 0; k < n; ++k) {
                picked = Util.Random.real(0, total);
                for (i = 0; i < population.length; ++i) {
                    if ( picked <= cdf[i] ) {
                        result.push(population[i][0]);
                        if (!repetitions) {
                            total -= population[i][1];
                            population.splice(i, 1);
                            cdf.splice(i, 1);
                        }
                        break;
                    }
                }
                if (population.length === 0) break;
            }
            return result;
        }
	},

	Geometry: {
		rectsIntersect: function(a, b) {
			return 	!(b.x > a.x + a.w ||
					  b.x + b.w < a.x ||
					  b.y > a.y + a.h ||
					  b.y + b.h < a.y);
		},
		segmentsIntersection: function(ax, aw, bx, bw) {
			return Math.min(ax + aw, bx + bw) - Math.max(ax, bx);
		},
		rectsIntersection: function(a, b) {
			return {
				x: Util.Geometry.segmentsIntersection(a.x, a.w, b.x, b.w),
				y: Util.Geometry.segmentsIntersection(a.y, a.h, b.y, b.h)
			}
		},
        rectCenter: function(rect) {
            return {x: rect.x + rect.w / 2.0, y: rect.y + rect.h / 2.0};
        },
        Vector2: (function(){
            function Vector2(x, y) {
                this.x = x;
                this.y = y;
                this._magnitude = null;
                this._magnitude2 = null;
            }
            
            Vector2.prototype = {
                constructor: Vector2,
                mag: function() {
                    if (!this._magnitude) {
                        if (!this._magnitude2) {
                            this._magnitude2 = this.x*this.x + this.y*this.y;
                        }
                        this._magnitude = Math.sqrt(this._magnitude2);
                    }
                    return this._magnitude;
                },
                mag2: function() {
                    if (!this._magnitude2) {
                        this._magnitude2 = this.x*this.x + this.y*this.y;
                    }
                    return this._magnitude2;
                },
                clone: function() {
                    return new Vector2(this.x, this.y);
                },
                add: function(other) {
                    this.x += other.x;
                    this.y += other.y;
                    return this;
                },
                sub: function(other) {
                    this.x -= other.x;
                    this.y -= other.y;
                    return this;
                },
                mul: function(scale_x, scale_y) {
                    this.x *= scale_x;
                    this.y *= (scale_y != null ? scale_y : scale_x);
                    return this;
                },
                div: function(scale_x, scale_y) {
                    this.x /= scale_x;
                    this.y /= (scale_y != null ? scale_y : scale_x);
                    return this;
                },
                project: function(other) {
                    var amt = this.dot(other) / other.mag2();
                    this.x = amt * other.x;
                    this.y = amt * other.x;
                    return this;
                },
                projectUnit: function(other) {
                    var amt = this.dot(other);
                    this.x = amt * other.x;
                    this.y = amt * other.x;
                    return this;
                },
                reflect: function(axis_vector) {
                    return this.project(axis_vector).mul(2).sub(new Vector2(this.x, this.y));
                },
                reflectOverUnit: function(axis_vector) {
                    return this.projectUnit(axis_vector).mul(2).sub(new Vector2(this.x, this.y));
                },
                dot: function(other) {
                    return this.x * other.x + this.y * other.y;
                },
                norm: function() {
                    var mag = this.getMagnitude();
                    if (mag === 0) {
                        this.x = 0;
                        this.y = 0;
                    } else {
                        this.x /= mag;
                        this.y /= mag;
                    }
                    return this;
                },
                invert: function() {
                    this.x = -this.x;
                    this.y = -this.y;
                    return this;
                },
                perp: function() {
                    var tmp_x = this.x;
                    this.x = this.y;
                    this.y = -tmp_x;
                    return this;
                },
                rotate: function(radians) {
                    this.x = this.x * Math.cos(radians) - this.y * Math.sin(radians);
                    this.y = this.x * Math.sin(radians) + this.y * Math.cos(radians);
                    return this;
                },
                min: function() {
                    return Math.min(this.x, this.y);
                },
                max: function() {
                    return Math.max(this.x, this.y);
                },
                signs: function() {
                    this.x = Math.sign(this.x);
                    this.y = Math.sign(this.y);
                    return this;
                },
                lerp: function(other, t) {
                    this.x = Util.Numeric.lerp(this.x, other.x, t);
                    this.y = Util.Numeric.lerp(this.y, other.y, t);
                    return this;
                },
                // TODO: approxEquals
                equals: function(other) {
                    return this.x === other.x && this.y === other.y;
                },
                toArray: function() {
                    return [this.x, this.y];
                },
                toObject: function() {
                    return {x: this.x, y: this.x};
                },
                toString: function() {
                    return 'Vector2(' + this.x.toString() + ', ' + this.y.toString() + ')';
                }
            };
            
            Vector2.fromArray = function(array) {
                return new Vector2(array[0], array[1]);
            };
            
            Vector2.fromObject = function(object) {
                return new Vector2(object.x, object.y);
            };
            
            Vector2.read = function(anything) {
                var type = Util.Type.typeOf(anything);
                switch (type) {
                    case 'array':
                        if (anything.length >= 2) return Vector2.fromArray(anything); else return null;
                        break;
                    case 'string':
                        return Vector2.parse(anything);
                        break;
                    default:
                        return Vector2.fromObject(anything);
                }
            };
            
            var vector_regex = new RegExp('Vector2\\s*\\(\\s*([0-9\.]+)\\s*,\\s*([0-9\.]+)\\s*\\)', 'i');
            Vector2.parse = function(str) {
                var match = vector_regex.exec(str);
                if (!match || match.length < 3) return null;
                var x = parseFloat(match[1]);
                if (!x) return null;
                var y = parseFloat(match[2]);
                if (!y) return null;
                return new Vector2(x, y);
            };
            
            Vector2.zero = function() {
                return new Vector2(0, 0);
            };
            
            Vector2.lerp = function(a, b, t) {
                return new Vector2(Util.Numeric.lerp(a.x, b.x, t), Util.Numeric.lerp(a.y, b.y, t));
            };
            
            return Vector2;
        })()
	},

	Coordinates: {
		worldPointToView: function(worldPoint, view) {
			return {x: worldPoint.x - view.x, y: worldPoint.y - view.y};
		},
		
		worldRectToView: function(worldRect, view) {
			var topLeft = this.worldPointToView({
				x: worldRect.x,
				y: worldRect.y
			}, view);
			var bottomRight = this.worldPointToView({
				x: worldRect.x + worldRect.w,
				y: worldRect.y + worldRect.h
			}, view);
			return {
				x: topLeft.x,
				y: topLeft.y,
				w: bottomRight.x - topLeft.x,
				h: bottomRight.y - topLeft.y
			};		
		}
	},

	Color: {
		rgbToHex: function (rgb) {
			var re = /rgba?\(\s*([0-9]+)\,\s*([0-9]+)\,\s*([0-9]+)(?:\,\s*([0-9]+)\s*)?\)/i;
			var tokens = rgb.match(re);
			var r = parseInt(tokens[1]).toString(16); if (r.length === 1) r = '0' + r;
			var g = parseInt(tokens[2]).toString(16); if (g.length === 1) g = '0' + g;
			var b = parseInt(tokens[3]).toString(16); if (b.length === 1) b = '0' + b;
			return "#" + r + g + b;
		},
		
		// TODO: Use faster method
		parseToHex: function(color) {
			var div = document.createElement('div');
			div.style.color = color;
			div.style.display = 'block';
			div.style.visibility = 'hidden';
			div.style.position = 'absolute';
			div.style.zIndex = 99999;
			document.body.appendChild(div);
			var result = Util.Color.rgbToHex(getComputedStyle(div).color);
			document.body.removeChild(div);
			return result;
		}
	},
    
    Func: {
        noop: function() {},
        id: function(x) { return x; },
        constant: function(x) {
            return function() { return x; }
        },
        tap: function(x, callback) { callback(x); return x; },
        prop: function(property_name) {
            return function(obj) { return obj[property_name]; }
        }
    },
    
    List: {
        zip: function(list_a, list_b) {
            var result = [];
            for (var i = 0, len = Math.min(list_a.length, list_b.length); i < len; ++i) {
                result.push([list_a[i], list_b[i]]);
            }
            return result;
        },
        zipWith: function(callback, list_a, list_b) {
            var result = [];
            for (var i = 0, len = Math.min(list_a.length, list_b.length); i < len; ++i) {
                result.push(callback(list_a[i], list_b[i]));
            }
            return result;
        },
        pluck: function(property_name, list) {
            var result = [];
            for (var i = 0, len = list.length; i < len; ++i) {
                result.push(list[i][property_name]);
            }
            return result;
        },
        pluckN: function(property_names, list) {
            var result = [];
            for (var i = 0, len = list.length; i < len; ++i) {
                var tuple = [];
                for (var j = 0; j < property_names.length; ++j) {
                    tuple.push(list[i][property_names[j]]);
                }
                result.push(tuple);
            }
            return result;
        },
        replicate: function(value, n) {
            if (n == 0) return [];
            var a = [value];
            /* 	Concat is significantly faster for large amounts of elements.
            *	600 is a magic number, after this bound concat should become faster than
            *	push in most modern environments.
            */
            if (n < 600) {
                while (a.length < n) a.push(value);
            } else {
                while (a.length * 2 <= n) a = a.concat(a);
                if (a.length < n) a = a.concat(a.slice(0, n - a.length));
            }
            return a;
        }
    },
    
    Object: {
        fromPairs: function(pairs) {
            var result = {};
            for (var i = 0, len = pairs.length; i < len; ++i) {
                result[pairs[i][0]] = pairs[i][1];
            }
            return result;
        },
        toPairs: function(obj, include_inherited/*=false*/) {
            var result = [];
            for (var key in obj) {
                if (!include_inherited && !obj.hasOwnProperty(key)) continue;
                result.push([key, obj[key]]);
            }
            return result;
        },
        pick: function(path, obj, separator/*="."*/) {
            if (typeof separator === 'undefined') separator = '.';
            var keys = path.split(separator);
            for (var i = 0; i < keys.length; ++i) {
                obj = obj[keys[i]];
            }
            return obj;
        },
        // TODO: Get rid of jQuery dependency
        clone: function(obj, deep, is_pod) {
            if (deep == null) { deep = true; }
            if (is_pod == null) { is_pod = false; }
            if (deep) {
                if (!is_pod) {
                    return $.extend(true, {}, obj);
                } else {
                    return JSON.parse(JSON.serialize(obj));
                }
            } else {
                return $.extend({}, obj);
            }
        },
        
        // TODO: Get rid of jQuery dependency
        merged: function(objects) {
            return $.extend.apply($, [true, {}].concat(objects) );
        }
    },
    
    Time: {
        now: (function() {
            return typeof Date.now === 'function' ? Date.now : function() { return +new Date() };
        })()
    },
    
    Async: {
        // Defined later
        requestFrame: void 0,
        cancelFrame: void 0
    }
};

(function() {
    var global = Util.Environment.global;
    var requestAnimationFrame = global.requestAnimationFrame,
        cancelAnimationFrame = global.cancelAnimationFrame;
        
    var vendors = ['ms', 'moz', 'webkit', 'o'];
    for(var i = 0; i < vendors.length && !(requestAnimationFrame && cancelAnimationFrame); ++i) {
        requestAnimationFrame = global[vendors[i]+'RequestAnimationFrame'];
        cancelAnimationFrame = global[vendors[i]+'CancelAnimationFrame'] 
                                   || global[vendors[i]+'RequestCancelAnimationFrame'];
    }
 
    var lastTime = 0;
    var now = Util.Time.now;
    if (!requestAnimationFrame || !cancelAnimationFrame) {
        requestAnimationFrame = function(callback, element) {
            var currTime = now();
            var timeToCall = Math.max(0, 16 - (currTime - lastTime));
            var id = setTimeout(function() { callback(currTime + timeToCall); }, timeToCall);
            lastTime = currTime + timeToCall;
            return id;
        };
        cancelAnimationFrame = function(id) {
            clearTimeout(id);
        }
    }
    
    Util.Async.requestFrame = requestAnimationFrame.bind(global);
    Util.Async.cancelFrame = cancelAnimationFrame.bind(global);
})();