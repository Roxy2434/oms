// Model only from operator 12345tyu.html; lifecycle adapted for React. Regenerate: node scripts/import-login-precision.mjs
import {batchTemplateGeometry} from './batch-template-geometry.js';

    import * as THREE from 'three';
    import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
    import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
    import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

    export class OmsPrecisionDiorama {
      constructor(container, options = {}) {
        this.container = container;
        this.options = options;
        this.autoRotateEnabled = true;
        this.userInteracting = false;
        this.isResettingCamera = false;
        this.targetAzimuthOffset = 0;

        this.C = {
          primaryBlue: 0x2859d9,
          mediumBlue: 0x4b8de5,
          navy: 0x193254,
          darkSteel: 0x1e293b,
          offWhite: 0xf8fafc,
          lightGray: 0xe2e8f0,
          aluminum: 0x94a3b8,
          cardboard: 0xd9b778,
          cardboardDark: 0xc29b58,
          palletWood: 0xb88b4a,
          cyanGlow: 0x0ea5e9,
          amberGlow: 0xf59e0b,
          emeraldGlow: 0x10b981,
          crimson: 0xdc2626,
          robotOrange: 0xf97316,
          safetyYellow: 0xfacc15,
          foliageGreen: 0x15803d,
          foliageLight: 0x22c55e,
          brass: 0xd4af37,
        };

        this.scene = new THREE.Scene();
        this.modelRoot = new THREE.Group();
        this.scene.add(this.modelRoot);
        this.elapsed = 0; this.lastFrame = 0; this.running = false; this.disposed = false; this.frames = 0;

        this.frustumSize = 12.5;
        this.defaultSpherical = {
          radius: 26,
          phi: Math.PI / 3.08,
          theta: Math.PI / 4.15,
        };
        this.defaultTarget = new THREE.Vector3(0, 1.42, 0.15);

        // Danh sách các cụm chuyển động
        this.conveyorBoxes = [];
        this.spurBoxes = [];
        this.monorailCarriers = [];
        this.hvacFans = [];
        this.pulsePackets = [];
        this.serverBlinkLeds = [];
        this.agvFleet = [];
        this.drones = [];
        this.robots = [];
        this.wrappers = [];
        this.asrsCranes = [];
        this.movingTruckWheels = [];
        this.truckTime = 0;
        this.prevTruckZ = 3.82;

        // Khoảng near=5.0, far=55.0 tối ưu độ phân giải Z-Buffer
        const aspect = Math.max(1, container.clientWidth) / Math.max(1, container.clientHeight);
        this.camera = new THREE.OrthographicCamera(
          (-this.frustumSize * aspect) / 2,
          (this.frustumSize * aspect) / 2,
          this.frustumSize / 2,
          -this.frustumSize / 2,
          5.0,
          55.0
        );

        try {
        this.initRenderer();
        this.initStudioEnvironmentAndLights();
        this.initControls();
        this.initSharedMaterials();

        // XÂY DỰNG 16 PHÂN KHU VỚI TỌA ĐỘ TÁCH LỚP TUYỆT ĐỐI
        this.buildPrecisionPlinth();
        this.buildZeroFlickerBuildingShell();
        this.buildSixTierAsrsAndTwinCranes();
        this.buildColdChainChamberAndPiping();
        this.buildOverheadMonorailAndDrones();
        this.buildUnderMezzanineTechRooms();
        this.buildUpperMezzanineCommandAndBoardroom();
        this.buildSwitchbackSteelStaircase();
        this.buildMultiLoopSorterAndFourSpurs();
        this.buildFourPackingStationsAndStaging();
        this.buildRoboticPalletizingCell();
        this.buildAgvSwarmAndReachForklifts();
        this.buildTripleLoadingDocksAndDetailedFleet();
        this.buildYardSubstationGuardhouseAndTrees();
        this.buildDetailedHumanStaff();
        this.buildInternalOmsDataFibers();
        batchTemplateGeometry(this);

        this.setupResize();
        this.handleResize();
        this.renderFrame();

        requestAnimationFrame(() => { if (!this.disposed) this.options.onReady?.(); });
        } catch (error) { this.dispose(); throw error; }
      }

      initRenderer() {
        this.renderer = new THREE.WebGLRenderer({
          antialias: true,
          alpha: true,
          powerPreference: 'low-power',
        });
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.06;
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        this.renderer.domElement.className = "warehouse-canvas";
        this.renderer.domElement.setAttribute("aria-hidden", "true");
        this.container.appendChild(this.renderer.domElement);
      }

      initStudioEnvironmentAndLights() {
        const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
        pmremGenerator.compileEquirectangularShader();
        const roomEnv = new RoomEnvironment();
        this.environmentTarget = pmremGenerator.fromScene(roomEnv, 0.04);
        this.scene.environment = this.environmentTarget.texture;
        pmremGenerator.dispose();
        roomEnv.dispose();

        const hemiLight = new THREE.HemisphereLight(0xffffff, 0xdbeafe, 0.8);
        hemiLight.position.set(0, 24, 0);
        this.scene.add(hemiLight);

        const keyLight = new THREE.DirectionalLight(0xfffdf9, 1.98);
        keyLight.position.set(-14, 26, 16);
        keyLight.castShadow = true;
        keyLight.shadow.mapSize.set(1024, 1024);
        keyLight.shadow.camera.near = 6;
        keyLight.shadow.camera.far = 52;
        const d = 9.2;
        keyLight.shadow.camera.left = -d;
        keyLight.shadow.camera.right = d;
        keyLight.shadow.camera.top = d;
        keyLight.shadow.camera.bottom = -d;
        keyLight.shadow.bias = -0.0005;
        keyLight.shadow.normalBias = 0.022;
        this.scene.add(keyLight);

        const fillLight = new THREE.DirectionalLight(0x93c5fd, 0.68);
        fillLight.position.set(16, 12, -12);
        this.scene.add(fillLight);

        const rimLight = new THREE.DirectionalLight(0xe0f2fe, 0.62);
        rimLight.position.set(-6, 14, -18);
        this.scene.add(rimLight);
      }

      initControls() {
        this.setCameraSpherical(
          this.defaultSpherical.radius,
          this.defaultSpherical.phi,
          this.defaultSpherical.theta
        );

        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.target.copy(this.defaultTarget);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.06;
        this.controls.enablePan = true;
        this.controls.screenSpacePanning = true;
        this.controls.minPolarAngle = Math.PI / 6.0;
        this.controls.maxPolarAngle = Math.PI / 2.28;
        this.controls.minZoom = 0.75;
        this.controls.maxZoom = 3.8;

        this.controls.addEventListener('start', () => {
          this.userInteracting = true;
          this.isResettingCamera = false;
          this.targetAzimuthOffset = 0;
        });
        this.controls.addEventListener('end', () => {
          this.userInteracting = false;
        });
        this.controls.update();
        this.renderer.domElement.style.touchAction = "pan-y";
        this.controls.addEventListener("change", () => { if (!this.running) this.renderFrame(); });
      }

      setCameraSpherical(radius, phi, theta) {
        const sinPhiRadius = Math.sin(phi) * radius;
        this.camera.position.set(
          this.defaultTarget.x + sinPhiRadius * Math.sin(theta),
          this.defaultTarget.y + Math.cos(phi) * radius,
          this.defaultTarget.z + sinPhiRadius * Math.cos(theta)
        );
        this.camera.lookAt(this.defaultTarget);
      }

      initSharedMaterials() {
        const corrugatedTex = this.createCorrugatedCladdingTexture();
        const cartonTex = this.createCartonBoxTexture('#D9B778', '#B8924E');
        const cartonDarkTex = this.createCartonBoxTexture('#C49E5A', '#9E7836');
        const wheelCapTex = this.createWheelCapTexture();
        const tireTreadTex = this.createTireTreadTexture();
        const truckSideTex = this.createTruckBoxTexture();

        this.mats = {
          wallCladding: new THREE.MeshStandardMaterial({
            color: this.C.offWhite,
            map: corrugatedTex,
            roughness: 0.36,
            metalness: 0.1,
          }),
          truckBodyMat: new THREE.MeshStandardMaterial({
            map: truckSideTex,
            roughness: 0.32,
            metalness: 0.15,
          }),
          smoothWhite: new THREE.MeshStandardMaterial({
            color: this.C.offWhite,
            roughness: 0.32,
            metalness: 0.08,
          }),
          panelSeam: new THREE.MeshStandardMaterial({
            color: 0xcbd5e1,
            roughness: 0.48,
            metalness: 0.22,
          }),
          navySteel: new THREE.MeshStandardMaterial({
            color: this.C.navy,
            roughness: 0.3,
            metalness: 0.62,
          }),
          structuralSteel: new THREE.MeshStandardMaterial({
            color: 0x243b61,
            roughness: 0.32,
            metalness: 0.58,
          }),
          darkMetal: new THREE.MeshStandardMaterial({
            color: 0x0f172a,
            roughness: 0.28,
            metalness: 0.75,
          }),
          primaryBlueMetal: new THREE.MeshStandardMaterial({
            color: this.C.primaryBlue,
            roughness: 0.28,
            metalness: 0.38,
          }),
          mediumBlueMetal: new THREE.MeshStandardMaterial({
            color: this.C.mediumBlue,
            roughness: 0.3,
            metalness: 0.32,
          }),
          robotOrangeMetal: new THREE.MeshStandardMaterial({
            color: this.C.robotOrange,
            roughness: 0.24,
            metalness: 0.45,
          }),
          safetyYellow: new THREE.MeshStandardMaterial({
            color: this.C.safetyYellow,
            roughness: 0.28,
            metalness: 0.25,
          }),
          crimsonPaint: new THREE.MeshStandardMaterial({
            color: this.C.crimson,
            roughness: 0.3,
            metalness: 0.35,
          }),
          brushedAluminum: new THREE.MeshStandardMaterial({
            color: 0xd1d9e6,
            roughness: 0.22,
            metalness: 0.82,
          }),
          chromeRoller: new THREE.MeshStandardMaterial({
            color: 0xf8fafc,
            roughness: 0.12,
            metalness: 0.92,
          }),
          brassMetal: new THREE.MeshStandardMaterial({
            color: this.C.brass,
            roughness: 0.24,
            metalness: 0.82,
          }),
          cardboard: new THREE.MeshStandardMaterial({
            map: cartonTex,
            roughness: 0.76,
            metalness: 0.02,
          }),
          cardboardDark: new THREE.MeshStandardMaterial({
            map: cartonDarkTex,
            roughness: 0.78,
            metalness: 0.02,
          }),
          coldChainBox: new THREE.MeshStandardMaterial({
            color: 0xe0f2fe,
            roughness: 0.28,
            metalness: 0.15,
          }),
          palletWood: new THREE.MeshStandardMaterial({
            color: this.C.palletWood,
            roughness: 0.82,
            metalness: 0.02,
          }),
          foliageDark: new THREE.MeshStandardMaterial({ color: this.C.foliageGreen, roughness: 0.75 }),
          foliageBright: new THREE.MeshStandardMaterial({ color: this.C.foliageLight, roughness: 0.7 }),
          rubberBlack: new THREE.MeshStandardMaterial({ color: 0x181f2c, roughness: 0.85, metalness: 0.05 }),
          tireTreadMat: new THREE.MeshStandardMaterial({
            map: tireTreadTex,
            roughness: 0.82,
            metalness: 0.08,
          }),
          wheelSideCapMat: new THREE.MeshStandardMaterial({
            map: wheelCapTex,
            roughness: 0.35,
            metalness: 0.45,
          }),
          stretchFilm: new THREE.MeshPhysicalMaterial({
            color: 0xe0f2fe,
            transparent: true,
            opacity: 0.38,
            roughness: 0.1,
            transmission: 0.45,
            depthWrite: false,
          }),
          architecturalGlass: new THREE.MeshPhysicalMaterial({
            color: 0xdbeafe,
            transparent: true,
            opacity: 0.3,
            roughness: 0.08,
            metalness: 0.1,
            transmission: 0.62,
            ior: 1.48,
            depthWrite: false,
          }),
          coldGlass: new THREE.MeshPhysicalMaterial({
            color: 0x7dd3fc,
            transparent: true,
            opacity: 0.4,
            roughness: 0.2,
            transmission: 0.5,
            depthWrite: false,
          }),
          cyanEmissive: new THREE.MeshStandardMaterial({
            color: this.C.cyanGlow,
            emissive: this.C.cyanGlow,
            emissiveIntensity: 1.25,
          }),
          amberEmissive: new THREE.MeshStandardMaterial({
            color: this.C.amberGlow,
            emissive: this.C.amberGlow,
            emissiveIntensity: 1.2,
          }),
          emeraldEmissive: new THREE.MeshStandardMaterial({
            color: this.C.emeraldGlow,
            emissive: this.C.emeraldGlow,
            emissiveIntensity: 1.25,
          }),
          crimsonEmissive: new THREE.MeshStandardMaterial({
            color: this.C.crimson,
            emissive: this.C.crimson,
            emissiveIntensity: 1.2,
          }),
        };
      }

      // Texture mặt bên Bánh xe (Lốp cao su + Mâm hợp kim + 10 Ốc bu-lông + Lỗ thoát nhiệt)
      // Đặt trực tiếp lên 2 nắp của khối trụ bánh xe -> Không bao giờ có 2 mặt phẳng đè lên nhau!
      createWheelCapTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 256;
        const ctx = canvas.getContext('2d');
        const cx = 128, cy = 128;

        // Nền cao su lốp
        ctx.fillStyle = '#18202C';
        ctx.fillRect(0, 0, 256, 256);

        // Vòng gân hông lốp
        ctx.strokeStyle = '#253042';
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.arc(cx, cy, 108, 0, Math.PI * 2);
        ctx.stroke();

        // Mâm hợp kim nhôm sáng (Alloy Rim)
        ctx.fillStyle = '#D4DCE8';
        ctx.beginPath();
        ctx.arc(cx, cy, 74, 0, Math.PI * 2);
        ctx.fill();

        // Vành lòng mâm sâu
        ctx.strokeStyle = '#94A3B8';
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.arc(cx, cy, 62, 0, Math.PI * 2);
        ctx.stroke();

        // 8 Lỗ thông gió quanh mâm xe tải và 10 ốc tắc-kê (Lug Nuts)
        for (let i = 0; i < 8; i++) {
          const angle = (i * Math.PI) / 4;
          const vx = cx + Math.cos(angle) * 48;
          const vy = cy + Math.sin(angle) * 48;
          ctx.fillStyle = '#1E293B';
          ctx.beginPath();
          ctx.arc(vx, vy, 7, 0, Math.PI * 2);
          ctx.fill();
        }

        for (let i = 0; i < 10; i++) {
          const angle = (i * Math.PI) / 5;
          const bx = cx + Math.cos(angle) * 32;
          const by = cy + Math.sin(angle) * 32;
          ctx.fillStyle = '#475569';
          ctx.beginPath();
          ctx.arc(bx, by, 3.5, 0, Math.PI * 2);
          ctx.fill();
        }

        // Bầu trục cầu xe (Center Axle Hub)
        ctx.fillStyle = '#193254';
        ctx.beginPath();
        ctx.arc(cx, cy, 22, 0, Math.PI * 2);
        ctx.fill();

        const tex = new THREE.CanvasTexture(canvas);
        tex.colorSpace = THREE.SRGBColorSpace;
        return tex;
      }

      createTireTreadTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 128;
        canvas.height = 128;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#18202C';
        ctx.fillRect(0, 0, 128, 128);
        ctx.fillStyle = '#0F141C';
        for (let y = 0; y < 128; y += 16) {
          ctx.fillRect(0, y, 128, 6);
        }
        const tex = new THREE.CanvasTexture(canvas);
        tex.wrapS = THREE.RepeatWrapping;
        tex.wrapT = THREE.RepeatWrapping;
        tex.repeat.set(1, 4);
        tex.colorSpace = THREE.SRGBColorSpace;
        return tex;
      }

      // Texture thành thùng xe tải tích hợp sẵn Gân sóng + Dải thương hiệu xanh OMS + Vạch phản quang
      // Giúp thùng xe hoàn toàn liền khối, không cần đắp các miếng Box phụ gây nhấp nháy!
      createTruckBoxTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 256;
        const ctx = canvas.getContext('2d');

        ctx.fillStyle = '#F8FAFC';
        ctx.fillRect(0, 0, 512, 256);

        // Các gân tôn sóng đứng trên thùng xe
        for (let x = 0; x < 512; x += 24) {
          ctx.fillStyle = '#E2E8F0';
          ctx.fillRect(x, 0, 5, 256);
        }

        // Dải thương hiệu OMS màu xanh chạy ngang giữa thùng xe
        ctx.fillStyle = '#2859D9';
        ctx.fillRect(0, 96, 512, 52);

        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 28px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('EZMART', 256, 122);

        // Vạch phản quang vàng/đỏ an toàn dọc mép dưới thùng xe
        for (let x = 0; x < 512; x += 32) {
          ctx.fillStyle = (x / 32) % 2 === 0 ? '#FACC15' : '#EF4444';
          ctx.fillRect(x, 236, 24, 10);
        }

        const tex = new THREE.CanvasTexture(canvas);
        tex.colorSpace = THREE.SRGBColorSpace;
        return tex;
      }

      createCorrugatedCladdingTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 256;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#F8FAFC';
        ctx.fillRect(0, 0, 256, 256);

        for (let x = 0; x < 256; x += 16) {
          ctx.fillStyle = '#E2E8F0';
          ctx.fillRect(x, 0, 4, 256);
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(x + 4, 0, 4, 256);
        }
        ctx.strokeStyle = '#CBD5E1';
        ctx.lineWidth = 3;
        ctx.strokeRect(0, 0, 256, 256);

        const tex = new THREE.CanvasTexture(canvas);
        tex.wrapS = THREE.RepeatWrapping;
        tex.wrapT = THREE.RepeatWrapping;
        tex.repeat.set(2, 1);
        tex.colorSpace = THREE.SRGBColorSpace;
        return tex;
      }

      createCartonBoxTexture(baseHex, stripeHex) {
        const canvas = document.createElement('canvas');
        canvas.width = 128;
        canvas.height = 128;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = baseHex;
        ctx.fillRect(0, 0, 128, 128);

        ctx.fillStyle = '#E8D5A7';
        ctx.fillRect(0, 56, 128, 16);

        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(16, 18, 44, 30);
        ctx.fillStyle = '#2859D9';
        ctx.fillRect(16, 18, 44, 8);

        ctx.fillStyle = '#0F172A';
        for (let bx = 20; bx < 56; bx += 4) {
          ctx.fillRect(bx, 30, 2, 14);
        }

        ctx.fillStyle = stripeHex;
        ctx.fillRect(82, 82, 28, 6);
        ctx.fillRect(88, 72, 6, 16);
        ctx.fillRect(100, 72, 6, 16);

        const tex = new THREE.CanvasTexture(canvas);
        tex.colorSpace = THREE.SRGBColorSpace;
        return tex;
      }

      // 1. ĐẾ SA BÀN KIẾN TRÚC (TÁCH LỚP CAO ĐỘ TUYỆT ĐỐI)
      buildPrecisionPlinth() {
        const plinthGroup = new THREE.Group();

        const lowerBase = new THREE.Mesh(
          new RoundedBoxGeometry(12.1, 0.36, 10.5, 4, 0.12),
          this.mats.navySteel
        );
        lowerBase.position.set(0, -0.32, 0.2);
        lowerBase.receiveShadow = true;
        plinthGroup.add(lowerBase);

        const midTrim = new THREE.Mesh(
          new THREE.BoxGeometry(11.86, 0.04, 10.26),
          this.mats.brassMetal
        );
        midTrim.position.set(0, -0.12, 0.2);
        plinthGroup.add(midTrim);

        const topFloor = new THREE.Mesh(
          new THREE.BoxGeometry(11.76, 0.1, 10.16),
          new THREE.MeshStandardMaterial({
            map: this.createMasterFloorTexture(),
            roughness: 0.56,
            metalness: 0.06,
          })
        );
        topFloor.position.set(0, -0.05, 0.2);
        topFloor.receiveShadow = true;
        plinthGroup.add(topFloor);

        // Biển đồng khắc tên gắn ở mặt trước đế (Tách lớp Z rõ ràng)
        const plaqueFrame = new THREE.Mesh(
          new THREE.BoxGeometry(3.5, 0.24, 0.04),
          this.mats.brassMetal
        );
        plaqueFrame.position.set(0, -0.32, 5.47);
        const plaqueFace = new THREE.Mesh(
          new THREE.BoxGeometry(3.42, 0.18, 0.03),
          new THREE.MeshStandardMaterial({
            map: this.createBadgeTexture('EZMART • QUẢN LÝ ĐƠN HÀNG', '#0F172A', '#F8FAFC'),
            roughness: 0.25,
          })
        );
        plaqueFace.position.set(0, -0.32, 5.505);
        plinthGroup.add(plaqueFrame, plaqueFace);

        const sCanvas = document.createElement('canvas');
        sCanvas.width = 256;
        sCanvas.height = 256;
        const sctx = sCanvas.getContext('2d');
        const grad = sctx.createRadialGradient(128, 128, 28, 128, 128, 124);
        grad.addColorStop(0, 'rgba(25, 50, 84, 0.28)');
        grad.addColorStop(0.68, 'rgba(25, 50, 84, 0.08)');
        grad.addColorStop(1, 'rgba(25, 50, 84, 0)');
        sctx.fillStyle = grad;
        sctx.fillRect(0, 0, 256, 256);

        const shadowPlane = new THREE.Mesh(
          new THREE.PlaneGeometry(14.8, 13.4),
          new THREE.MeshBasicMaterial({
            map: new THREE.CanvasTexture(sCanvas),
            transparent: true,
            depthWrite: false,
          })
        );
        shadowPlane.rotation.x = -Math.PI / 2;
        shadowPlane.position.set(0, -0.53, 0.2);
        plinthGroup.add(shadowPlane);

        this.modelRoot.add(plinthGroup);
      }

      createMasterFloorTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 2048;
        canvas.height = 2048;
        const ctx = canvas.getContext('2d');

        ctx.fillStyle = '#E6EEF8';
        ctx.fillRect(0, 0, 2048, 2048);

        ctx.strokeStyle = 'rgba(25, 50, 84, 0.075)';
        ctx.lineWidth = 3;
        for (let i = 0; i <= 2048; i += 128) {
          ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, 2048); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(2048, i); ctx.stroke();
        }

        // Đường dẫn từ tính AGV + Mã QR định vị
        ctx.strokeStyle = '#2859D9';
        ctx.lineWidth = 10;
        ctx.strokeRect(170, 1270, 920, 350);
        ctx.fillStyle = '#193254';
        for (let x = 220; x <= 1040; x += 164) {
          ctx.fillRect(x - 12, 1258, 24, 24);
          ctx.fillRect(x - 12, 1608, 24, 24);
        }

        // Hành lang đi bộ an toàn
        ctx.fillStyle = '#FFFFFF';
        for (let y = 1285; y < 1600; y += 38) {
          ctx.fillRect(95, y, 52, 20);
        }

        // Sân nhựa Asphalt khu vực 3 Khoang Xuất hàng
        ctx.fillStyle = '#BCCCE0';
        ctx.fillRect(1100, 1110, 910, 900);

        // 3 Ô đỗ xe tải (Bay 01, Bay 02, Bay 03)
        ctx.strokeStyle = '#F8FAFC';
        ctx.lineWidth = 12;
        ctx.strokeRect(1155, 1160, 245, 680);
        ctx.strokeRect(1440, 1160, 235, 650);
        ctx.strokeRect(1715, 1160, 225, 600);

        // Vạch vàng/đen cảnh báo dọc mép Dock
        for (let x = 1130; x < 1970; x += 40) {
          ctx.fillStyle = (x / 40) % 2 === 0 ? '#FACC15' : '#1E293B';
          ctx.fillRect(x, 1120, 20, 28);
        }

        const tex = new THREE.CanvasTexture(canvas);
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.anisotropy = 8;
        return tex;
      }

      // 2. KẾT CẤU VỎ NHÀ KHO, CỘT CHỮ H, GIÀN KÈO KHÔNG GIAN & XÀ GỒ MÁI
      buildZeroFlickerBuildingShell() {
        const shellGroup = new THREE.Group();

        const slab = new THREE.Mesh(
          new THREE.BoxGeometry(10.6, 0.18, 6.6),
          new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.45 })
        );
        slab.position.set(0, 0.09, -1.05);
        slab.receiveShadow = true;
        shellGroup.add(slab);

        const backWall = new THREE.Mesh(
          new THREE.BoxGeometry(10.6, 4.4, 0.2),
          this.mats.wallCladding
        );
        backWall.position.set(0, 2.38, -4.36);
        backWall.castShadow = true;
        backWall.receiveShadow = true;
        shellGroup.add(backWall);

        const leftWall = new THREE.Mesh(
          new THREE.BoxGeometry(0.2, 4.4, 6.4),
          this.mats.wallCladding
        );
        leftWall.position.set(-5.3, 2.38, -1.05);
        leftWall.castShadow = true;
        leftWall.receiveShadow = true;
        shellGroup.add(leftWall);

        // Tủ điện tổng & Trạm cứu hỏa vách tường bên trong tường trái
        const mainSwitchboard = new THREE.Mesh(new RoundedBoxGeometry(0.16, 0.9, 0.65, 2, 0.02), this.mats.brushedAluminum);
        mainSwitchboard.position.set(-5.08, 1.12, 1.25);
        const fireHoseReel = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.08, 16), this.mats.crimsonPaint);
        fireHoseReel.rotation.z = Math.PI / 2;
        fireHoseReel.position.set(-5.1, 1.15, 1.82);
        shellGroup.add(mainSwitchboard, fireHoseReel);

        // Hệ Cột thép chữ H
        [-5.06, -2.53, 0, 2.53, 5.06].forEach((cx) => {
          const backCol = this.createHBeamColumn(4.4);
          backCol.position.set(cx, 2.38, -4.12);
          shellGroup.add(backCol);

          const frontCol = this.createHBeamColumn(4.4);
          frontCol.position.set(cx, 2.38, 2.04);
          shellGroup.add(frontCol);
        });

        // Dầm vòng đỉnh tường (Roof Ring Beam)
        const frontRingBeam = new THREE.Mesh(
          new THREE.BoxGeometry(10.84, 0.26, 0.22),
          this.mats.primaryBlueMetal
        );
        frontRingBeam.position.set(0, 4.71, 2.18);
        frontRingBeam.castShadow = true;

        const backRingBeam = new THREE.Mesh(
          new THREE.BoxGeometry(10.84, 0.26, 0.22),
          this.mats.primaryBlueMetal
        );
        backRingBeam.position.set(0, 4.71, -4.38);

        const leftRingBeam = new THREE.Mesh(
          new THREE.BoxGeometry(0.22, 0.26, 6.32),
          this.mats.primaryBlueMetal
        );
        leftRingBeam.position.set(-5.3, 4.71, -1.1);

        const rightRingBeam = new THREE.Mesh(
          new THREE.BoxGeometry(0.22, 0.26, 6.32),
          this.mats.primaryBlueMetal
        );
        rightRingBeam.position.set(5.3, 4.71, -1.1);
        shellGroup.add(frontRingBeam, backRingBeam, leftRingBeam, rightRingBeam);

        // Giàn vì kèo thép không gian & Đèn xưởng
        [-3.8, -2.53, -1.26, 0, 1.26, 2.53, 3.8].forEach((tx, idx) => {
          const truss = this.createPrecisionPrattTruss(5.96);
          truss.position.set(tx, 4.35, -1.04);
          shellGroup.add(truss);

          [-2.7, -0.6, 1.15].forEach((lz) => {
            if (idx % 2 === 0) {
              const lampBody = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.04, 0.16), this.mats.navySteel);
              lampBody.position.set(tx, 4.14, lz);
              const lampGlow = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.02, 0.12), this.mats.cyanEmissive);
              lampGlow.position.set(tx, 4.10, lz);
              shellGroup.add(lampBody, lampGlow);
            }
          });
        });

        // Hệ Xà gồ thép trên lưng giàn kèo
        [-3.6, -2.8, -2.0, -1.2, -0.4, 0.4, 1.2].forEach((pz) => {
          const purlin = new THREE.Mesh(new THREE.BoxGeometry(10.0, 0.035, 0.035), this.mats.brushedAluminum);
          purlin.position.set(0, 4.54, pz);
          shellGroup.add(purlin);
        });

        // Ống gió điều hòa tròn Inox & Ống cứu hỏa PCCC đỏ
        const mainHvacDuct = new THREE.Mesh(
          new THREE.CylinderGeometry(0.15, 0.15, 9.8, 20),
          this.mats.brushedAluminum
        );
        mainHvacDuct.rotation.z = Math.PI / 2;
        mainHvacDuct.position.set(0, 4.02, -1.55);
        shellGroup.add(mainHvacDuct);

        const firePipeMain = new THREE.Mesh(
          new THREE.CylinderGeometry(0.032, 0.032, 9.8, 12),
          this.mats.crimsonPaint
        );
        firePipeMain.rotation.z = Math.PI / 2;
        firePipeMain.position.set(0, 4.24, -0.45);
        shellGroup.add(firePipeMain);

        // Tấm mái lợp Cutaway
        const mainRoof = new THREE.Mesh(
          new RoundedBoxGeometry(10.88, 0.18, 3.9, 3, 0.04),
          this.mats.primaryBlueMetal
        );
        mainRoof.position.set(0, 4.93, -2.52);
        mainRoof.castShadow = true;
        mainRoof.receiveShadow = true;
        shellGroup.add(mainRoof);

        // Giếng trời lấy sáng trên mái
        [-3.3, -1.35].forEach((sx) => {
          const skylightCurb = new THREE.Mesh(new THREE.BoxGeometry(1.42, 0.1, 2.7), this.mats.navySteel);
          skylightCurb.position.set(sx, 5.07, -2.52);
          const skylightGlass = new THREE.Mesh(
            new THREE.BoxGeometry(1.28, 0.06, 2.56),
            new THREE.MeshStandardMaterial({ color: 0xe0f2fe, emissive: 0x38bdf8, emissiveIntensity: 0.22, roughness: 0.15 })
          );
          skylightGlass.position.set(sx, 5.15, -2.52);
          shellGroup.add(skylightCurb, skylightGlass);
        });

        // 8 Tấm Pin năng lượng mặt trời
        for (let row = 0; row < 2; row++) {
          for (let sp = 0; sp < 4; sp++) {
            const solarPanel = this.createSolarPanelModule();
            solarPanel.position.set(0.45 + sp * 1.06, 5.16, -3.6 + row * 1.12);
            shellGroup.add(solarPanel);
          }
        }

        // 2 Cụm Máy làm mát Chiller công nghiệp
        const hvacUnit1 = this.createDetailedHvacUnit();
        hvacUnit1.position.set(3.85, 5.02, -1.45);
        const hvacUnit2 = this.createDetailedHvacUnit();
        hvacUnit2.scale.set(0.75, 0.85, 0.75);
        hvacUnit2.position.set(1.85, 5.02, -1.45);
        shellGroup.add(hvacUnit1, hvacUnit2);

        const telemetryTower = this.createRooftopTelemetryTower();
        telemetryTower.position.set(-4.65, 5.02, -3.85);
        shellGroup.add(telemetryTower);

        // Vách kính Curtain Wall mặt tiền bên trái
        const curtainGlass = new THREE.Mesh(
          new THREE.BoxGeometry(4.95, 4.36, 0.03),
          this.mats.architecturalGlass
        );
        curtainGlass.position.set(-2.54, 2.38, 2.24);
        shellGroup.add(curtainGlass);

        [1.35, 2.58, 3.8].forEach((my) => {
          const bar = new THREE.Mesh(new THREE.BoxGeometry(5.05, 0.05, 0.08), this.mats.structuralSteel);
          bar.position.set(-2.54, my, 2.24);
          shellGroup.add(bar);
        });

        const brandSign = new THREE.Mesh(
          new THREE.BoxGeometry(3.9, 0.48, 0.06),
          new THREE.MeshStandardMaterial({
            map: this.createBadgeTexture('EZMART • QUẢN LÝ ĐƠN HÀNG', '#193254', '#F8FAFC'),
            roughness: 0.25,
          })
        );
        brandSign.position.set(-2.54, 4.72, 2.35);
        shellGroup.add(brandSign);

        this.modelRoot.add(shellGroup);
      }

      createHBeamColumn(height) {
        const group = new THREE.Group();
        const web = new THREE.Mesh(new THREE.BoxGeometry(0.05, height, 0.13), this.mats.structuralSteel);
        const flange1 = new THREE.Mesh(new THREE.BoxGeometry(0.16, height, 0.035), this.mats.structuralSteel);
        flange1.position.z = 0.0825;
        const flange2 = new THREE.Mesh(new THREE.BoxGeometry(0.16, height, 0.035), this.mats.structuralSteel);
        flange2.position.z = -0.0825;

        const basePlate = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.06, 0.28), this.mats.safetyYellow);
        basePlate.position.y = -height / 2 + 0.03;

        group.add(web, flange1, flange2, basePlate);
        group.traverse((m) => { if (m.isMesh) m.castShadow = true; });
        return group;
      }

      createPrecisionPrattTruss(length) {
        const group = new THREE.Group();
        const topChord = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.05, length), this.mats.brushedAluminum);
        topChord.position.y = 0.14;
        const bottomChord = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.05, length), this.mats.brushedAluminum);
        bottomChord.position.y = -0.14;
        group.add(topChord, bottomChord);

        for (let z = -length / 2 + 0.35; z <= length / 2 - 0.35; z += 0.55) {
          const post = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.22, 0.04), this.mats.brushedAluminum);
          post.position.z = z;
          group.add(post);

          if (z + 0.275 < length / 2 - 0.2) {
            const diag = new THREE.Mesh(new THREE.BoxGeometry(0.032, 0.23, 0.032), this.mats.brushedAluminum);
            diag.position.z = z + 0.275;
            diag.rotation.x = 0.72;
            group.add(diag);
          }
        }
        return group;
      }

      createRooftopTelemetryTower() {
        const group = new THREE.Group();
        const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.075, 1.35, 12), this.mats.brushedAluminum);
        mast.position.y = 0.68;
        const dish = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.05, 0.1, 20), this.mats.smoothWhite);
        dish.rotation.z = Math.PI / 3;
        dish.position.set(0.12, 0.95, 0);
        const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 12), this.mats.crimsonEmissive);
        beacon.position.y = 1.38;
        group.add(mast, dish, beacon);
        return group;
      }

      createSolarPanelModule() {
        const group = new THREE.Group();
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.14, 0.06), this.mats.navySteel);
        leg.position.set(0, -0.04, -0.22);
        const frame = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.03, 0.94), this.mats.brushedAluminum);
        frame.rotation.x = 0.22;
        const cells = new THREE.Mesh(
          new THREE.BoxGeometry(0.86, 0.02, 0.88),
          new THREE.MeshStandardMaterial({ color: 0x0f2942, roughness: 0.14, metalness: 0.8 })
        );
        cells.position.y = 0.025;
        cells.rotation.x = 0.22;
        group.add(leg, frame, cells);
        return group;
      }

      createDetailedHvacUnit() {
        const group = new THREE.Group();
        const housing = new THREE.Mesh(new RoundedBoxGeometry(1.6, 0.54, 1.04, 3, 0.04), this.mats.smoothWhite);
        housing.position.y = 0.27;
        housing.castShadow = true;
        group.add(housing);

        [-0.4, 0.4].forEach((fx) => {
          const shroud = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.3, 0.1, 20), this.mats.navySteel);
          shroud.position.set(fx, 0.59, 0);
          const fanGroup = new THREE.Group();
          fanGroup.position.set(fx, 0.62, 0);
          for (let b = 0; b < 4; b++) {
            const blade = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.015, 0.08), this.mats.brushedAluminum);
            blade.rotation.y = (b * Math.PI) / 4;
            fanGroup.add(blade);
          }
          this.hvacFans.push(fanGroup);
          group.add(shroud, fanGroup);
        });
        return group;
      }

      // 3. HỆ KỆ CAO TẦNG 4 DÃY 6 TẦNG + 2 CẦN TRỤC AS/RS ĐÔI (TÁCH LỚP CỘT KỆ & DẦM KỆ)
      buildSixTierAsrsAndTwinCranes() {
        const asrsGroup = new THREE.Group();
        asrsGroup.position.set(-2.55, 0.18, -2.25);

        const rackZOffsets = [-1.62, -0.7, 0.22, 1.14];
        const levelsY = [0.18, 0.84, 1.5, 2.16, 2.82, 3.48];

        rackZOffsets.forEach((rz, rIdx) => {
          for (let rx = -1.9; rx <= 1.9; rx += 0.95) {
            [-0.28, 0.28].forEach((dz) => {
              const upright = new THREE.Mesh(
                new THREE.BoxGeometry(0.045, 3.76, 0.045),
                this.mats.primaryBlueMetal
              );
              upright.position.set(rx, 1.88, rz + dz);
              upright.castShadow = true;
              asrsGroup.add(upright);
            });

            for (let by = 0.45; by <= 3.35; by += 0.68) {
              const brace = new THREE.Mesh(new THREE.BoxGeometry(0.024, 0.024, 0.46), this.mats.mediumBlueMetal);
              brace.position.set(rx, by, rz);
              brace.rotation.x = 0.45;
              asrsGroup.add(brace);
            }
          }

          const guard = new THREE.Mesh(new RoundedBoxGeometry(0.12, 0.32, 0.62, 2, 0.02), this.mats.safetyYellow);
          guard.position.set(2.04, 0.16, rz);
          asrsGroup.add(guard);

          levelsY.forEach((ly, levelIdx) => {
            [-0.23, 0.23].forEach((dz) => {
              const beam = new THREE.Mesh(
                new THREE.BoxGeometry(3.76, 0.045, 0.038),
                rIdx % 2 === 1 ? this.mats.robotOrangeMetal : this.mats.mediumBlueMetal
              );
              beam.position.set(0, ly, rz + dz);
              asrsGroup.add(beam);
            });

            for (let bx = -1.42; bx <= 1.42; bx += 0.95) {
              if (!(levelIdx === 3 && Math.abs(bx - 0.47) < 0.15 && rIdx === 2)) {
                const variant = ((Math.abs(Math.round(bx * 10 + ly * 10)) + rIdx) % 5) + 1;
                const palletUnit = this.createDetailedPalletWithCartons(variant);
                palletUnit.scale.set(0.86, 0.86, 0.86);
                palletUnit.position.set(bx, ly + 0.03, rz);
                asrsGroup.add(palletUnit);
              }
            }
          });
        });

        [-1.16, 0.68].forEach((aisleZ, cIdx) => {
          const bottomRail = new THREE.Mesh(new THREE.BoxGeometry(4.05, 0.035, 0.09), this.mats.brushedAluminum);
          bottomRail.position.set(0, 0.02, aisleZ);
          const topRail = new THREE.Mesh(new THREE.BoxGeometry(4.05, 0.045, 0.09), this.mats.safetyYellow);
          topRail.position.set(0, 3.82, aisleZ);
          asrsGroup.add(bottomRail, topRail);

          const craneGroup = new THREE.Group();
          craneGroup.position.set(0, 0, aisleZ);

          const mastLeft = new THREE.Mesh(new THREE.BoxGeometry(0.075, 3.62, 0.09), this.mats.safetyYellow);
          mastLeft.position.set(-0.16, 1.98, 0);
          const mastRight = new THREE.Mesh(new THREE.BoxGeometry(0.075, 3.62, 0.09), this.mats.navySteel);
          mastRight.position.set(0.16, 1.98, 0);

          const driveMotorBox = new THREE.Mesh(new RoundedBoxGeometry(0.58, 0.13, 0.34, 2, 0.03), this.mats.navySteel);
          driveMotorBox.position.y = 0.105;

          const carriage = new THREE.Group();
          carriage.position.set(0, 1.6, 0);
          const platform = new THREE.Mesh(new RoundedBoxGeometry(0.5, 0.06, 0.4, 2, 0.02), this.mats.primaryBlueMetal);
          const pallet = this.createDetailedPalletWithCartons(cIdx === 0 ? 2 : 4);
          pallet.scale.set(0.86, 0.86, 0.86);
          pallet.position.y = 0.035;

          carriage.add(platform, pallet);
          craneGroup.add(mastLeft, mastRight, driveMotorBox, carriage);
          asrsGroup.add(craneGroup);

          this.asrsCranes.push({
            group: craneGroup,
            carriage,
            pallet,
            phase: cIdx * 2.2,
          });
        });

        this.modelRoot.add(asrsGroup);
      }

      createDetailedPalletWithCartons(variant = 1) {
        const group = new THREE.Group();

        const palletBase = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.05, 0.48), this.mats.palletWood);
        palletBase.position.y = 0.025;
        group.add(palletBase);

        if (variant === 1) {
          [-0.15, 0.15].forEach((cx) => {
            const carton = this.createDetailedCarton(0.27, 0.36, 0.42, false);
            carton.position.set(cx, 0.23, 0);
            group.add(carton);
          });
        } else if (variant === 2) {
          const bottomBox = this.createDetailedCarton(0.54, 0.26, 0.42, false);
          bottomBox.position.set(0, 0.18, 0);
          const topBox = this.createDetailedCarton(0.34, 0.2, 0.36, true);
          topBox.position.set(-0.06, 0.41, 0);
          group.add(bottomBox, topBox);
        } else if (variant === 3) {
          const tote = new THREE.Mesh(new RoundedBoxGeometry(0.52, 0.32, 0.42, 3, 0.03), this.mats.mediumBlueMetal);
          tote.position.set(0, 0.21, 0);
          tote.castShadow = true;
          group.add(tote);
        } else if (variant === 4) {
          const coldBox = new THREE.Mesh(new RoundedBoxGeometry(0.52, 0.32, 0.42, 3, 0.03), this.mats.coldChainBox);
          coldBox.position.set(0, 0.21, 0);
          const topCap = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.04, 0.42), this.mats.cyanEmissive);
          topCap.position.set(0, 0.39, 0);
          group.add(coldBox, topCap);
        } else {
          [-0.14, 0.14].forEach((dx) => {
            const drum = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.36, 16), this.mats.navySteel);
            drum.position.set(dx, 0.23, 0);
            const ring = new THREE.Mesh(new THREE.TorusGeometry(0.112, 0.012, 8, 16), this.mats.safetyYellow);
            ring.rotation.x = Math.PI / 2;
            ring.position.set(dx, 0.25, 0);
            group.add(drum, ring);
          });
        }
        return group;
      }

      createDetailedCarton(w, h, d, isDark = false) {
        const box = new THREE.Mesh(
          new RoundedBoxGeometry(w, h, d, 2, 0.018),
          isDark ? this.mats.cardboardDark : this.mats.cardboard
        );
        box.castShadow = true;
        box.receiveShadow = true;
        return box;
      }

      // 4. KHO LẠNH BẢO ÔN ÂM SÂU (-25°C)
      buildColdChainChamberAndPiping() {
        const freezerGroup = new THREE.Group();
        freezerGroup.position.set(-3.7, 0.18, 0.32);

        const backPanel = new THREE.Mesh(new RoundedBoxGeometry(2.05, 1.8, 0.1, 2, 0.02), this.mats.smoothWhite);
        backPanel.position.set(0, 0.9, -0.72);
        const leftPanel = new THREE.Mesh(new RoundedBoxGeometry(0.1, 1.8, 1.34, 2, 0.02), this.mats.smoothWhite);
        leftPanel.position.set(-0.98, 0.9, 0);
        const roofPanel = new THREE.Mesh(new RoundedBoxGeometry(2.08, 0.12, 1.56, 2, 0.02), this.mats.navySteel);
        roofPanel.position.set(0, 1.86, 0);

        const glassFront = new THREE.Mesh(new THREE.BoxGeometry(1.92, 1.68, 0.03), this.mats.coldGlass);
        glassFront.position.set(0.02, 0.86, 0.74);

        const iceGlowBar = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.04, 0.08), this.mats.cyanEmissive);
        iceGlowBar.position.set(0, 1.72, 0);

        const evapUnit = new THREE.Mesh(new RoundedBoxGeometry(1.05, 0.3, 0.5, 2, 0.03), this.mats.brushedAluminum);
        evapUnit.position.set(-0.28, 2.08, 0);

        const tempSign = new THREE.Mesh(
          new THREE.BoxGeometry(1.28, 0.24, 0.05),
          new THREE.MeshStandardMaterial({
            map: this.createBadgeTexture('❄️ -25.0°C COLD VAULT', '#082F49', '#38BDF8'),
          })
        );
        tempSign.position.set(0, 2.06, 0.76);

        [-0.5, 0.42].forEach((px) => {
          const coldPallet = this.createDetailedPalletWithCartons(4);
          coldPallet.position.set(px, 0.02, -0.15);
          freezerGroup.add(coldPallet);
        });

        freezerGroup.add(backPanel, leftPanel, roofPanel, glassFront, iceGlowBar, evapUnit, tempSign);
        this.modelRoot.add(freezerGroup);
      }

      // 5. ĐƯỜNG RAY MONORAIL TREO TRẦN & 2 DRONE KIỂM KÊ
      buildOverheadMonorailAndDrones() {
        const skyGroup = new THREE.Group();
        skyGroup.position.set(0, 3.75, 0);

        const skyPoints = [
          new THREE.Vector3(-4.0, 0, -0.4),
          new THREE.Vector3(0.2, 0, -0.4),
          new THREE.Vector3(0.2, 0, 1.6),
          new THREE.Vector3(-4.0, 0, 1.6),
        ];
        this.monorailCurve = new THREE.CatmullRomCurve3(skyPoints, true, 'catmullrom', 0.22);

        const skyRailMesh = new THREE.Mesh(
          new THREE.TubeGeometry(this.monorailCurve, 72, 0.04, 8, true),
          this.mats.safetyYellow
        );
        skyGroup.add(skyRailMesh);

        const carrierCount = 6;
        for (let i = 0; i < carrierCount; i++) {
          const carrier = new THREE.Group();
          const trolleyHead = new THREE.Mesh(new RoundedBoxGeometry(0.24, 0.08, 0.14, 2, 0.02), this.mats.navySteel);
          const hangerArm = new THREE.Mesh(new THREE.BoxGeometry(0.032, 0.28, 0.032), this.mats.brushedAluminum);
          hangerArm.position.y = -0.18;
          const skyTote = new THREE.Mesh(new RoundedBoxGeometry(0.3, 0.18, 0.22, 2, 0.03), this.mats.primaryBlueMetal);
          skyTote.position.y = -0.41;

          carrier.add(trolleyHead, hangerArm, skyTote);
          skyGroup.add(carrier);
          this.monorailCarriers.push({ mesh: carrier, progress: i / carrierCount });
        }
        this.modelRoot.add(skyGroup);

        [
          { x: -2.55, y: 3.25, z: -0.65, phase: 0 },
          { x: -2.55, y: 2.75, z: -2.55, phase: 2.4 },
        ].forEach((cfg) => {
          const drone = new THREE.Group();
          drone.position.set(cfg.x, cfg.y, cfg.z);

          const body = new THREE.Mesh(new RoundedBoxGeometry(0.26, 0.07, 0.26, 3, 0.03), this.mats.navySteel);
          const dome = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 12), this.mats.cyanEmissive);
          dome.position.y = 0.065;
          drone.add(body, dome);

          const rotors = [];
          [[-0.16, -0.16], [0.16, -0.16], [-0.16, 0.16], [0.16, 0.16]].forEach(([dx, dz]) => {
            const rotor = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.01, 0.026), this.mats.safetyYellow);
            rotor.position.set(dx, 0.045, dz);
            rotors.push(rotor);
            drone.add(rotor);
          });

          const scanCone = new THREE.Mesh(
            new THREE.ConeGeometry(0.25, 0.65, 16, 1, true),
            new THREE.MeshBasicMaterial({
              color: this.C.cyanGlow,
              transparent: true,
              opacity: 0.2,
              side: THREE.DoubleSide,
              depthWrite: false,
            })
          );
          scanCone.rotation.x = Math.PI / 2;
          scanCone.position.set(0, -0.04, -0.46);
          drone.add(scanCone);

          this.modelRoot.add(drone);
          this.drones.push({ group: drone, rotors, phase: cfg.phase });
        });
      }

      // 6. KHU KỸ THUẬT TẦNG TRỆT DƯỚI TẦNG LỬNG
      buildUnderMezzanineTechRooms() {
        const underGroup = new THREE.Group();
        underGroup.position.set(2.3, 0.18, -2.25);

        const glassWall = new THREE.Mesh(new THREE.BoxGeometry(4.7, 2.0, 0.03), this.mats.architecturalGlass);
        glassWall.position.set(0, 1.0, 1.55);
        underGroup.add(glassWall);

        for (let i = 0; i < 4; i++) {
          const upsCabinet = new THREE.Mesh(new RoundedBoxGeometry(0.52, 1.45, 0.5, 2, 0.03), this.mats.navySteel);
          upsCabinet.position.set(-1.75 + i * 0.64, 0.725, -0.95);
          const statusBar = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.05, 0.02), this.mats.emeraldEmissive);
          statusBar.position.set(-1.75 + i * 0.64, 1.15, -0.68);
          underGroup.add(upsCabinet, statusBar);
        }

        const workBench = new THREE.Mesh(new RoundedBoxGeometry(1.35, 0.54, 0.55, 2, 0.03), this.mats.primaryBlueMetal);
        workBench.position.set(1.25, 0.27, -0.85);
        const spareAgv = this.createDetailedAgvUnit(1);
        spareAgv.position.set(1.25, 0.55, -0.85);
        underGroup.add(workBench, spareAgv);

        this.modelRoot.add(underGroup);
      }

      // 7. TẦNG LỬNG TRUNG TÂM ĐIỀU HÀNH OMS + PHÒNG HỌP KÍNH CHIẾN LƯỢC
      buildUpperMezzanineCommandAndBoardroom() {
        const mezzGroup = new THREE.Group();
        mezzGroup.position.set(2.3, 2.32, -2.25);

        const mezzFloor = new THREE.Mesh(
          new RoundedBoxGeometry(4.86, 0.18, 3.3, 3, 0.04),
          new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.35 })
        );
        mezzFloor.receiveShadow = true;
        mezzFloor.castShadow = true;
        mezzGroup.add(mezzFloor);

        const frontBeam = new THREE.Mesh(new THREE.BoxGeometry(4.86, 0.18, 0.08), this.mats.structuralSteel);
        frontBeam.position.set(0, 0.0, 1.71);
        const glassRailing = new THREE.Mesh(new THREE.BoxGeometry(4.76, 0.62, 0.03), this.mats.architecturalGlass);
        glassRailing.position.set(0, 0.41, 1.62);
        const topRail = new THREE.Mesh(new THREE.BoxGeometry(4.8, 0.04, 0.06), this.mats.brushedAluminum);
        topRail.position.set(0, 0.75, 1.62);
        mezzGroup.add(frontBeam, glassRailing, topRail);

        const videoWallFrame = new THREE.Mesh(new RoundedBoxGeometry(2.45, 1.26, 0.06, 2, 0.02), this.mats.darkMetal);
        videoWallFrame.position.set(0.85, 1.15, -1.58);
        const videoWallScreen = new THREE.Mesh(
          new THREE.PlaneGeometry(2.34, 1.14),
          new THREE.MeshBasicMaterial({ map: this.createVideoWallDashboardTexture() })
        );
        videoWallScreen.position.set(0.85, 1.15, -1.53);
        mezzGroup.add(videoWallFrame, videoWallScreen);

        for (let sr = 0; sr < 5; sr++) {
          const rackX = -2.0 + sr * 0.54;
          const serverCabinet = new THREE.Mesh(new RoundedBoxGeometry(0.46, 1.5, 0.5, 2, 0.03), this.mats.navySteel);
          serverCabinet.position.set(rackX, 0.85, -1.12);
          serverCabinet.castShadow = true;
          mezzGroup.add(serverCabinet);

          for (let u = 0; u < 5; u++) {
            const led = new THREE.Mesh(
              new THREE.BoxGeometry(0.1, 0.035, 0.02),
              u % 2 === 0 ? this.mats.cyanEmissive.clone() : this.mats.emeraldEmissive.clone()
            );
            led.position.set(rackX + 0.1, 0.35 + u * 0.25, -0.84);
            mezzGroup.add(led);
            this.serverBlinkLeds.push({ mesh: led, phase: sr * 1.1 + u * 0.65 });
          }
        }

        const holoPedestal = new THREE.Mesh(new THREE.CylinderGeometry(0.52, 0.62, 0.42, 24), this.mats.navySteel);
        holoPedestal.position.set(0.65, 0.31, 0.05);
        const holoEmitter = new THREE.Mesh(new THREE.CylinderGeometry(0.44, 0.44, 0.04, 24), this.mats.cyanEmissive);
        holoEmitter.position.set(0.65, 0.55, 0.05);
        mezzGroup.add(holoPedestal, holoEmitter);

        this.omsHoloCore = new THREE.Group();
        this.omsHoloCore.position.set(0.65, 1.1, 0.05);
        const corePoly = new THREE.Mesh(new THREE.OctahedronGeometry(0.28, 1), this.mats.cyanEmissive);
        const outerWire = new THREE.Mesh(
          new THREE.IcosahedronGeometry(0.44, 1),
          new THREE.MeshBasicMaterial({ color: this.C.cyanGlow, wireframe: true, transparent: true, opacity: 0.48 })
        );
        const orbitRing = new THREE.Mesh(new THREE.TorusGeometry(0.56, 0.02, 12, 48), this.mats.cyanEmissive);
        orbitRing.rotation.x = Math.PI / 2.3;
        this.omsHoloCore.add(corePoly, outerWire, orbitRing);
        mezzGroup.add(this.omsHoloCore);

        const consoleDesk = new THREE.Mesh(new RoundedBoxGeometry(1.85, 0.4, 0.5, 2, 0.03), this.mats.smoothWhite);
        consoleDesk.position.set(-1.1, 0.3, 0.65);
        mezzGroup.add(consoleDesk);

        [-0.58, -0.19, 0.19, 0.58].forEach((mx, idx) => {
          const monitor = new THREE.Mesh(new RoundedBoxGeometry(0.34, 0.22, 0.025, 2, 0.01), this.mats.cyanEmissive);
          monitor.position.set(-1.1 + mx, 0.65, 0.62);
          monitor.rotation.y = (idx - 1.5) * -0.14;
          mezzGroup.add(monitor);
        });

        [-1.45, -0.75].forEach((cx) => {
          const chairSeat = new THREE.Mesh(new RoundedBoxGeometry(0.28, 0.05, 0.28, 2, 0.02), this.mats.navySteel);
          chairSeat.position.set(cx, 0.27, 0.18);
          const chairBack = new THREE.Mesh(new RoundedBoxGeometry(0.26, 0.34, 0.04, 2, 0.02), this.mats.primaryBlueMetal);
          chairBack.position.set(cx, 0.47, 0.03);
          mezzGroup.add(chairSeat, chairBack);
        });

        const boardTable = new THREE.Mesh(new RoundedBoxGeometry(0.65, 0.05, 1.25, 3, 0.02), this.mats.smoothWhite);
        boardTable.position.set(1.85, 0.44, 0.45);
        const tableBase = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.3, 0.85), this.mats.navySteel);
        tableBase.position.set(1.85, 0.25, 0.45);
        mezzGroup.add(boardTable, tableBase);

        [-0.35, 0.05, 0.45].forEach((cz) => {
          [-0.45, 0.45].forEach((cx) => {
            const cSeat = new THREE.Mesh(new RoundedBoxGeometry(0.2, 0.26, 0.2, 2, 0.02), this.mats.mediumBlueMetal);
            cSeat.position.set(1.85 + cx, 0.24, 0.45 + cz);
            mezzGroup.add(cSeat);
          });
        });

        this.modelRoot.add(mezzGroup);
      }

      createVideoWallDashboardTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 256;
        const ctx = canvas.getContext('2d');

        ctx.fillStyle = '#0B192C';
        ctx.fillRect(0, 0, 512, 256);

        ctx.strokeStyle = '#1E3E62';
        ctx.lineWidth = 2;
        ctx.strokeRect(10, 10, 240, 112);
        ctx.strokeRect(262, 10, 240, 112);
        ctx.strokeRect(10, 134, 492, 112);

        const barColors = ['#0EA5E9', '#38BDF8', '#10B981', '#F59E0B', '#2859D9'];
        for (let i = 0; i < 8; i++) {
          const h = 38 + ((i * 21) % 58);
          ctx.fillStyle = barColors[i % barColors.length];
          ctx.fillRect(26 + i * 26, 112 - h, 17, h);
        }

        ctx.strokeStyle = '#10B981';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(275, 92);
        ctx.lineTo(315, 52);
        ctx.lineTo(355, 74);
        ctx.lineTo(405, 34);
        ctx.lineTo(455, 46);
        ctx.lineTo(488, 24);
        ctx.stroke();

        for (let r = 0; r < 3; r++) {
          for (let c = 0; c < 12; c++) {
            ctx.fillStyle = (r + c) % 3 === 0 ? '#0EA5E9' : (r + c) % 5 === 0 ? '#F59E0B' : '#1E40AF';
            ctx.fillRect(24 + c * 39, 148 + r * 28, 31, 20);
          }
        }

        const tex = new THREE.CanvasTexture(canvas);
        tex.colorSpace = THREE.SRGBColorSpace;
        return tex;
      }

      // 8. CẦU THANG THÉP CÔNG NGHIỆP LÊN TẦNG LỬNG
      buildSwitchbackSteelStaircase() {
        const stairGroup = new THREE.Group();
        stairGroup.position.set(-0.42, 0.18, -1.25);

        for (let i = 0; i < 12; i++) {
          const step = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.038, 0.19), this.mats.brushedAluminum);
          step.position.set(0, 0.17 + i * 0.175, 0.85 - i * 0.155);
          step.castShadow = true;
          stairGroup.add(step);
        }

        [-0.28, 0.28].forEach((sx) => {
          const stringer = new THREE.Mesh(new THREE.BoxGeometry(0.045, 2.85, 0.09), this.mats.navySteel);
          stringer.position.set(sx, 1.12, 0);
          stringer.rotation.x = -0.72;
          const handrail = new THREE.Mesh(new THREE.BoxGeometry(0.032, 2.85, 0.032), this.mats.safetyYellow);
          handrail.position.set(sx, 1.62, 0);
          handrail.rotation.x = -0.72;
          stairGroup.add(stringer, handrail);
        });

        this.modelRoot.add(stairGroup);
      }

      // 9. HỆ THỐNG BĂNG CHUYỀN CON LĂN, 2 CỔNG QUÉT DWS & 4 NHÁNH PHÂN LOẠI
      buildMultiLoopSorterAndFourSpurs() {
        const convGroup = new THREE.Group();
        convGroup.position.set(0, 0.18, 0);

        const curvePoints = [
          new THREE.Vector3(-2.4, 0.56, 0.3),
          new THREE.Vector3(-0.4, 0.56, 0.3),
          new THREE.Vector3(1.55, 0.56, 0.3),
          new THREE.Vector3(1.55, 0.56, 1.48),
          new THREE.Vector3(-0.4, 0.56, 1.48),
          new THREE.Vector3(-2.4, 0.56, 1.48),
        ];
        this.conveyorCurve = new THREE.CatmullRomCurve3(curvePoints, true, 'catmullrom', 0.2);

        const trackBed = new THREE.Mesh(
          new THREE.TubeGeometry(this.conveyorCurve, 88, 0.25, 8, true),
          this.mats.navySteel
        );
        trackBed.scale.set(1, 0.26, 1);
        trackBed.position.y = 0.36;
        convGroup.add(trackBed);

        const rollerGeom = new THREE.CylinderGeometry(0.03, 0.03, 0.44, 10);
        const rollerCount = 58;
        const instancedRollers = new THREE.InstancedMesh(rollerGeom, this.mats.chromeRoller, rollerCount);
        const dummy = new THREE.Object3D();
        for (let i = 0; i < rollerCount; i++) {
          const t = i / rollerCount;
          const pt = this.conveyorCurve.getPointAt(t);
          const tan = this.conveyorCurve.getTangentAt(t);
          dummy.position.set(pt.x, 0.53, pt.z);
          dummy.rotation.set(0, Math.atan2(tan.x, tan.z), Math.PI / 2);
          dummy.updateMatrix();
          instancedRollers.setMatrixAt(i, dummy.matrix);
        }
        instancedRollers.instanceMatrix.needsUpdate = true;
        convGroup.add(instancedRollers);

        for (let lx = -2.2; lx <= 1.3; lx += 0.88) {
          [0.3, 1.48].forEach((lz) => {
            const leg = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.46, 0.4), this.mats.navySteel);
            leg.position.set(lx, 0.23, lz);
            convGroup.add(leg);
          });
        }

        // Cổng Quét Quang Học OMS 01 (Các vách tách rời, không đè nhau)
        const tunnelGroup = new THREE.Group();
        tunnelGroup.position.set(-1.15, 0.56, 0.3);
        const archTop = new THREE.Mesh(new RoundedBoxGeometry(0.74, 0.16, 0.88, 2, 0.03), this.mats.primaryBlueMetal);
        archTop.position.y = 0.78;
        const archLeft = new THREE.Mesh(new RoundedBoxGeometry(0.74, 0.68, 0.14, 2, 0.03), this.mats.primaryBlueMetal);
        archLeft.position.set(0, 0.35, -0.37);
        const archRight = new THREE.Mesh(new RoundedBoxGeometry(0.74, 0.68, 0.14, 2, 0.03), this.mats.primaryBlueMetal);
        archRight.position.set(0, 0.35, 0.37);
        const sideScreen = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.22, 0.025), this.mats.cyanEmissive);
        sideScreen.position.set(0, 0.48, 0.46);

        this.laserCurtain = new THREE.Mesh(
          new THREE.PlaneGeometry(0.56, 0.58),
          new THREE.MeshBasicMaterial({
            color: 0x0ea5e9,
            transparent: true,
            opacity: 0.45,
            side: THREE.DoubleSide,
            depthWrite: false,
          })
        );
        this.laserCurtain.rotation.x = Math.PI / 2;
        this.laserCurtain.position.y = 0.45;
        tunnelGroup.add(archTop, archLeft, archRight, sideScreen, this.laserCurtain);
        convGroup.add(tunnelGroup);

        // Cổng Cân Đo Kích Thước DWS 02
        const dwsTop = new THREE.Mesh(new RoundedBoxGeometry(0.44, 0.14, 0.84, 2, 0.02), this.mats.navySteel);
        dwsTop.position.set(0.55, 1.28, 1.48);
        const dwsLeft = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.7, 0.1), this.mats.navySteel);
        dwsLeft.position.set(0.55, 0.85, 1.12);
        const dwsRight = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.7, 0.1), this.mats.navySteel);
        dwsRight.position.set(0.55, 0.85, 1.84);
        const dwsSensor = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.035, 0.48), this.mats.amberEmissive);
        dwsSensor.position.set(0.55, 1.18, 1.48);
        convGroup.add(dwsTop, dwsLeft, dwsRight, dwsSensor);

        // 4 Nhánh băng chuyền phân loại
        [-2.15, -1.25, -0.35, 0.55].forEach((sx, idx) => {
          const spurTrack = new THREE.Mesh(new RoundedBoxGeometry(0.38, 0.06, 0.62, 2, 0.02), this.mats.brushedAluminum);
          spurTrack.position.set(sx, 0.42, 1.86);
          spurTrack.rotation.x = 0.28;
          convGroup.add(spurTrack);

          const slidingBox = this.createDetailedCarton(0.25, 0.19, 0.23, idx % 2 === 1);
          convGroup.add(slidingBox);
          this.spurBoxes.push({ mesh: slidingBox, baseX: sx, phase: idx * 1.5 });
        });

        const boxCount = 12;
        for (let i = 0; i < boxCount; i++) {
          let cBox;
          if (i % 3 === 0) {
            cBox = this.createDetailedCarton(0.33, 0.25, 0.29, false);
          } else if (i % 3 === 1) {
            cBox = this.createDetailedCarton(0.29, 0.21, 0.25, true);
          } else {
            cBox = new THREE.Mesh(new RoundedBoxGeometry(0.31, 0.19, 0.25, 2, 0.03), this.mats.mediumBlueMetal);
            cBox.castShadow = true;
          }
          convGroup.add(cBox);
          this.conveyorBoxes.push({ mesh: cBox, progress: i / boxCount });
        }

        this.modelRoot.add(convGroup);
      }

      // 10. 4 TRẠM ĐÓNG GÓI WMS CHI TIẾT & LÔ HÀNG STAGING
      buildFourPackingStationsAndStaging() {
        const workGroup = new THREE.Group();
        workGroup.position.set(0, 0.18, 0);

        [-2.15, -1.25, -0.35, 0.55].forEach((wx) => {
          const station = this.createDetailedPackingWorkstation();
          station.position.set(wx, 0, 2.26);
          workGroup.add(station);
        });

        [-3.95, -3.15].forEach((px, idx) => {
          const stagedPallet = this.createDetailedPalletWithCartons(idx + 1);
          stagedPallet.position.set(px, 0.02, 2.15);
          workGroup.add(stagedPallet);
        });

        this.modelRoot.add(workGroup);
      }

      createDetailedPackingWorkstation() {
        const group = new THREE.Group();

        const mat = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.015, 0.32), this.mats.rubberBlack);
        mat.position.set(0, 0.01, 0.36);

        const tableTop = new THREE.Mesh(new RoundedBoxGeometry(0.7, 0.045, 0.42, 2, 0.02), this.mats.smoothWhite);
        tableTop.position.y = 0.47;
        tableTop.castShadow = true;
        const legs = new THREE.Mesh(new THREE.BoxGeometry(0.64, 0.43, 0.36), this.mats.navySteel);
        legs.position.y = 0.215;

        const overheadShelf = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.028, 0.16), this.mats.brushedAluminum);
        overheadShelf.position.set(0, 0.8, -0.11);
        const wmsScreen = new THREE.Mesh(new RoundedBoxGeometry(0.22, 0.15, 0.022, 2, 0.01), this.mats.cyanEmissive);
        wmsScreen.position.set(-0.18, 0.64, -0.13);
        const labelPrinter = new THREE.Mesh(new RoundedBoxGeometry(0.13, 0.11, 0.15, 2, 0.02), this.mats.navySteel);
        labelPrinter.position.set(0.2, 0.555, -0.09);
        const cartonOnScale = this.createDetailedCarton(0.22, 0.17, 0.2, false);
        cartonOnScale.position.set(0, 0.585, 0.04);

        group.add(mat, tableTop, legs, overheadShelf, wmsScreen, labelPrinter, cartonOnScale);
        return group;
      }

      // 11. BUỒNG 2 ROBOT 6 TRỤC & 2 MÁY QUẤN MÀNG PALLET TỰ ĐỘNG
      buildRoboticPalletizingCell() {
        const cellGroup = new THREE.Group();
        cellGroup.position.set(0, 0.18, 0);

        [
          { x: -0.45, z: 0.88, phase: 0 },
          { x: 0.62, z: 0.88, phase: 2.2 },
        ].forEach((rcfg) => {
          const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(0.21, 0.26, 0.36, 20), this.mats.navySteel);
          pedestal.position.set(rcfg.x, 0.18, rcfg.z);
          cellGroup.add(pedestal);

          const turret = new THREE.Group();
          turret.position.set(rcfg.x, 0.46, rcfg.z);
          const shoulder = new THREE.Mesh(new RoundedBoxGeometry(0.22, 0.18, 0.22, 3, 0.04), this.mats.robotOrangeMetal);
          turret.add(shoulder);

          const lowerArm = new THREE.Group();
          lowerArm.position.set(0, 0.12, 0);
          const arm1 = new THREE.Mesh(new RoundedBoxGeometry(0.1, 0.52, 0.12, 2, 0.03), this.mats.robotOrangeMetal);
          arm1.position.y = 0.26;
          const joint = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.085, 0.16, 16), this.mats.navySteel);
          joint.rotation.z = Math.PI / 2;
          joint.position.y = 0.52;
          lowerArm.add(arm1, joint);

          const upperArm = new THREE.Group();
          upperArm.position.set(0, 0.52, 0);
          const arm2 = new THREE.Mesh(new RoundedBoxGeometry(0.085, 0.1, 0.46, 2, 0.03), this.mats.robotOrangeMetal);
          arm2.position.z = 0.2;
          const gripper = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 0.06, 16), this.mats.navySteel);
          gripper.position.set(0, -0.09, 0.38);
          const heldBox = this.createDetailedCarton(0.24, 0.18, 0.22, false);
          heldBox.position.set(0, -0.22, 0.38);

          upperArm.add(arm2, gripper, heldBox);
          lowerArm.add(upperArm);
          turret.add(lowerArm);
          cellGroup.add(turret);

          this.robots.push({ turret, lowerArm, upperArm, phase: rcfg.phase });
        });

        [0.45, 1.45].forEach((wz, idx) => {
          const wrapperGroup = new THREE.Group();
          wrapperGroup.position.set(2.35, 0, wz);

          const turntableBase = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.48, 0.055, 24), this.mats.navySteel);
          turntableBase.position.y = 0.028;

          const turntable = new THREE.Group();
          turntable.position.y = 0.075;
          const rotaryDisc = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.025, 24), this.mats.primaryBlueMetal);
          const wrappedPallet = this.createDetailedPalletWithCartons(idx === 0 ? 1 : 2);
          wrappedPallet.scale.set(0.84, 0.84, 0.84);
          wrappedPallet.position.y = 0.02;
          const filmShell = new THREE.Mesh(new RoundedBoxGeometry(0.56, 0.42, 0.44, 3, 0.04), this.mats.stretchFilm);
          filmShell.position.y = 0.26;
          turntable.add(rotaryDisc, wrappedPallet, filmShell);

          const wrapperMast = new THREE.Mesh(new THREE.BoxGeometry(0.11, 1.28, 0.11), this.mats.navySteel);
          wrapperMast.position.set(0.52, 0.64, 0);
          const filmCarriage = new THREE.Mesh(new THREE.CylinderGeometry(0.068, 0.068, 0.22, 16), this.mats.cyanEmissive);
          filmCarriage.position.set(0.42, 0.54, 0);

          wrapperGroup.add(turntableBase, turntable, wrapperMast, filmCarriage);
          cellGroup.add(wrapperGroup);
          this.wrappers.push({ turntable, filmCarriage, phase: idx * 1.9 });
        });

        this.modelRoot.add(cellGroup);
      }

      // 12. ĐỘI 4 ROBOT AGV + XE NÂNG REACH-FORKLIFT (TÁCH LỚP CÁC KHỐI THÂN & BÁNH XE)
      buildAgvSwarmAndReachForklifts() {
        const fleetGroup = new THREE.Group();
        fleetGroup.position.set(0, 0.0, 0);

        [-4.55, -3.85, -3.15].forEach((cx) => {
          const pad = new THREE.Mesh(new RoundedBoxGeometry(0.6, 0.035, 0.52, 2, 0.02), this.mats.navySteel);
          pad.position.set(cx, 0.02, 3.95);
          const glowStrip = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.03, 0.04), this.mats.emeraldEmissive);
          glowStrip.position.set(cx, 0.055, 4.18);
          fleetGroup.add(pad, glowStrip);
        });

        this.agvPath = new THREE.CatmullRomCurve3(
          [
            new THREE.Vector3(-4.0, 0.0, 2.95),
            new THREE.Vector3(0.45, 0.0, 2.95),
            new THREE.Vector3(0.45, 0.0, 3.72),
            new THREE.Vector3(-4.0, 0.0, 3.72),
          ],
          true,
          'catmullrom',
          0.18
        );

        [0.05, 0.3, 0.55, 0.8].forEach((startProg, idx) => {
          const agvMesh = this.createDetailedAgvUnit((idx % 3) + 1);
          fleetGroup.add(agvMesh);
          this.agvFleet.push({
            mesh: agvMesh,
            progress: startProg,
            speed: 0.08,
          });
        });

        this.forklift1 = this.createDetailedReachForklift();
        this.forklift1.position.set(1.15, 0.0, 2.55);
        fleetGroup.add(this.forklift1);

        this.modelRoot.add(fleetGroup);
      }

      // AGV xếp tầng hoàn toàn độc lập:
      // - lowerBumper: y từ 0.02 đến 0.09 (cao 0.07, tâm 0.055)
      // - ledStrip:    y từ 0.09 đến 0.12 (cao 0.03, tâm 0.105)
      // - upperBody:   y từ 0.12 đến 0.22 (cao 0.10, tâm 0.170)
      createDetailedAgvUnit(cargoType = 1) {
        const agv = new THREE.Group();

        const lowerBumper = new THREE.Mesh(new RoundedBoxGeometry(0.76, 0.07, 0.56, 2, 0.02), this.mats.navySteel);
        lowerBumper.position.y = 0.055;

        const ledStrip = new THREE.Mesh(
          new THREE.BoxGeometry(0.72, 0.03, 0.52),
          cargoType === 1 ? this.mats.cyanEmissive : this.mats.emeraldEmissive
        );
        ledStrip.position.y = 0.105;

        const upperBody = new THREE.Mesh(new RoundedBoxGeometry(0.68, 0.1, 0.48, 2, 0.02), this.mats.smoothWhite);
        upperBody.position.y = 0.17;
        upperBody.castShadow = true;

        const lidarTurret = new THREE.Group();
        lidarTurret.position.set(0.25, 0.255, 0);
        const lidarCap = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.06, 16), this.mats.navySteel);
        const lidarEye = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.03, 0.045), this.mats.amberEmissive);
        lidarEye.position.x = 0.06;
        lidarTurret.add(lidarCap, lidarEye);
        agv.userData.lidar = lidarTurret;

        const agvCargo =
          cargoType === 3
            ? this.createDetailedPalletWithCartons(3)
            : this.createDetailedCarton(0.36, 0.26, 0.32, cargoType === 2);
        agvCargo.position.set(-0.05, cargoType === 3 ? 0.23 : 0.36, 0);

        agv.add(lowerBumper, ledStrip, upperBody, lidarTurret, agvCargo);
        return agv;
      }

      createDetailedReachForklift() {
        const forklift = new THREE.Group();

        const body = new THREE.Mesh(new RoundedBoxGeometry(0.64, 0.38, 0.46, 3, 0.04), this.mats.safetyYellow);
        body.position.set(0, 0.28, -0.14);
        body.castShadow = true;

        const counterweight = new THREE.Mesh(new RoundedBoxGeometry(0.66, 0.32, 0.16, 2, 0.03), this.mats.navySteel);
        counterweight.position.set(0, 0.25, -0.46);

        // 4 Bánh xe nâng nằm tách biệt hoàn toàn bên ngoài gầm xe
        [[-0.36, -0.38], [0.36, -0.38], [-0.36, 0.04], [0.36, 0.04]].forEach(([wx, wz]) => {
          const fWheel = this.createZeroFlickerWheel(0.11, 0.07);
          fWheel.position.set(wx, 0.11, wz);
          forklift.add(fWheel);
        });

        [[-0.25, -0.34], [0.25, -0.34], [-0.25, 0.02], [0.25, 0.02]].forEach(([px, pz]) => {
          const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.42, 8), this.mats.darkMetal);
          pillar.position.set(px, 0.68, pz);
          forklift.add(pillar);
        });
        const roofCage = new THREE.Mesh(new RoundedBoxGeometry(0.56, 0.035, 0.42, 2, 0.01), this.mats.darkMetal);
        roofCage.position.set(0, 0.91, -0.16);
        forklift.add(roofCage);

        [-0.17, 0.17].forEach((mx) => {
          const mastRail = new THREE.Mesh(new THREE.BoxGeometry(0.05, 1.12, 0.06), this.mats.navySteel);
          mastRail.position.set(mx, 0.62, 0.14);
          forklift.add(mastRail);
        });

        this.forkliftCarriage = new THREE.Group();
        this.forkliftCarriage.position.set(0, 0.24, 0.42);
        this.forkliftCarriage.add(this.createDetailedPalletWithCartons(1));

        const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.05, 12, 12), this.mats.amberEmissive);
        beacon.position.set(0, 0.98, -0.16);

        forklift.add(body, counterweight, this.forkliftCarriage, beacon);
        return forklift;
      }

      // 13. 3 KHOANG XUẤT HÀNG & ĐỘI XE TẢI (BÁNH XE ĐA VẬT LIỆU KHÔNG BAO GIỜ NHẤP NHÁY!)
      buildTripleLoadingDocksAndDetailedFleet() {
        const dockGroup = new THREE.Group();

        const dockWall = new THREE.Mesh(new THREE.BoxGeometry(4.8, 2.28, 0.16), this.mats.wallCladding);
        dockWall.position.set(2.65, 3.44, 2.24);
        dockWall.castShadow = true;
        dockGroup.add(dockWall);

        const dockCanopy = new THREE.Mesh(new RoundedBoxGeometry(4.75, 0.16, 1.25, 3, 0.03), this.mats.mediumBlueMetal);
        dockCanopy.position.set(2.65, 2.62, 2.84);
        dockCanopy.castShadow = true;
        dockGroup.add(dockCanopy);

        [1.15, 2.65, 4.15].forEach((bx, idx) => {
          const shelterTop = new THREE.Mesh(new THREE.BoxGeometry(1.34, 0.18, 0.36), this.mats.navySteel);
          shelterTop.position.set(bx, 2.2, 2.44);
          const shelterLeft = new THREE.Mesh(new THREE.BoxGeometry(0.15, 1.9, 0.36), this.mats.navySteel);
          shelterLeft.position.set(bx - 0.59, 1.15, 2.44);
          const shelterRight = new THREE.Mesh(new THREE.BoxGeometry(0.15, 1.9, 0.36), this.mats.navySteel);
          shelterRight.position.set(bx + 0.59, 1.15, 2.44);

          [-0.59, 0.59].forEach((sx) => {
            const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.7, 0.02), this.mats.amberEmissive);
            stripe.position.set(bx + sx, 0.72, 2.64);
            const wheelGuide = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 1.15, 10), this.mats.safetyYellow);
            wheelGuide.rotation.x = Math.PI / 2;
            wheelGuide.position.set(bx + sx * 1.15, 0.04, 3.3);
            dockGroup.add(stripe, wheelGuide);
          });

          const leveler = new THREE.Mesh(new THREE.BoxGeometry(0.98, 0.06, 0.78), this.mats.primaryBlueMetal);
          leveler.position.set(bx, 0.2, 2.45);
          leveler.rotation.x = 0.08;

          const baySign = new THREE.Mesh(
            new THREE.BoxGeometry(0.62, 0.2, 0.04),
            new THREE.MeshStandardMaterial({
              map: this.createBadgeTexture(`DOCK 0${idx + 1}`, '#193254', '#38BDF8'),
            })
          );
          baySign.position.set(bx, 2.44, 2.66);
          dockGroup.add(shelterTop, shelterLeft, shelterRight, leveler, baySign);
        });

        // BAY 01: Xe Đầu Kéo Container 18 bánh mở cửa sau
        this.openContainerTruck = this.createOpenContainerSemiTruck();
        this.openContainerTruck.position.set(1.15, 0.0, 3.92);
        dockGroup.add(this.openContainerTruck);

        // BAY 02: Xe Tải Lạnh Reefer Box Truck (Cả xe và 6 bánh xe đều chuyển động mượt)
        this.detailedTruck = this.createHighDetailBoxTruck();
        this.detailedTruck.position.set(2.65, 0.0, 3.82);
        dockGroup.add(this.detailedTruck);

        // BAY 03: Xe Tải Van Điện Giao Hàng Nhanh
        this.electricVan = this.createElectricDeliveryVan();
        this.electricVan.position.set(4.15, 0.0, 3.55);
        dockGroup.add(this.electricVan);

        this.modelRoot.add(dockGroup);
      }

      // BÁNH XE ĐA VẬT LIỆU CHUẨN CƠ KHÍ (ZERO Z-FIGHTING WHEEL):
      // Sử dụng duy nhất 1 khối CylinderGeometry với mảng 3 vật liệu [Mặt gai lốp, Mặt mâm ngoài, Mặt mâm trong]
      // Không có bất kỳ mặt phẳng thứ 2 nào đè lên nắp hình trụ -> Không bao giờ nhấp nháy ở mọi góc nhìn!
      createZeroFlickerWheel(radius = 0.22, width = 0.14) {
        const wheelMaterials = [
          this.mats.tireTreadMat,
          this.mats.wheelSideCapMat,
          this.mats.wheelSideCapMat,
        ];
        const wheelMesh = new THREE.Mesh(
          new THREE.CylinderGeometry(radius, radius, width, 24),
          wheelMaterials
        );
        wheelMesh.rotation.z = Math.PI / 2;
        wheelMesh.castShadow = true;
        wheelMesh.receiveShadow = true;
        return wheelMesh;
      }

      // XE ĐẦU KÉO CONTAINER (BAY 01) - Gầm cao 0.50m, bánh xe y = 0.22 (đỉnh 0.44m) -> Cách đáy thùng 0.06m!
      createOpenContainerSemiTruck() {
        const semi = new THREE.Group();

        // Khung gầm sắt-xi hẹp ở giữa (x từ -0.34 đến +0.34), không bao giờ chạm bánh xe (x = ±0.52)
        const chassis = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.14, 3.05), this.mats.navySteel);
        chassis.position.set(0, 0.36, 0);
        semi.add(chassis);

        // Thùng Container mở cửa sau (Đáy thùng tại y = 0.50 -> Cao hơn đỉnh bánh xe 0.44m)
        const floor = new THREE.Mesh(new THREE.BoxGeometry(1.22, 0.08, 2.12), this.mats.palletWood);
        floor.position.set(0, 0.54, -0.48);
        const roof = new THREE.Mesh(new THREE.BoxGeometry(1.22, 0.05, 2.12), this.mats.primaryBlueMetal);
        roof.position.set(0, 1.82, -0.48);
        const leftWall = new THREE.Mesh(new THREE.BoxGeometry(0.05, 1.24, 2.12), this.mats.primaryBlueMetal);
        leftWall.position.set(-0.585, 1.18, -0.48);
        const rightWall = new THREE.Mesh(new THREE.BoxGeometry(0.05, 1.24, 2.12), this.mats.primaryBlueMetal);
        rightWall.position.set(0.585, 1.18, -0.48);

        // Chân chống rơ-moóc
        [-0.38, 0.38].forEach((lx) => {
          const leg = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.36, 0.05), this.mats.darkMetal);
          leg.position.set(lx, 0.22, 0.28);
          semi.add(leg);
        });

        const insidePallet1 = this.createDetailedPalletWithCartons(1);
        insidePallet1.position.set(0, 0.59, -1.02);
        const insidePallet2 = this.createDetailedPalletWithCartons(2);
        insidePallet2.position.set(0, 0.59, -0.3);

        // Đầu kéo Sleeper Cab (Đáy cabin từ y = 0.50 -> Không bao giờ chạm bánh trước!)
        const cab = new THREE.Mesh(new RoundedBoxGeometry(1.14, 1.02, 0.82, 4, 0.05), this.mats.smoothWhite);
        cab.position.set(0, 1.01, 1.12);
        cab.castShadow = true;
        const bumper = new THREE.Mesh(new RoundedBoxGeometry(1.16, 0.16, 0.14, 2, 0.03), this.mats.navySteel);
        bumper.position.set(0, 0.38, 1.52);
        const fairing = new THREE.Mesh(new RoundedBoxGeometry(1.08, 0.28, 0.56, 3, 0.04), this.mats.smoothWhite);
        fairing.position.set(0, 1.62, 1.0);
        fairing.rotation.x = -0.25;
        const windshield = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.34, 0.03), this.mats.darkMetal);
        windshield.position.set(0, 1.16, 1.55);

        [-0.52, 0.52].forEach((ex) => {
          const exhaustPipe = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.18, 12), this.mats.chromeRoller);
          exhaustPipe.position.set(ex, 1.18, 0.66);
          const fuelTank = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.42, 14), this.mats.brushedAluminum);
          fuelTank.rotation.x = Math.PI / 2;
          fuelTank.position.set(ex, 0.34, 0.65);
          semi.add(exhaustPipe, fuelTank);
        });

        for (let gy = 0.62; gy <= 0.84; gy += 0.055) {
          const grilleBar = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.022, 0.03), this.mats.chromeRoller);
          grilleBar.position.set(0, gy, 1.56);
          semi.add(grilleBar);
        }

        // 6 Bánh xe tải + Trục cầu nối ngang (Đỉnh bánh xe y = 0.44 < Đáy thùng y = 0.50)
        [-1.12, -0.48, 1.12].forEach((wz) => {
          const axle = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 1.04, 10), this.mats.darkMetal);
          axle.rotation.z = Math.PI / 2;
          axle.position.set(0, 0.22, wz);
          semi.add(axle);

          [-0.52, 0.52].forEach((wx) => {
            const wheel = this.createZeroFlickerWheel(0.22, 0.14);
            wheel.position.set(wx, 0.22, wz);
            semi.add(wheel);
          });
        });

        semi.add(floor, roof, leftWall, rightWall, insidePallet1, insidePallet2, cab, bumper, fairing, windshield);
        return semi;
      }

      // XE TẢI LẠNH REEFER BOX TRUCK (BAY 02) - Hoàn toàn tách lớp bánh xe, gầm và thùng
      createHighDetailBoxTruck() {
        const truck = new THREE.Group();

        // Khung gầm sắt-xi hẹp ở giữa (rộng 0.66m)
        const chassis = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.14, 2.9), this.mats.navySteel);
        chassis.position.set(0, 0.36, 0);
        truck.add(chassis);

        // Thùng xe tải dùng Texture tích hợp sẵn dải thương hiệu OMS (Đáy thùng tại y = 0.50m > Đỉnh bánh xe 0.44m)
        const boxOuter = new THREE.Mesh(
          new RoundedBoxGeometry(1.22, 1.28, 1.94, 3, 0.03),
          this.mats.truckBodyMat
        );
        boxOuter.position.set(0, 1.14, -0.44);
        boxOuter.castShadow = true;
        boxOuter.receiveShadow = true;
        truck.add(boxOuter);

        const reefer = new THREE.Mesh(new RoundedBoxGeometry(0.74, 0.3, 0.2, 2, 0.03), this.mats.navySteel);
        reefer.position.set(0, 1.56, 0.64);

        // Cabin xe tải (Đáy cabin tại y = 0.50m, cản trước tách rời ở dưới)
        const cabMain = new THREE.Mesh(new RoundedBoxGeometry(1.14, 0.94, 0.8, 4, 0.05), this.mats.primaryBlueMetal);
        cabMain.position.set(0, 0.97, 1.06);
        cabMain.castShadow = true;
        const frontBumper = new THREE.Mesh(new RoundedBoxGeometry(1.16, 0.15, 0.12, 2, 0.03), this.mats.navySteel);
        frontBumper.position.set(0, 0.36, 1.46);
        const windshield = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.34, 0.03), this.mats.darkMetal);
        windshield.position.set(0, 1.12, 1.48);

        [-0.38, 0.38].forEach((lx) => {
          const headlight = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.08, 0.03), this.mats.cyanEmissive);
          headlight.position.set(lx, 0.58, 1.48);
          truck.add(headlight);
        });

        [-0.98, -0.34, 1.04].forEach((wz) => {
          const axle = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 1.04, 10), this.mats.darkMetal);
          axle.rotation.z = Math.PI / 2;
          axle.position.set(0, 0.22, wz);
          truck.add(axle);

          [-0.52, 0.52].forEach((wx) => {
            const wheel = this.createZeroFlickerWheel(0.22, 0.14);
            wheel.position.set(wx, 0.22, wz);
            truck.add(wheel);
            this.movingTruckWheels.push(wheel);
          });
        });

        truck.add(reefer, cabMain, frontBumper, windshield);
        return truck;
      }

      // XE TẢI VAN ĐIỆN GIAO NHANH (BAY 03) - Gầm 0.44m, bánh xe bán kính 0.18m (đỉnh 0.36m)
      createElectricDeliveryVan() {
        const van = new THREE.Group();

        const chassis = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.12, 2.1), this.mats.navySteel);
        chassis.position.set(0, 0.3, 0.18);
        van.add(chassis);

        const cargoBox = new THREE.Mesh(new RoundedBoxGeometry(1.04, 1.02, 1.44, 3, 0.04), this.mats.smoothWhite);
        cargoBox.position.set(0, 0.95, -0.28);
        cargoBox.castShadow = true;

        const cyanStripe = new THREE.Mesh(new THREE.BoxGeometry(1.08, 0.1, 1.32), this.mats.emeraldEmissive);
        cyanStripe.position.set(0, 0.92, -0.28);

        const cab = new THREE.Mesh(new RoundedBoxGeometry(0.98, 0.76, 0.72, 4, 0.05), this.mats.mediumBlueMetal);
        cab.position.set(0, 0.82, 0.76);
        cab.castShadow = true;
        const bumper = new THREE.Mesh(new RoundedBoxGeometry(1.0, 0.13, 0.1, 2, 0.02), this.mats.navySteel);
        bumper.position.set(0, 0.3, 1.12);
        const glass = new THREE.Mesh(new THREE.BoxGeometry(0.86, 0.3, 0.03), this.mats.darkMetal);
        glass.position.set(0, 0.94, 1.14);

        [-0.68, 0.74].forEach((wz) => {
          const axle = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.9, 10), this.mats.darkMetal);
          axle.rotation.z = Math.PI / 2;
          axle.position.set(0, 0.18, wz);
          van.add(axle);

          [-0.45, 0.45].forEach((wx) => {
            const wheel = this.createZeroFlickerWheel(0.18, 0.12);
            wheel.position.set(wx, 0.18, wz);
            van.add(wheel);
          });
        });

        van.add(cargoBox, cyanStripe, cab, bumper, glass);
        return van;
      }

      // 14. TRẠM BIẾN ÁP, MÁY PHÁT ĐIỆN DỰ PHÒNG, BỐT AN NINH (3 TẦNG TÁCH BIỆT) & CÂY XANH
      buildYardSubstationGuardhouseAndTrees() {
        const yardGroup = new THREE.Group();

        const genHousing = new THREE.Mesh(new RoundedBoxGeometry(1.15, 0.78, 0.58, 2, 0.03), this.mats.navySteel);
        genHousing.position.set(-4.85, 0.39, 2.75);
        genHousing.castShadow = true;
        const genFlue = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.35, 10), this.mats.brushedAluminum);
        genFlue.position.set(-5.15, 0.955, 2.75);
        yardGroup.add(genHousing, genFlue);

        // Bốt gác an ninh RFID (Xếp 3 tầng Đế - Kính - Mái không đè nhau!)
        const boothBase = new THREE.Mesh(new RoundedBoxGeometry(0.82, 0.52, 0.82, 2, 0.03), this.mats.smoothWhite);
        boothBase.position.set(-0.22, 0.26, 4.45);
        boothBase.castShadow = true;
        const boothGlass = new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.46, 0.78), this.mats.architecturalGlass);
        boothGlass.position.set(-0.22, 0.75, 4.45);
        const boothRoof = new THREE.Mesh(new RoundedBoxGeometry(0.98, 0.12, 0.98, 2, 0.03), this.mats.primaryBlueMetal);
        boothRoof.position.set(-0.22, 1.04, 4.45);
        yardGroup.add(boothBase, boothGlass, boothRoof);

        // Cổng chắn Barrier tự động
        const gatePedestal = new THREE.Mesh(new RoundedBoxGeometry(0.22, 0.66, 0.22, 2, 0.03), this.mats.safetyYellow);
        gatePedestal.position.set(0.35, 0.33, 4.55);
        this.barrierArmPivot = new THREE.Group();
        this.barrierArmPivot.position.set(0.35, 0.6, 4.41);
        const barrierArm = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.05, 0.04), this.mats.crimsonPaint);
        barrierArm.position.x = 0.65;
        this.barrierArmPivot.add(barrierArm);
        yardGroup.add(gatePedestal, this.barrierArmPivot);

        // Trạm sạc siêu tốc EV Supercharger
        const chargerCabinet = new THREE.Mesh(new RoundedBoxGeometry(0.34, 0.98, 0.28, 3, 0.03), this.mats.navySteel);
        chargerCabinet.position.set(5.08, 0.49, 3.55);
        const chargerScreen = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.56, 0.16), this.mats.emeraldEmissive);
        chargerScreen.position.set(4.88, 0.54, 3.55);
        const cableCurve = new THREE.CatmullRomCurve3([
          new THREE.Vector3(4.9, 0.45, 3.55),
          new THREE.Vector3(4.75, 0.18, 3.55),
          new THREE.Vector3(4.62, 0.5, 3.55),
        ]);
        const chargingCable = new THREE.Mesh(
          new THREE.TubeGeometry(cableCurve, 16, 0.02, 8, false),
          this.mats.emeraldEmissive
        );
        yardGroup.add(chargerCabinet, chargerScreen, chargingCable);

        [
          [0.45, 2.42], [1.9, 2.42], [3.4, 2.42], [4.85, 2.42],
          [-0.95, 4.45], [-2.5, 4.45], [-4.2, 4.45],
        ].forEach(([bx, bz]) => {
          const bollard = new THREE.Mesh(new THREE.CylinderGeometry(0.048, 0.052, 0.46, 12), this.mats.safetyYellow);
          bollard.position.set(bx, 0.23, bz);
          bollard.castShadow = true;
          yardGroup.add(bollard);
        });

        [
          [-5.25, 3.5],
          [-5.25, 4.5],
          [-3.35, 4.75],
          [-1.55, 4.75],
          [5.25, 2.45],
          [5.25, 4.55],
        ].forEach(([tx, tz], idx) => {
          const tree = this.createArchitecturalTree(idx % 2 === 0 ? 1.0 : 0.84);
          tree.position.set(tx, 0.0, tz);
          yardGroup.add(tree);
        });

        this.modelRoot.add(yardGroup);
      }

      createArchitecturalTree(scale = 1) {
        const tree = new THREE.Group();
        tree.scale.setScalar(scale);

        const planter = new THREE.Mesh(new RoundedBoxGeometry(0.44, 0.14, 0.44, 2, 0.03), this.mats.smoothWhite);
        planter.position.y = 0.07;
        const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.06, 0.38, 8), this.mats.palletWood);
        trunk.position.y = 0.33;
        trunk.castShadow = true;

        const crown1 = new THREE.Mesh(new THREE.DodecahedronGeometry(0.28, 1), this.mats.foliageDark);
        crown1.position.set(0, 0.66, 0);
        crown1.castShadow = true;
        const crown2 = new THREE.Mesh(new THREE.DodecahedronGeometry(0.2, 1), this.mats.foliageBright);
        crown2.position.set(0.12, 0.88, 0.08);
        crown2.castShadow = true;

        tree.add(planter, trunk, crown1, crown2);
        return tree;
      }

      // 15. ĐỘI NGŨ KỸ SƯ & NHÂN VIÊN VẬN HÀNH 3D
      buildDetailedHumanStaff() {
        const staffLocations = [
          { x: 1.45, y: 2.41, z: -2.1, rotY: -0.6 },
          { x: 1.15, y: 2.41, z: -1.62, rotY: 3.14 },
          { x: -2.15, y: 0.18, z: 2.62, rotY: 3.14 },
          { x: -1.25, y: 0.18, z: 2.62, rotY: 3.14 },
          { x: -0.35, y: 0.18, z: 2.62, rotY: 3.14 },
          { x: 0.55, y: 0.18, z: 2.62, rotY: 3.14 },
          { x: -0.22, y: 0.0, z: 3.92, rotY: 1.57 },
        ];

        staffLocations.forEach((pos) => {
          const person = new THREE.Group();
          person.position.set(pos.x, pos.y, pos.z);
          person.rotation.y = pos.rotY;

          const legs = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.046, 0.25, 10), this.mats.navySteel);
          legs.position.y = 0.125;
          const torso = new THREE.Mesh(new RoundedBoxGeometry(0.135, 0.22, 0.085, 2, 0.025), this.mats.safetyYellow);
          torso.position.y = 0.36;
          const head = new THREE.Mesh(new THREE.SphereGeometry(0.052, 12, 12), this.mats.smoothWhite);
          head.position.y = 0.525;
          const helmet = new THREE.Mesh(
            new THREE.CylinderGeometry(0.058, 0.064, 0.045, 12),
            this.mats.primaryBlueMetal
          );
          helmet.position.y = 0.58;

          person.add(legs, torso, head, helmet);
          this.modelRoot.add(person);
        });
      }

      // 16. MẠNG LƯỚI CÁP QUANG DỮ LIỆU OMS NỘI BỘ
      buildInternalOmsDataFibers() {
        const fiberGroup = new THREE.Group();
        const holoOrigin = new THREE.Vector3(2.95, 3.12, -2.2);

        const targets = [
          new THREE.Vector3(-2.55, 3.25, -2.2),
          new THREE.Vector3(-3.7, 2.04, 0.32),
          new THREE.Vector3(-1.15, 1.4, 0.3),
          new THREE.Vector3(0.1, 1.12, 0.88),
          new THREE.Vector3(2.65, 2.38, 2.42),
        ];

        const conduitMat = new THREE.MeshBasicMaterial({
          color: this.C.mediumBlue,
          transparent: true,
          opacity: 0.34,
          depthWrite: false,
        });

        targets.forEach((targetPos, idx) => {
          const mid = holoOrigin.clone().lerp(targetPos, 0.5);
          mid.y += 0.82;

          const curve = new THREE.CatmullRomCurve3([holoOrigin, mid, targetPos]);
          const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 36, 0.018, 8, false), conduitMat);
          fiberGroup.add(tube);

          for (let p = 0; p < 2; p++) {
            const corePulse = new THREE.Mesh(
              new THREE.SphereGeometry(0.065, 12, 12),
              new THREE.MeshBasicMaterial({ color: 0xffffff })
            );
            const haloPulse = new THREE.Mesh(
              new THREE.SphereGeometry(0.12, 12, 12),
              new THREE.MeshBasicMaterial({
                color: this.C.cyanGlow,
                transparent: true,
                opacity: 0.5,
                depthWrite: false,
              })
            );
            fiberGroup.add(corePulse, haloPulse);

            this.pulsePackets.push({
              core: corePulse,
              halo: haloPulse,
              curve,
              progress: (p * 0.5 + idx * 0.2) % 1,
              speed: 0.44,
            });
          }
        });

        this.modelRoot.add(fiberGroup);
      }

      createBadgeTexture(text, bgHex, fgHex) {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 96;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = bgHex;
        ctx.fillRect(0, 0, 512, 96);
        ctx.strokeStyle = '#4B8DE5';
        ctx.lineWidth = 6;
        ctx.strokeRect(4, 4, 504, 88);
        ctx.fillStyle = fgHex;
        ctx.font = 'bold 26px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, 256, 48);
        const tex = new THREE.CanvasTexture(canvas);
        tex.colorSpace = THREE.SRGBColorSpace;
        return tex;
      }

      // ================= VÒNG LẶP ANIMATION 60 FPS =================
      animate = () => {
        if (this.disposed || !this.running) return;
        this.raf = requestAnimationFrame(this.animate);
        const now = performance.now();
        if (now - this.lastFrame < 32) return;
        const delta = Math.min((now - this.lastFrame) / 1000, 0.05);
        this.lastFrame = now;
        this.elapsed += delta;
        const elapsed = this.elapsed;

        // 1. 2 Cần trục AS/RS di chuyển & phóng càng lấy Pallet
        this.asrsCranes.forEach((crane) => {
          crane.group.position.x = Math.sin(elapsed * 0.65 + crane.phase) * 1.45;
          crane.carriage.position.y = 1.65 + Math.cos(elapsed * 1.3 + crane.phase) * 1.15;
          crane.pallet.position.z = Math.max(0, Math.sin(elapsed * 2.6 + crane.phase) - 0.55) * 0.4;
        });

        // 2. 2 Drone kiểm kê kho RFID
        this.drones.forEach((d) => {
          d.group.position.x = -2.55 + Math.cos(elapsed * 0.82 + d.phase) * 1.48;
          d.group.position.y = 3.05 + Math.sin(elapsed * 2.1 + d.phase) * 0.22;
          d.rotors.forEach((r) => { r.rotation.y += delta * 28; });
        });

        // 3. Hệ thống Monorail treo trần
        this.monorailCarriers.forEach((c) => {
          c.progress = (c.progress + delta * 0.068) % 1;
          const pt = this.monorailCurve.getPointAt(c.progress);
          const tan = this.monorailCurve.getTangentAt(c.progress);
          c.mesh.position.copy(pt);
          c.mesh.rotation.y = Math.atan2(tan.x, tan.z);
        });

        // 4. 2 Cánh tay Robot 6 bậc tự do & 2 Bàn xoay quấn màng PE
        this.robots.forEach((r) => {
          r.turret.rotation.y = Math.sin(elapsed * 1.5 + r.phase) * 1.32;
          r.lowerArm.rotation.x = Math.sin(elapsed * 3.0 + r.phase) * 0.26;
          r.upperArm.rotation.x = -0.15 + Math.cos(elapsed * 3.0 + r.phase) * 0.24;
        });
        this.wrappers.forEach((w) => {
          w.turntable.rotation.y = elapsed * 2.4 + w.phase;
          w.filmCarriage.position.y = 0.52 + Math.sin(elapsed * 2.6 + w.phase) * 0.3;
        });

        // 5. Băng chuyền con lăn, 4 Nhánh rẽ phân loại & Tia Laser
        this.conveyorBoxes.forEach((item) => {
          item.progress = (item.progress + delta * 0.082) % 1;
          const pt = this.conveyorCurve.getPointAt(item.progress);
          const tan = this.conveyorCurve.getTangentAt(item.progress);
          item.mesh.position.set(pt.x, pt.y + 0.14, pt.z);
          item.mesh.rotation.y = Math.atan2(tan.x, tan.z);
        });
        this.spurBoxes.forEach((sb) => {
          const slideT = (elapsed * 0.75 + sb.phase) % 1;
          sb.mesh.position.set(sb.baseX, 0.54 - slideT * 0.18, 1.56 + slideT * 0.46);
        });
        if (this.laserCurtain) {
          this.laserCurtain.position.y = 0.35 + Math.sin(elapsed * 5.2) * 0.14;
        }

        // 6. Đội 4 xe AGV & Xe nâng Reach-Forklift
        this.agvFleet.forEach((agvObj) => {
          agvObj.progress = (agvObj.progress + delta * agvObj.speed) % 1;
          const pos = this.agvPath.getPointAt(agvObj.progress);
          const next = this.agvPath.getPointAt((agvObj.progress + 0.02) % 1);
          agvObj.mesh.position.copy(pos);
          const targetYaw = Math.atan2(next.x - pos.x, next.z - pos.z);
          const targetQ = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), targetYaw);
          agvObj.mesh.quaternion.slerp(targetQ, Math.min(1, delta * 10));
          if (agvObj.mesh.userData.lidar) {
            agvObj.mesh.userData.lidar.rotation.y = elapsed * 5.8;
          }
        });
        if (this.forklift1 && this.forkliftCarriage) {
          this.forklift1.position.z = 2.25 + Math.sin(elapsed * 0.9) * 0.42;
          this.forkliftCarriage.position.y = 0.24 + (Math.sin(elapsed * 1.8) + 1) * 0.18;
        }

        // 7. Xe tải lạnh Bay 02 di chuyển & quay 6 bánh xe đồng bộ
        this.truckTime = (this.truckTime + delta) % 14;
        let truckOffsetZ = 0;
        if (this.truckTime >= 5.0 && this.truckTime < 8.5) {
          const t = (this.truckTime - 5.0) / 3.5;
          truckOffsetZ = t * t * (3 - 2 * t) * 1.15;
        } else if (this.truckTime >= 8.5 && this.truckTime < 10.5) {
          truckOffsetZ = 1.15;
        } else if (this.truckTime >= 10.5) {
          const t = (this.truckTime - 10.5) / 3.5;
          truckOffsetZ = (1 - t * t * (3 - 2 * t)) * 1.15;
        }
        const newTruckZ = 3.82 + truckOffsetZ;
        const deltaZ = newTruckZ - this.prevTruckZ;
        this.prevTruckZ = newTruckZ;
        this.detailedTruck.position.z = newTruckZ;

        // Xoay bánh xe theo quãng đường lăn bánh thực tế (deltaZ / bán kính 0.22m)
        if (Math.abs(deltaZ) > 0.00001) {
          const wheelRot = deltaZ / 0.22;
          this.movingTruckWheels.forEach((w) => {
            w.rotation.x += wheelRot;
          });
        }

        if (this.barrierArmPivot) {
          const armAngle = truckOffsetZ > 0.35 ? Math.PI / 2.2 : 0;
          this.barrierArmPivot.rotation.z = THREE.MathUtils.lerp(this.barrierArmPivot.rotation.z, armAngle, delta * 5);
        }

        // 8. Quạt HVAC, Cầu Hologram, Đèn Server & Luồng xung dữ liệu
        this.hvacFans.forEach((fan) => { fan.rotation.y += delta * 6.5; });
        if (this.omsHoloCore) {
          this.omsHoloCore.rotation.y = elapsed * 0.9;
          this.omsHoloCore.position.y = 1.1 + Math.sin(elapsed * 2.5) * 0.04;
        }
        this.serverBlinkLeds.forEach((item) => {
          item.mesh.material.emissiveIntensity = 0.6 + Math.max(0, Math.sin(elapsed * 7.2 + item.phase)) * 1.2;
        });
        this.pulsePackets.forEach((pkt) => {
          pkt.progress = (pkt.progress + delta * pkt.speed) % 1;
          const p = pkt.curve.getPointAt(pkt.progress);
          pkt.core.position.copy(p);
          pkt.halo.position.copy(p);
        });

        // 9. Chuyển động Camera mượt
        this.updateCameraMotion(delta);
        this.controls.update();
        this.renderFrame();
      };

      updateCameraMotion(delta) {
        if (Math.abs(this.targetAzimuthOffset) > 0.001) {
          const step = this.targetAzimuthOffset * Math.min(1, delta * 8);
          this.rotateAroundTarget(step);
          this.targetAzimuthOffset -= step;
        }

        if (this.isResettingCamera) {
          const desiredPos = new THREE.Vector3();
          const sinPhiRadius = Math.sin(this.defaultSpherical.phi) * this.defaultSpherical.radius;
          desiredPos.set(
            this.defaultTarget.x + sinPhiRadius * Math.sin(this.defaultSpherical.theta),
            this.defaultTarget.y + Math.cos(this.defaultSpherical.phi) * this.defaultSpherical.radius,
            this.defaultTarget.z + sinPhiRadius * Math.cos(this.defaultSpherical.theta)
          );

          this.camera.position.lerp(desiredPos, Math.min(1, delta * 6.5));
          this.controls.target.lerp(this.defaultTarget, Math.min(1, delta * 6.5));
          this.camera.zoom = THREE.MathUtils.lerp(this.camera.zoom, 1.0, Math.min(1, delta * 6.5));
          this.camera.updateProjectionMatrix();

          if (this.camera.position.distanceTo(desiredPos) < 0.05 && Math.abs(this.camera.zoom - 1.0) < 0.01) {
            this.camera.position.copy(desiredPos);
            this.controls.target.copy(this.defaultTarget);
            this.camera.zoom = 1.0;
            this.camera.updateProjectionMatrix();
            this.isResettingCamera = false;
          }
        } else if (this.autoRotateEnabled && !this.userInteracting) {
          this.rotateAroundTarget(delta * 0.12);
        }
      }

      rotateAroundTarget(angleRad) {
        const offset = this.camera.position.clone().sub(this.controls.target);
        offset.applyAxisAngle(new THREE.Vector3(0, 1, 0), angleRad);
        this.camera.position.copy(this.controls.target).add(offset);
        this.camera.lookAt(this.controls.target);
      }

      rotateLeft() {
        this.isResettingCamera = false;
        if (!this.running) { this.rotateAroundTarget(-Math.PI / 4); this.renderFrame(); } else this.targetAzimuthOffset -= Math.PI / 4;
      }

      rotateRight() {
        this.isResettingCamera = false;
        if (!this.running) { this.rotateAroundTarget(Math.PI / 4); this.renderFrame(); } else this.targetAzimuthOffset += Math.PI / 4;
      }

      resetCamera() {
        this.targetAzimuthOffset = 0;
        this.isResettingCamera = true;
        if (!this.running) { this.setCameraSpherical(this.defaultSpherical.radius, this.defaultSpherical.phi, this.defaultSpherical.theta); this.controls.target.copy(this.defaultTarget); this.camera.zoom = 1; this.camera.updateProjectionMatrix(); this.isResettingCamera = false; this.controls.update(); this.renderFrame(); }
      }

      toggleAutoRotate() {
        this.autoRotateEnabled = !this.autoRotateEnabled;
        return this.autoRotateEnabled;
      }

      setupResize() {
        const ro = new ResizeObserver(() => this.handleResize());
        ro.observe(this.container);
        this.resizeObserver = ro;
      }

      handleResize() {
        const width = Math.max(1, this.container.clientWidth);
        const height = Math.max(1, this.container.clientHeight);
        const aspect = width / height;

        const responsiveFrustum = Math.max(this.frustumSize, 16.5 / aspect);
        this.camera.left = (-responsiveFrustum * aspect) / 2;
        this.camera.right = (responsiveFrustum * aspect) / 2;
        this.camera.top = responsiveFrustum / 2;
        this.camera.bottom = -responsiveFrustum / 2;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
        this.renderFrame();
      }

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
    }

