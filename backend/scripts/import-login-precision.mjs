// Import ONLY model JS; existing login CSS, HTML/React form, and header stay untouched.
import fs from 'node:fs';
import crypto from 'node:crypto';
const original=fs.readFileSync(process.argv[2]??'storage/ui-snapshots/login-precision-source.html','utf8');
const sourceModule=original.replace(/\r\n/g,'\n').match(/<script type="module">([\s\S]*?)<\/script>/)[1];
let engine=sourceModule.slice(0,sourceModule.indexOf('    // Khởi tạo & Điều khiển Giao diện'));
function replace(a,b){if(!engine.includes(a))throw Error('Source mismatch: '+a);engine=engine.replace(a,b);}
engine="import {batchTemplateGeometry} from './batch-template-geometry.js';\n"+engine;
replace('class OmsPrecisionDiorama {','export class OmsPrecisionDiorama {');
replace('        this.buildInternalOmsDataFibers();','        this.buildInternalOmsDataFibers();\n        batchTemplateGeometry(this);');
replace('OMS AUTOMATED DISTRIBUTION HUB • SCALE 1:100','OMS • QUẢN LÝ ĐƠN HÀNG');
replace('OMS SMART DISTRIBUTION HUB • VN01','OMS • QUẢN LÝ ĐƠN HÀNG');
replace('OMS EXPRESS LOGISTICS','OMS');
replace('aspect < 1.05 ? this.frustumSize / Math.max(0.76, aspect) : this.frustumSize','Math.max(this.frustumSize, 16.5 / aspect)');
replace('this.clock = new THREE.Clock();','this.elapsed = 0; this.lastFrame = 0; this.running = false; this.disposed = false; this.frames = 0;');
replace('        this.initRenderer();','        try {\n        this.initRenderer();');
replace('        this.animate();','        this.renderFrame();');
replace('requestAnimationFrame(() => this.options.onReady?.());','requestAnimationFrame(() => { if (!this.disposed) this.options.onReady?.(); });\n        } catch (error) { this.dispose(); throw error; }');
replace("powerPreference: 'high-performance'","powerPreference: 'low-power'");
replace('Math.min(window.devicePixelRatio || 1, 2)','Math.min(window.devicePixelRatio || 1, 1.5)');
replace('this.container.appendChild(this.renderer.domElement);','this.renderer.domElement.className = "warehouse-canvas";\n        this.renderer.domElement.setAttribute("aria-hidden", "true");\n        this.container.appendChild(this.renderer.domElement);');
replace('keyLight.shadow.mapSize.set(2048, 2048)','keyLight.shadow.mapSize.set(1024, 1024)');
replace('this.scene.environment = pmremGenerator.fromScene(roomEnv, 0.04).texture;','this.environmentTarget = pmremGenerator.fromScene(roomEnv, 0.04);\n        this.scene.environment = this.environmentTarget.texture;\n        pmremGenerator.dispose();');
replace('        this.controls.update();\n      }','        this.controls.update();\n        this.renderer.domElement.style.touchAction = "pan-y";\n        this.controls.addEventListener("change", () => { if (!this.running) this.renderFrame(); });\n      }');
replace('requestAnimationFrame(this.animate);\n\n        const delta = Math.min(this.clock.getDelta(), 0.05);\n        const elapsed = this.clock.getElapsedTime();','if (this.disposed || !this.running) return;\n        this.raf = requestAnimationFrame(this.animate);\n        const now = performance.now();\n        if (now - this.lastFrame < 32) return;\n        const delta = Math.min((now - this.lastFrame) / 1000, 0.05);\n        this.lastFrame = now;\n        this.elapsed += delta;\n        const elapsed = this.elapsed;');
replace('this.renderer.render(this.scene, this.camera);\n      };','this.renderFrame();\n      };');
replace('this.targetAzimuthOffset -= Math.PI / 4;','if (!this.running) { this.rotateAroundTarget(-Math.PI / 4); this.renderFrame(); } else this.targetAzimuthOffset -= Math.PI / 4;');
replace('this.targetAzimuthOffset += Math.PI / 4;','if (!this.running) { this.rotateAroundTarget(Math.PI / 4); this.renderFrame(); } else this.targetAzimuthOffset += Math.PI / 4;');
replace('        this.isResettingCamera = true;','        this.isResettingCamera = true;\n        if (!this.running) { this.setCameraSpherical(this.defaultSpherical.radius, this.defaultSpherical.phi, this.defaultSpherical.theta); this.controls.target.copy(this.defaultTarget); this.camera.zoom = 1; this.camera.updateProjectionMatrix(); this.isResettingCamera = false; this.controls.update(); this.renderFrame(); }');
replace('        ro.observe(this.container);','        ro.observe(this.container);\n        this.resizeObserver = ro;');
replace('        this.renderer.setSize(width, height);\n      }','        this.renderer.setSize(width, height);\n        this.renderFrame();\n      }');
const extra=`
      renderFrame() {
        if (this.disposed || !this.renderer || !this.controls) return;
        this.renderer.render(this.scene, this.camera);
        this.container.dataset.frames = String(++this.frames);
        this.container.dataset.pose = this.camera.position.toArray().map(n => n.toFixed(3)).join(',');
        this.container.dataset.drawCalls = String(this.renderer.info.render.calls);
        this.container.dataset.model = 'OmsPrecisionDiorama';
      }
      setRunning(value) {
        if (this.disposed) return;
        cancelAnimationFrame(this.raf);
        this.running = value; this.controls.enableDamping = value;
        this.container.dataset.playing = String(value);
        this.lastFrame = performance.now();
        if (value) this.raf = requestAnimationFrame(this.animate);
      }
      dispose() {
        if (this.disposed) return;
        this.disposed = true; cancelAnimationFrame(this.raf);
        this.resizeObserver?.disconnect(); this.controls?.dispose();
        const geometries = new Set(), materials = new Set(), textures = new Set();
        this.scene?.traverse(object => {
          if (object.geometry) geometries.add(object.geometry);
          if (object.material) for (const material of [].concat(object.material)) materials.add(material);
        });
        for (const material of materials) for (const value of Object.values(material)) if (value?.isTexture) textures.add(value);
        geometries.forEach(g => g.dispose()); textures.forEach(t => t.dispose()); materials.forEach(m => m.dispose());
        this.environmentTarget?.dispose();
        this.renderer?.dispose(); this.renderer?.forceContextLoss(); this.renderer?.domElement.remove();
      }
`;
const end=engine.lastIndexOf('    }');engine=engine.slice(0,end)+extra+engine.slice(end);
fs.writeFileSync('src/app/login/digital-twin.js','// Model only from operator 12345tyu.html; lifecycle adapted for React. Regenerate: node scripts/import-login-precision.mjs\n'+engine);
console.log('Model-only import SHA256 '+crypto.createHash('sha256').update(original).digest('hex'));
