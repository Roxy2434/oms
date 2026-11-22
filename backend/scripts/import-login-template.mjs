// One-time, reproducible import of the operator-provided HTML. Geometry/model builder methods stay verbatim.
import fs from 'node:fs';
import crypto from 'node:crypto';
import postcss from 'postcss';
const input=process.argv[2]||'storage/ui-snapshots/login-user-template.html';
const original=fs.readFileSync(input,'utf8');
const html=original.replace(/\r\n/g,'\n');
let css=html.match(/<style>([\s\S]*?)<\/style>/)[1];
const tree=postcss.parse(css);
tree.walkRules(rule=>{if(rule.parent.type==='atrule'&&rule.parent.name.includes('keyframes'))return;rule.selector=rule.selectors.map(s=>s===':root'||s==='html'||s==='body'?'.signin-template':s==='*'?'.signin-template, .signin-template *':'.signin-template '+s).join(', ');});
fs.writeFileSync('src/app/login/template.css',tree.toString());
const sourceModule=html.match(/<script type="module">([\s\S]*?)<\/script>/)[1];
let engine=sourceModule.slice(0,sourceModule.indexOf('    // Khởi tạo & Gắn sự kiện điều khiển'));
function replace(oldText,newText){if(!engine.includes(oldText))throw Error('Template import mismatch: '+oldText);engine=engine.replace(oldText,newText);}
engine="import {batchTemplateGeometry} from './batch-template-geometry.js';\n"+engine;
replace('class OmsUltraDenseHub {','export class OmsUltraDenseHub {');
replace('        this.buildInternalOmsDataFibers();','        this.buildInternalOmsDataFibers();\n        batchTemplateGeometry(this);');
replace("'OMS DIGITAL TWIN • VN01'","'OMS • QUẢN LÝ ĐƠN HÀNG'");
replace('aspect < 1.05 ? this.frustumSize / Math.max(0.76, aspect) : this.frustumSize','Math.max(this.frustumSize, 15.8 / aspect)');
// Recenter the taller supplied model after removal of its original large header.
replace('new THREE.Vector3(0, 1.35, 0)','new THREE.Vector3(0, 2.0, 0)');
replace('new THREE.Vector3(0, 1.35, 0)','new THREE.Vector3(0, 2.0, 0)');
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
replace('        this.isTransitioningCamera = true;\n      }','        this.isTransitioningCamera = true;\n        if (!this.running) this.snapCamera();\n      }');
replace('this.targetAzimuthOffset -= Math.PI / 4;','if (!this.running) { this.rotateAroundTarget(-Math.PI / 4); this.renderFrame(); } else this.targetAzimuthOffset -= Math.PI / 4;');
replace('this.targetAzimuthOffset += Math.PI / 4;','if (!this.running) { this.rotateAroundTarget(Math.PI / 4); this.renderFrame(); } else this.targetAzimuthOffset += Math.PI / 4;');
replace('        ro.observe(this.container);','        ro.observe(this.container);\n        this.resizeObserver = ro;');
replace('        this.renderer.setSize(width, height);\n      }','        this.renderer.setSize(width, height);\n        this.renderFrame();\n      }');
const extra=`
      snapCamera() {
        this.camera.position.copy(this.desiredCameraPos);
        this.controls.target.copy(this.desiredTarget);
        this.camera.zoom = this.desiredZoom;
        this.camera.updateProjectionMatrix();
        this.isTransitioningCamera = false;
        this.controls.update(); this.renderFrame();
      }
      renderFrame() {
        if (this.disposed || !this.renderer || !this.controls) return;
        this.renderer.render(this.scene, this.camera);
        this.container.dataset.frames = String(++this.frames);
        this.container.dataset.pose = this.camera.position.toArray().map(n => n.toFixed(3)).join(',');
        this.container.dataset.drawCalls = String(this.renderer.info.render.calls);
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
fs.writeFileSync('src/app/login/digital-twin.js','// Imported from operator-provided Untitled-1.html. Geometry preserved; lifecycle adapted for React.\n'+engine);
console.log('Imported model and scoped CSS; SHA256 '+crypto.createHash('sha256').update(original).digest('hex'));
