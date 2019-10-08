import * as THREE from 'three'
var OrbitControls = require('three-orbit-controls')(THREE)
var raycaster = new THREE.Raycaster();
import { EffectComposer, RenderPass, ShaderPass } from 'postprocessing';

export default class App {
    constructor() {
		const ANTIALISE = false;
		this.canvas = document.getElementById('main-canvas');
		this.width = window.innerWidth;
		this.height = window.innerHeight;

		this.scene = new THREE.Scene();
		this.camera = new THREE.PerspectiveCamera( 75, this.width / this.height, 0.1, 10000 );
		this.camera.position.z = 70;
		this.renderer = new THREE.WebGLRenderer( { canvas: this.canvas, alpha: true, antialias: ANTIALISE } ); // , antialias: true
        this.renderer.setSize( this.width, this.height );
        
        this.controls = new OrbitControls(this.camera);
        this.controls.update();

        var that = this;
        var positions = [];
        this.radius = 100;
        this.count = 150;
        var sizes = [];
        var colors = [];

        var vertexShader = `attribute float size;
        varying vec3 vColor;
        void main() {
            vColor = color;
            vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );
            gl_PointSize = size * ( 300.0 / -mvPosition.z );
            gl_Position = projectionMatrix * mvPosition;
        }`;

        var fragmentsShader = `uniform sampler2D pointTexture;
        varying vec3 vColor;
        void main() {
            gl_FragColor = vec4( vColor, 1.0 );
            vec4 textColor = texture2D( pointTexture, gl_PointCoord );
            gl_FragColor = gl_FragColor * textColor;
        }`;

        var uniforms = {
            pointTexture: { value: new THREE.TextureLoader().load( 'spark1.png' ) }
        };

        this.geometry = new THREE.BufferGeometry();
        this.v = [];
        // create a simple square shape. We duplicate the top left and bottom right
        for ( var i = 0; i < this.count; i ++ ) {
            positions.push( ( Math.random() * 2 - 1 ) * this.radius );
            positions.push( ( Math.random() * 2 - 1 ) * this.radius );
            positions.push( 0 );

            this.v.push({
                x: ( Math.random() * 2 - 1 ) * .3,
                y: ( Math.random() * 2 - 1 ) * .3
            });

            colors.push( 255, 0, 0 );

            sizes.push( 30 );

        }

        console.log(this.v);


        // itemSize = 3 because there are 3 values (components) per vertex
        this.geometry.addAttribute( 'position', new THREE.Float32BufferAttribute( positions, 3 ) );
        this.geometry.addAttribute( 'color', new THREE.Float32BufferAttribute( colors, 3 ) );
        this.geometry.addAttribute( 'size', new THREE.Float32BufferAttribute( sizes, 1 ).setDynamic( true ) );

        var material = new THREE.ShaderMaterial( {
            uniforms: uniforms,
            vertexShader: vertexShader,
            fragmentShader: fragmentsShader,
            blending: THREE.AdditiveBlending,
            depthTest: false,
            transparent: true,
            vertexColors: true
        } );


        // material = new THREE.PointsMaterial({ color: 0x883388 }  );
        // material = new THREE.PointsMaterial({ map: new THREE.TextureLoader().load( 'spark1.png' ) }  );

        this.particleSystem = new THREE.Points( this.geometry, material );

        this.scene.add(this.particleSystem);

        this.composer = new EffectComposer(this.renderer);
        this.composer.addPass(new RenderPass(this.scene, this.camera));
      
        const colorShader = new THREE.ShaderMaterial({
          uniforms: {
            tDiffuse: { value: null },
          },
          vertexShader: `
            varying vec2 vUv;
            void main() {
              vUv = uv;
              gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1);
            }
          `,
          fragmentShader: `
            uniform sampler2D tDiffuse;
            varying vec2 vUv;
            void main() {
              vec4 previousPassColor = texture2D(tDiffuse, vUv);
              if( previousPassColor.r > 0.2 ) {
                gl_FragColor = vec4(0.0,0.,1.,1.);
              } else {
                gl_FragColor = vec4(1.0);
              }
              vec3 col = vec3(0.,5.,0.) * smoothstep(0.4, 0.7, previousPassColor.r);
              gl_FragColor = vec4(col, 1.0);
              

            //   gl_FragColor = previousPassColor;
            }
          `,
        });
      
        const colorPass = new ShaderPass(colorShader, 'tDiffuse');
        colorPass.renderToScreen = true;
        this.composer.addPass(colorPass);

        let then = 0;
		function animate(now) {
            now *= 0.001;  // convert to seconds
            const deltaTime = now - then;
            then = now;

            
            // particleSystem.rotation.z = 0.01 * time;

            var positions = that.geometry.attributes.position.array;
            for ( var i = 0; i < that.count; i++ ) {
                var k = i*3;
                var j = i*3 + 1;

                if(positions[k] >= that.radius || positions[k] <= -that.radius) {
                    that.v[i].x *= -1;
                }
                if(positions[j] >= that.radius || positions[j] <= -that.radius) {
                    that.v[i].y *= -1;
                }
                
                positions[k] += that.v[i].x;
                positions[j] += that.v[i].y;
            }
            that.geometry.attributes.position.needsUpdate = true;

            requestAnimationFrame( animate );
            that.composer.render(deltaTime);
            // that.renderer.render(that.scene, that.camera);
		}
		animate(0);
    }
}

new App();