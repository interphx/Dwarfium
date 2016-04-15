var Canvas2dRenderingSystem = System.extend('Canvas2dRenderingSystem',
	function Canvas2dRenderingSystem(ctx) {
        System.call(this);
		this.ctx = ctx;
	},
    {
        aspects: {
            cameras: Aspect.all(['Camera2d', 'Transform2d']),
            objects: Aspect.all(['SimpleGraphics', 'Transform2d'])
        },
        getWorldRect: function(pos, size) {
            var result = {
                x: pos.x - size.x / 2,
                y: pos.y - size.y / 2,
                w: size.x,
                h: size.y
            };
            if (!isFinite(result.x) || !isFinite(result.y)) throw new Error('FUCK WATCH UR NUMBERS');
            return result;
        },
        onUpdate: function(dt, nodes) {
            var cameras = nodes.cameras;
            var objects = nodes.objects;
            var self = this;
            objects.sort(function(a, b) { 
                return self.ecs.getComponent('SimpleGraphics', b).zIndex - self.ecs.getComponent('SimpleGraphics', a).zIndex; 
            });
            for (var i = 0; i < cameras.length; ++i) {
                var camera = cameras[i];
                var camera_transform = this.ecs.getComponent('Transform2d', camera);
                var camera_data = this.ecs.getComponent('Camera2d', camera);
                var camera_view = this.getWorldRect(camera_transform.worldPos(), camera_data.viewSize);
                
                var render_target = camera.renderTarget || this.ctx;
                render_target.fillStyle = '#000000';
                render_target.clearRect(0, 0, render_target.canvas.width, render_target.canvas.height);
                
                render_target.save();
                
                var PTM_X = render_target.canvas.width / camera_data.viewSize.x * camera_data.zoom.x;
                var PTM_Y = render_target.canvas.height / camera_data.viewSize.y * camera_data.zoom.y;
                var PTM_AVG = (PTM_X + PTM_Y) / 2;
                
                render_target.scale(1, -1);
                render_target.scale(PTM_X, PTM_Y);
                render_target.translate(-camera_transform.worldPos().x + camera_data.viewSize.x/2, -camera_transform.worldPos().y - camera_data.viewSize.y/2);
                
                render_target.lineWidth /= PTM_AVG;
                
                
                
                for (var j = 0; j < objects.length; ++j) {
                    var obj = objects[j];
                    var transform = this.ecs.getComponent('Transform2d', obj);
                    var graphics = this.ecs.getComponent('SimpleGraphics', obj);
                    var obj_world_rect = this.getWorldRect(transform.worldPos(), graphics.size);

                    if (!Util.Geometry.rectsIntersect(obj_world_rect, camera_view)) continue;

                    this.renderShape(render_target, graphics, obj_world_rect);
                }
                render_target.lineWidth *= 1;
                render_target.strokeStyle = 'red';
                render_target.beginPath();
                render_target.moveTo(camera_view.x, camera_view.y);
                render_target.lineTo(camera_view.x + camera_view.w, camera_view.y);
                render_target.lineTo(camera_view.x + camera_view.w, camera_view.y + camera_view.h);
                render_target.lineTo(camera_view.x, camera_view.y + camera_view.h);
                render_target.lineTo(camera_view.x, camera_view.y);
                render_target.stroke();
                render_target.restore();
            }
        },
        
        renderShape: function(render_target, graphics, targetRect) {
            render_target.save();
            render_target.fillStyle = graphics.getColorHex();
            /*targetRect = {
                x: targetRect.x * render_target.canvas.width,
                y: targetRect.y * render_target.canvas.height,
                w: targetRect.w * render_target.canvas.width,
                h: targetRect.h * render_target.canvas.height
            };*/
            switch (graphics.shape) {
                case 'rect':
                case 'rectangle':
                    //console.log(targetRect);
                    render_target.beginPath();
                    render_target.rect(targetRect.x, targetRect.y, targetRect.w, targetRect.h);
                    render_target.fill();
                    //console.log('Target rect: ', targetRect);
                    break;
                case 'circle':
                    var x = (targetRect.x + targetRect.w / 2)/* | 0*/;
                    var y = (targetRect.y + targetRect.h / 2)/* | 0*/;
                    var r = (Math.max(targetRect.w, targetRect.h) / 2)/* | 0*/;
                    render_target.beginPath();
                    render_target.arc(x, y, r, 0, 2 * Math.PI, false);
                    render_target.fill();
                    break;
                default:
                    throw new Error('Invalid graphics shape type: ' + graphics.shape.toString())
            }
            render_target.restore();
        }
});

BUILTIN_COMPONENTS['SimpleGraphics'] = {
    zIndex: 0,
    shape: 'rect',
    color: 'white',
    size: {x: 1.0, y: 1.0},
    
    onInit: function() {
        this.setColor(this.color);
    },
    
    setColor: function(color) {
        this.color = color;
        this._parsedColor = Util.Color.parseToHex(this.color);
    },
    getColor: function(){
        return this.color;
    },
    getColorHex: function() {
        return this._parsedColor;
    },
    
    _parsedColor: null
};

BUILTIN_COMPONENTS['Camera2d'] = {
    renderTarget: null,
    //viewport: {x: -25.0, y: -25.0, w: 25.0, h: 25.0},
    viewSize: {x: 100, y: 100},
    zoom: {x: 1, y: 1}
};