/**
 * УМНАЯ ТЕПЛИЦА — 3D Viewer (Three.js WebGL)
 * Интерактивный просмотрщик 3D-модели теплицы
 * Разработка: Хусиханова Камила
 */

class GreenhouseViewer3D {
  constructor() {
    this.container = document.getElementById('canvas-3d');
    this.loadingScreen = document.getElementById('viewer-loading');
    this.progressBar = document.getElementById('loader-bar-fill');
    this.statusText = document.getElementById('loader-status');
    
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.controls = null;
    this.modelGroup = null;
    this.lights = {};
    
    this.isAutoRotate = true;
    this.isWireframe = false;
    this.currentLighting = 'day'; // 'day', 'studio', 'sunset'
    
    this.init();
  }

  init() {
    if (!this.container || typeof THREE === 'undefined') {
      console.warn('Three.js or container not available');
      return;
    }

    // 1. Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x111923);
    this.scene.fog = new THREE.FogExp2(0x111923, 0.025);

    // 2. Camera
    const aspect = this.container.clientWidth / this.container.clientHeight;
    this.camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 1000);
    this.camera.position.set(12, 8, 16);

    // 3. Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputEncoding = THREE.sRGBEncoding;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
    this.container.appendChild(this.renderer.domElement);

    // 4. Controls
    if (typeof THREE.OrbitControls !== 'undefined') {
      this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
      this.controls.enableDamping = true;
      this.controls.dampingFactor = 0.05;
      this.controls.maxPolarAngle = Math.PI / 2 + 0.05; // don't go below floor
      this.controls.minDistance = 3;
      this.controls.maxDistance = 50;
      this.controls.autoRotate = this.isAutoRotate;
      this.controls.autoRotateSpeed = 1.2;
      this.controls.target.set(0, 2, 0);
    }

    // 5. Lighting
    this.setupLighting();

    // 6. Ground grid & platform
    this.setupGround();

    // 7. Load Model
    this.modelGroup = new THREE.Group();
    this.scene.add(this.modelGroup);
    this.loadModel();

    // 8. Event Listeners
    window.addEventListener('resize', () => this.onWindowResize());
    this.setupUIControls();

    // 9. Animation Loop
    this.animate();
  }

  setupLighting() {
    // Ambient
    this.lights.ambient = new THREE.AmbientLight(0xd9e6f2, 0.8);
    this.scene.add(this.lights.ambient);

    // Main Sun Directional Light
    this.lights.sun = new THREE.DirectionalLight(0xfffaed, 1.4);
    this.lights.sun.position.set(15, 25, 15);
    this.lights.sun.castShadow = true;
    this.lights.sun.shadow.mapSize.width = 2048;
    this.lights.sun.shadow.mapSize.height = 2048;
    this.lights.sun.shadow.camera.near = 0.5;
    this.lights.sun.shadow.camera.far = 60;
    this.lights.sun.shadow.camera.left = -15;
    this.lights.sun.shadow.camera.right = 15;
    this.lights.sun.shadow.camera.top = 15;
    this.lights.sun.shadow.camera.bottom = -15;
    this.lights.sun.shadow.bias = -0.0005;
    this.scene.add(this.lights.sun);

    // Fill Light
    this.lights.fill = new THREE.DirectionalLight(0x7ba1c5, 0.6);
    this.lights.fill.position.set(-15, 10, -15);
    this.scene.add(this.lights.fill);

    // Point Light (Greenhouse Interior Glow)
    this.lights.interior = new THREE.PointLight(0x88ba99, 1.5, 15);
    this.lights.interior.position.set(0, 3, 0);
    this.scene.add(this.lights.interior);
  }

  setupGround() {
    // Platform
    const platformGeo = new THREE.CylinderGeometry(14, 14.5, 0.4, 64);
    const platformMat = new THREE.MeshStandardMaterial({
      color: 0x18222e,
      roughness: 0.8,
      metalness: 0.2
    });
    const platform = new THREE.Mesh(platformGeo, platformMat);
    platform.position.y = -0.2;
    platform.receiveShadow = true;
    this.scene.add(platform);

    // Tech Grid
    const grid = new THREE.GridHelper(26, 26, 0x7ba1c5, 0x223244);
    grid.position.y = 0.01;
    this.scene.add(grid);
  }

  setupDaeScene(dae) {
    this.updateProgress(85, 'Центрирование и настройка материалов...');

    // 1. Put dae inside a clean root wrapper group
    const wrapper = new THREE.Group();
    wrapper.add(dae);
    this.modelGroup.add(wrapper);

    // 2. Hide any unwanted elements if present
    wrapper.traverse((child) => {
      const name = (child.name || '').toLowerCase();
      if (name.includes('sree') || (child.material && (child.material.name || '').toLowerCase().includes('sree'))) {
        child.visible = false;
      }
    });

    // 3. Compute initial world bounding box
    wrapper.updateMatrixWorld(true);
    let box = new THREE.Box3().setFromObject(wrapper);
    let size = new THREE.Vector3();
    box.getSize(size);

    // 4. Uniform scaling to fit perfectly on the 3D showcase platform (diameter ~26)
    const maxDim = Math.max(size.x, size.y, size.z);
    const targetDim = 12.0;
    const scale = maxDim > 0 ? (targetDim / maxDim) : 1;
    wrapper.scale.set(scale, scale, scale);

    // 5. Recompute box in world space after scaling
    wrapper.updateMatrixWorld(true);
    box.setFromObject(wrapper);
    const center = new THREE.Vector3();
    box.getCenter(center);

    // 6. Shift wrapper so greenhouse is exactly centered at (0, 0) and rests flat on platform (y = 0)
    wrapper.position.x = -center.x;
    wrapper.position.y = -box.min.y;
    wrapper.position.z = -center.z;

    // 7. Enhance materials: double-sided rendering, shadows, glass transparency
    wrapper.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
        if (child.material) {
          const mats = Array.isArray(child.material) ? child.material : [child.material];
          mats.forEach((mat) => {
            mat.side = THREE.DoubleSide;
            const matName = (mat.name || '').toLowerCase();
            const childName = (child.name || '').toLowerCase();
            if (matName.includes('glass') || childName.includes('glass') || matName.includes('sky_reflection')) {
              mat.transparent = true;
              mat.opacity = 0.45;
              mat.roughness = 0.1;
              mat.metalness = 0.2;
              mat.depthWrite = true;
            }
          });
        }
      }
    });

    // 8. Focus camera nicely on the greenhouse center
    if (this.controls) {
      this.controls.target.set(0, targetDim * 0.3, 0);
      this.camera.position.set(14, 9, 16);
      this.controls.update();
    }

    this.updateProgress(100, '3D Модель загружена!');
    this.hideLoading();
  }

  loadModel() {
    this.updateProgress(20, 'Чтение файлов 3D геометрии...');

    if (typeof THREE.ColladaLoader !== 'undefined') {
      const loader = new THREE.ColladaLoader();

      // 1. First priority: Check if self-contained model data is present (works without server/CORS!)
      if (typeof window.GREENHOUSE_DAE_XML === 'string' && window.GREENHOUSE_DAE_XML.length > 100) {
        try {
          this.updateProgress(50, 'Сборка авторской 3D-модели...');
          const collada = loader.parse(window.GREENHOUSE_DAE_XML, '');
          this.setupDaeScene(collada.scene);
          return;
        } catch (parseErr) {
          console.warn('Direct parse failed, trying loader.load:', parseErr);
        }
      }

      // 2. Second priority: Load from DAE file over HTTP/HTTPS
      loader.load(
        'assets/models/greenhouse_clean.dae',
        (collada) => {
          this.setupDaeScene(collada.scene);
        },
        (xhr) => {
          if (xhr.lengthComputable) {
            const percent = Math.round((xhr.loaded / xhr.total) * 60) + 20;
            this.updateProgress(percent, `Загрузка: ${percent}%`);
          }
        },
        (error) => {
          console.warn('Collada load notice (falling back to procedural 3D model):', error);
          this.buildProceduralModel();
        }
      );
    } else {
      this.buildProceduralModel();
    }
  }

  buildProceduralModel() {
    this.updateProgress(60, 'Генерация архитектурных элементов 3D...');
    
    const greenhouse = new THREE.Group();

    // 1. Concrete / Wood Base Podium
    const baseGeo = new THREE.BoxGeometry(8, 0.4, 6);
    const baseMat = new THREE.MeshStandardMaterial({
      color: 0x4a3b32, // Wood planks tone
      roughness: 0.7,
      metalness: 0.1
    });
    const base = new THREE.Mesh(baseGeo, baseMat);
    base.position.y = 0.2;
    base.receiveShadow = true;
    base.castShadow = true;
    greenhouse.add(base);

    // 2. Metal Frame Structure (Aluminum Profiles)
    const frameMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      metalness: 0.8,
      roughness: 0.2
    });

    const createPillar = (x, z, h = 3.2) => {
      const pillarGeo = new THREE.BoxGeometry(0.12, h, 0.12);
      const pillar = new THREE.Mesh(pillarGeo, frameMat);
      pillar.position.set(x, h / 2 + 0.4, z);
      pillar.castShadow = true;
      greenhouse.add(pillar);
    };

    // 4 Corner Pillars + Intermediate pillars
    createPillar(-3.8, -2.8);
    createPillar(3.8, -2.8);
    createPillar(-3.8, 2.8);
    createPillar(3.8, 2.8);
    createPillar(0, -2.8);
    createPillar(0, 2.8);
    createPillar(-3.8, 0);
    createPillar(3.8, 0);

    // Top horizontal perimeter
    const topBarMat = frameMat;
    const barXGeo = new THREE.BoxGeometry(7.8, 0.12, 0.12);
    const barZGeo = new THREE.BoxGeometry(0.12, 0.12, 5.8);

    const barFront = new THREE.Mesh(barXGeo, topBarMat);
    barFront.position.set(0, 3.6, 2.8);
    greenhouse.add(barFront);

    const barBack = new THREE.Mesh(barXGeo, topBarMat);
    barBack.position.set(0, 3.6, -2.8);
    greenhouse.add(barBack);

    const barLeft = new THREE.Mesh(barZGeo, topBarMat);
    barLeft.position.set(-3.8, 3.6, 0);
    greenhouse.add(barLeft);

    const barRight = new THREE.Mesh(barZGeo, topBarMat);
    barRight.position.set(3.8, 3.6, 0);
    greenhouse.add(barRight);

    // 3. Gable Roof Structure
    const ridgeBar = new THREE.Mesh(barXGeo, topBarMat);
    ridgeBar.position.set(0, 4.8, 0);
    greenhouse.add(ridgeBar);

    // Roof Rafters
    const rafterGeo = new THREE.CylinderGeometry(0.06, 0.06, 3.1);
    for (let x = -3.8; x <= 3.8; x += 1.9) {
      // Front slope
      const rFront = new THREE.Mesh(rafterGeo, topBarMat);
      rFront.position.set(x, 4.2, 1.4);
      rFront.rotation.x = Math.PI / 4.8;
      greenhouse.add(rFront);

      // Back slope
      const rBack = new THREE.Mesh(rafterGeo, topBarMat);
      rBack.position.set(x, 4.2, -1.4);
      rBack.rotation.x = -Math.PI / 4.8;
      greenhouse.add(rBack);
    }

    // 4. Glass Panels (Tempered Glass with Refraction)
    const glassMat = new THREE.MeshPhysicalMaterial({
      color: 0xcbe3f5,
      transparent: true,
      opacity: 0.35,
      roughness: 0.05,
      metalness: 0.1,
      transmission: 0.7,
      ior: 1.5,
      side: THREE.DoubleSide
    });

    // Wall Glass
    const wallGlassGeoZ = new THREE.PlaneGeometry(5.6, 3.2);
    const wallGlassGeoX = new THREE.PlaneGeometry(7.6, 3.2);

    const glassFront = new THREE.Mesh(wallGlassGeoX, glassMat);
    glassFront.position.set(0, 2.0, 2.8);
    greenhouse.add(glassFront);

    const glassBack = new THREE.Mesh(wallGlassGeoX, glassMat);
    glassBack.position.set(0, 2.0, -2.8);
    greenhouse.add(glassBack);

    const glassLeft = new THREE.Mesh(wallGlassGeoZ, glassMat);
    glassLeft.position.set(-3.8, 2.0, 0);
    glassLeft.rotation.y = Math.PI / 2;
    greenhouse.add(glassLeft);

    const glassRight = new THREE.Mesh(wallGlassGeoZ, glassMat);
    glassRight.position.set(3.8, 2.0, 0);
    glassRight.rotation.y = Math.PI / 2;
    greenhouse.add(glassRight);

    // Roof Glass
    const roofGlassGeo = new THREE.PlaneGeometry(7.6, 3.1);
    const roofFront = new THREE.Mesh(roofGlassGeo, glassMat);
    roofFront.position.set(0, 4.2, 1.4);
    roofFront.rotation.x = -Math.PI / 4.8;
    greenhouse.add(roofFront);

    const roofBack = new THREE.Mesh(roofGlassGeo, glassMat);
    roofBack.position.set(0, 4.2, -1.4);
    roofBack.rotation.x = Math.PI / 4.8;
    greenhouse.add(roofBack);

    // 5. Interior: Planting Beds & Smart Irrigation Pots
    const bedMat = new THREE.MeshStandardMaterial({ color: 0x3d2817, roughness: 0.9 });
    const soilMat = new THREE.MeshStandardMaterial({ color: 0x1f150e, roughness: 1.0 });
    const plantMat = new THREE.MeshStandardMaterial({ color: 0x4ade80, roughness: 0.5 });
    const stemMat = new THREE.MeshStandardMaterial({ color: 0x166534 });

    const createPlantBed = (x, z) => {
      const box = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.6, 1.6), bedMat);
      box.position.set(x, 0.7, z);
      box.castShadow = true;
      greenhouse.add(box);

      const soil = new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.1, 1.4), soilMat);
      soil.position.set(x, 1.0, z);
      greenhouse.add(soil);

      // Add cute green plants
      for (let px = -1.1; px <= 1.1; px += 0.55) {
        for (let pz = -0.4; pz <= 0.4; pz += 0.4) {
          const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.3), stemMat);
          stem.position.set(x + px, 1.2, z + pz);
          greenhouse.add(stem);

          const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 8), plantMat);
          leaf.scale.set(1.4, 0.8, 1.2);
          leaf.position.set(x + px, 1.35, z + pz);
          leaf.castShadow = true;
          greenhouse.add(leaf);
        }
      }

      // Smart drip irrigation tubes
      const tubeMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.4 });
      const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 3.1), tubeMat);
      tube.rotation.z = Math.PI / 2;
      tube.position.set(x, 1.05, z);
      greenhouse.add(tube);
    };

    createPlantBed(-1.8, -1.4);
    createPlantBed(-1.8, 1.4);
    createPlantBed(1.8, -1.4);
    createPlantBed(1.8, 1.4);

    // 6. Smart Control Box / Microcontroller Hub with LED
    const hubBox = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 0.8, 0.3),
      new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.9, roughness: 0.2 })
    );
    hubBox.position.set(3.7, 2.2, 0);
    greenhouse.add(hubBox);

    // LED Status Indicator
    const led = new THREE.Mesh(
      new THREE.SphereGeometry(0.04, 16, 16),
      new THREE.MeshBasicMaterial({ color: 0x22c55e })
    );
    led.position.set(3.53, 2.4, 0);
    greenhouse.add(led);

    // 7. Overhead LED Grow-Light Fixtures
    const ledBarGeo = new THREE.BoxGeometry(7.0, 0.08, 0.25);
    const ledBarMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.8 });
    const ledBar = new THREE.Mesh(ledBarGeo, ledBarMat);
    ledBar.position.set(0, 3.5, 0);
    greenhouse.add(ledBar);

    const ledGlowGeo = new THREE.PlaneGeometry(6.8, 0.2);
    const ledGlowMat = new THREE.MeshBasicMaterial({ color: 0xf472b6, side: THREE.DoubleSide });
    const ledGlow = new THREE.Mesh(ledGlowGeo, ledGlowMat);
    ledGlow.rotation.x = Math.PI / 2;
    ledGlow.position.set(0, 3.45, 0);
    greenhouse.add(ledGlow);

    this.modelGroup.add(greenhouse);
    this.updateProgress(100, 'Готово!');
    this.hideLoading();
  }

  updateProgress(percent, text) {
    if (this.progressBar) this.progressBar.style.width = `${percent}%`;
    if (this.statusText) this.statusText.innerText = text;
  }

  hideLoading() {
    setTimeout(() => {
      if (this.loadingScreen) {
        this.loadingScreen.classList.add('loaded');
      }
    }, 400);
  }

  setupUIControls() {
    // Auto Rotate Button
    const btnRotate = document.getElementById('btn-3d-rotate');
    if (btnRotate) {
      btnRotate.addEventListener('click', () => {
        this.isAutoRotate = !this.isAutoRotate;
        if (this.controls) this.controls.autoRotate = this.isAutoRotate;
        btnRotate.classList.toggle('active', this.isAutoRotate);
      });
    }

    // Wireframe Mode Button
    const btnWireframe = document.getElementById('btn-3d-wireframe');
    if (btnWireframe) {
      btnWireframe.addEventListener('click', () => {
        this.isWireframe = !this.isWireframe;
        btnWireframe.classList.toggle('active', this.isWireframe);
        this.toggleWireframe(this.isWireframe);
      });
    }

    // Reset Camera Button
    const btnReset = document.getElementById('btn-3d-reset');
    if (btnReset) {
      btnReset.addEventListener('click', () => {
        this.resetCamera();
      });
    }

    // Lighting Switch Button
    const btnLight = document.getElementById('btn-3d-light');
    if (btnLight) {
      btnLight.addEventListener('click', () => {
        this.cycleLighting();
      });
    }

    // Fullscreen Button
    const btnFullscreen = document.getElementById('btn-3d-fullscreen');
    const containerWrapper = document.getElementById('viewer-3d-wrapper');
    if (btnFullscreen && containerWrapper) {
      btnFullscreen.addEventListener('click', () => {
        if (!document.fullscreenElement) {
          containerWrapper.requestFullscreen().catch(err => console.warn(err));
        } else {
          document.exitFullscreen();
        }
      });
    }
  }

  toggleWireframe(enabled) {
    if (!this.modelGroup) return;
    this.modelGroup.traverse((child) => {
      if (child.isMesh && child.material) {
        if (Array.isArray(child.material)) {
          child.material.forEach(m => m.wireframe = enabled);
        } else {
          child.material.wireframe = enabled;
        }
      }
    });
  }

  resetCamera() {
    if (!this.camera || !this.controls) return;
    this.camera.position.set(14, 9, 16);
    this.controls.target.set(0, 3.6, 0);
    this.controls.update();
  }

  cycleLighting() {
    if (this.currentLighting === 'day') {
      // Switch to Sunset
      this.currentLighting = 'sunset';
      this.scene.background.setHex(0x1a0f1e);
      this.lights.ambient.color.setHex(0xe879f9);
      this.lights.ambient.intensity = 0.5;
      this.lights.sun.color.setHex(0xf97316);
      this.lights.sun.intensity = 1.8;
      this.lights.interior.intensity = 2.5;
      this.lights.interior.color.setHex(0xa855f7);
    } else if (this.currentLighting === 'sunset') {
      // Switch to Studio / Clean
      this.currentLighting = 'studio';
      this.scene.background.setHex(0x0a1017);
      this.lights.ambient.color.setHex(0xffffff);
      this.lights.ambient.intensity = 1.2;
      this.lights.sun.color.setHex(0xffffff);
      this.lights.sun.intensity = 1.0;
      this.lights.interior.intensity = 1.0;
      this.lights.interior.color.setHex(0x88ba99);
    } else {
      // Back to Day
      this.currentLighting = 'day';
      this.scene.background.setHex(0x111923);
      this.lights.ambient.color.setHex(0xd9e6f2);
      this.lights.ambient.intensity = 0.8;
      this.lights.sun.color.setHex(0xfffaed);
      this.lights.sun.intensity = 1.4;
      this.lights.interior.intensity = 1.5;
      this.lights.interior.color.setHex(0x88ba99);
    }
  }

  onWindowResize() {
    if (!this.container || !this.camera || !this.renderer) return;
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  animate() {
    requestAnimationFrame(() => this.animate());
    
    if (this.controls) {
      this.controls.update();
    }

    if (this.renderer && this.scene && this.camera) {
      this.renderer.render(this.scene, this.camera);
    }
  }
}

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', () => {
  window.greenhouseViewer = new GreenhouseViewer3D();
});
