// track.js - AutoRace 3D Track Generator & Environment Builder
(function() {
  'use strict';

  const TRACK_DEFINITIONS = {
    neon_city: {
      id: 'neon_city',
      name: 'Neon City Speedway',
      theme: 'neon',
      tagline: 'Cyberpunk Metropolis Night Circuit',
      difficulty: 'Medium',
      laps: 2,
      length: '2.4 km',
      skyColor: 0x050714,
      fogColor: 0x0b1026,
      fogNear: 60,
      fogFar: 350,
      roadColor: 0x1a1d24,
      curbColor1: 0x00f5d4, // Neon Cyan
      curbColor2: 0xf72585, // Neon Pink
      ambientLight: 0x4a5578,
      ambientIntensity: 0.8,
      dirLightColor: 0x90e0ef,
      dirLightIntensity: 1.0,
      // Track Spline Points (X, Y, Z)
      points: [
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(0, 0, 180),
        new THREE.Vector3(-40, 0, 260),
        new THREE.Vector3(-120, 0, 280),
        new THREE.Vector3(-200, 0, 240),
        new THREE.Vector3(-240, 0, 160),
        new THREE.Vector3(-220, 0, 60),
        new THREE.Vector3(-280, 0, -20),
        new THREE.Vector3(-260, 0, -140),
        new THREE.Vector3(-160, 0, -200),
        new THREE.Vector3(-60, 0, -180),
        new THREE.Vector3(40, 0, -240),
        new THREE.Vector3(140, 0, -200),
        new THREE.Vector3(180, 0, -100),
        new THREE.Vector3(140, 0, -20),
        new THREE.Vector3(60, 0, 20),
        new THREE.Vector3(0, 0, 0)
      ]
    },
    desert_canyon: {
      id: 'desert_canyon',
      name: 'Desert Canyon Rally',
      theme: 'desert',
      tagline: 'High-Speed Sweeping Sandstone Bends',
      difficulty: 'Hard',
      laps: 2,
      length: '2.8 km',
      skyColor: 0x3d1a10,
      fogColor: 0x80381e,
      fogNear: 70,
      fogFar: 400,
      roadColor: 0x2b2622,
      curbColor1: 0xffb703, // Amber
      curbColor2: 0xd90429, // Canyon Red
      ambientLight: 0xd48b55,
      ambientIntensity: 1.0,
      dirLightColor: 0xffd166,
      dirLightIntensity: 1.3,
      points: [
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(20, 0, 160),
        new THREE.Vector3(90, 0, 240),
        new THREE.Vector3(180, 0, 260),
        new THREE.Vector3(260, 0, 180),
        new THREE.Vector3(280, 0, 80),
        new THREE.Vector3(220, 0, -30),
        new THREE.Vector3(250, 0, -140),
        new THREE.Vector3(190, 0, -240),
        new THREE.Vector3(80, 0, -280),
        new THREE.Vector3(-40, 0, -250),
        new THREE.Vector3(-120, 0, -160),
        new THREE.Vector3(-140, 0, -40),
        new THREE.Vector3(-90, 0, 40),
        new THREE.Vector3(-30, 0, 20),
        new THREE.Vector3(0, 0, 0)
      ]
    },
    coastal_sunset: {
      id: 'coastal_sunset',
      name: 'Coastal Sunset Circuit',
      theme: 'coastal',
      tagline: 'Oceanic Causeway & Palm Bay Hairpins',
      difficulty: 'Easy / Medium',
      laps: 2,
      length: '2.2 km',
      skyColor: 0x1f2041,
      fogColor: 0x4b3f72,
      fogNear: 80,
      fogFar: 420,
      roadColor: 0x222629,
      curbColor1: 0xffffff, // White
      curbColor2: 0x118ab2, // Ocean Blue
      ambientLight: 0x8ecae6,
      ambientIntensity: 0.9,
      dirLightColor: 0xffb703,
      dirLightIntensity: 1.2,
      points: [
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(-20, 0, 150),
        new THREE.Vector3(-80, 0, 230),
        new THREE.Vector3(-170, 0, 240),
        new THREE.Vector3(-220, 0, 170),
        new THREE.Vector3(-200, 0, 80),
        new THREE.Vector3(-130, 0, 20),
        new THREE.Vector3(-80, 0, -60),
        new THREE.Vector3(-100, 0, -160),
        new THREE.Vector3(-40, 0, -240),
        new THREE.Vector3(60, 0, -230),
        new THREE.Vector3(130, 0, -160),
        new THREE.Vector3(120, 0, -60),
        new THREE.Vector3(60, 0, 0),
        new THREE.Vector3(0, 0, 0)
      ]
    }
  };

  class Track3D {
    constructor(scene, trackId) {
      this.scene = scene;
      this.trackId = trackId || 'neon_city';
      this.def = TRACK_DEFINITIONS[this.trackId] || TRACK_DEFINITIONS.neon_city;

      this.group = new THREE.Group();
      this.scene.add(this.group);

      this.roadWidth = 14;
      this.curve = null;
      this.waypoints = [];
      this.checkpoints = [];
      this.obstacles = [];

      this.buildTrack();
    }

    destroy() {
      if (this.group && this.scene) {
        this.scene.remove(this.group);
      }
    }

    buildTrack() {
      // 1. Create Smooth CatmullRom Curve
      this.curve = new THREE.CatmullRomCurve3(this.def.points, true, 'centripetal');
      
      const numSamples = 240;
      this.waypoints = this.curve.getPoints(numSamples);

      // 2. Build Road Ribbon Mesh
      this.buildRoadMesh(numSamples);

      // 3. Build Start / Finish Arch
      this.buildFinishArch();

      // 4. Build Environment & Props
      this.buildEnvironment();

      // 5. Setup Checkpoints for Lap Counting
      this.setupCheckpoints();
    }

    buildRoadMesh(numSamples) {
      const roadGeo = new THREE.BufferGeometry();
      const vertices = [];
      const uvs = [];
      const indices = [];

      const curbWidth = 1.0;
      const totalWidth = this.roadWidth + curbWidth * 2;
      const halfRoad = this.roadWidth / 2;

      for (let i = 0; i <= numSamples; i++) {
        const t = i / numSamples;
        const pt = this.curve.getPointAt(t);
        const tangent = this.curve.getTangentAt(t).normalize();
        const up = new THREE.Vector3(0, 1, 0);
        const normal = new THREE.Vector3().crossVectors(tangent, up).normalize();

        // 4 vertices per cross-section: Outer Left Curb, Road Left, Road Right, Outer Right Curb
        const p0 = pt.clone().add(normal.clone().multiplyScalar(halfRoad + curbWidth));
        const p1 = pt.clone().add(normal.clone().multiplyScalar(halfRoad));
        const p2 = pt.clone().add(normal.clone().multiplyScalar(-halfRoad));
        const p3 = pt.clone().add(normal.clone().multiplyScalar(-(halfRoad + curbWidth)));

        // Heights
        p0.y = 0.15; // Curb slight elevation
        p1.y = 0.05; // Road
        p2.y = 0.05;
        p3.y = 0.15;

        vertices.push(
          p0.x, p0.y, p0.z,
          p1.x, p1.y, p1.z,
          p2.x, p2.y, p2.z,
          p3.x, p3.y, p3.z
        );

        const vCoord = i * 2;
        uvs.push(
          0.0, vCoord,
          0.1, vCoord,
          0.9, vCoord,
          1.0, vCoord
        );

        if (i < numSamples) {
          const row1 = i * 4;
          const row2 = (i + 1) * 4;

          // Left Curb Quad
          indices.push(row1, row2, row1 + 1);
          indices.push(row1 + 1, row2, row2 + 1);

          // Asphalt Road Quad
          indices.push(row1 + 1, row2 + 1, row1 + 2);
          indices.push(row1 + 2, row2 + 1, row2 + 2);

          // Right Curb Quad
          indices.push(row1 + 2, row2 + 2, row1 + 3);
          indices.push(row1 + 3, row2 + 2, row2 + 3);
        }
      }

      roadGeo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
      roadGeo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
      roadGeo.setIndex(indices);
      roadGeo.computeVertexNormals();

      // Procedural Road Canvas Texture
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 512;
      const ctx = canvas.getContext('2d');

      // Left Curb
      ctx.fillStyle = this.def.curbColor1 ? '#' + this.def.curbColor1.toString(16).padStart(6, '0') : '#00f5d4';
      ctx.fillRect(0, 0, 50, 512);

      // Dark Asphalt
      ctx.fillStyle = '#' + this.def.roadColor.toString(16).padStart(6, '0');
      ctx.fillRect(50, 0, 412, 512);

      // White Center Dashed Line
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(250, 0, 12, 512);

      // Dash gap overlay
      ctx.fillStyle = '#' + this.def.roadColor.toString(16).padStart(6, '0');
      for (let y = 0; y < 512; y += 128) {
        ctx.fillRect(248, y + 64, 16, 64);
      }

      // Outer Solid Yellow Boundary Lines
      ctx.fillStyle = '#ffcc00';
      ctx.fillRect(60, 0, 6, 512);
      ctx.fillRect(446, 0, 6, 512);

      // Right Curb
      ctx.fillStyle = this.def.curbColor2 ? '#' + this.def.curbColor2.toString(16).padStart(6, '0') : '#f72585';
      ctx.fillRect(462, 0, 50, 512);

      const texture = new THREE.CanvasTexture(canvas);
      texture.wrapS = THREE.ClampToEdgeWrapping;
      texture.wrapT = THREE.RepeatWrapping;
      texture.repeat.set(1, numSamples / 6);

      const roadMat = new THREE.MeshStandardMaterial({
        map: texture,
        roughness: 0.8,
        metalness: 0.1
      });

      const roadMesh = new THREE.Mesh(roadGeo, roadMat);
      roadMesh.receiveShadow = true;
      this.group.add(roadMesh);

      // Ground plane below track
      const groundGeo = new THREE.PlaneGeometry(1200, 1200);
      let groundColor = 0x080c14;
      if (this.def.theme === 'desert') groundColor = 0xb5653b;
      if (this.def.theme === 'coastal') groundColor = 0x1d3557;

      const groundMat = new THREE.MeshStandardMaterial({
        color: groundColor,
        roughness: 0.95
      });
      const groundMesh = new THREE.Mesh(groundGeo, groundMat);
      groundMesh.rotation.x = -Math.PI / 2;
      groundMesh.position.y = -0.1;
      groundMesh.receiveShadow = true;
      this.group.add(groundMesh);
    }

    buildFinishArch() {
      const archGroup = new THREE.Group();
      const startPt = this.curve.getPointAt(0);
      const tangent = this.curve.getTangentAt(0).normalize();
      const up = new THREE.Vector3(0, 1, 0);
      const normal = new THREE.Vector3().crossVectors(tangent, up).normalize();

      archGroup.position.copy(startPt);
      archGroup.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), tangent);

      const postMat = new THREE.MeshStandardMaterial({ color: 0x222222, metalness: 0.8 });
      const postGeo = new THREE.CylinderGeometry(0.3, 0.3, 8, 8);

      const leftPost = new THREE.Mesh(postGeo, postMat);
      leftPost.position.set(-this.roadWidth / 2 - 1.2, 4, 0);
      archGroup.add(leftPost);

      const rightPost = new THREE.Mesh(postGeo, postMat);
      rightPost.position.set(this.roadWidth / 2 + 1.2, 4, 0);
      archGroup.add(rightPost);

      // Crossbar
      const barGeo = new THREE.BoxGeometry(this.roadWidth + 3, 1.8, 0.8);
      const barCanvas = document.createElement('canvas');
      barCanvas.width = 512;
      barCanvas.height = 128;
      const bCtx = barCanvas.getContext('2d');
      bCtx.fillStyle = '#111';
      bCtx.fillRect(0, 0, 512, 128);

      // Checkered pattern
      bCtx.fillStyle = '#fff';
      for (let x = 0; x < 512; x += 32) {
        for (let y = 0; y < 128; y += 32) {
          if ((x / 32 + y / 32) % 2 === 0) {
            bCtx.fillRect(x, y, 32, 32);
          }
        }
      }
      bCtx.fillStyle = 'rgba(0,0,0,0.7)';
      bCtx.fillRect(60, 24, 392, 80);
      bCtx.fillStyle = '#ffcc00';
      bCtx.font = 'bold 36px sans-serif';
      bCtx.textAlign = 'center';
      bCtx.fillText('AUTORACE FINISH', 256, 75);

      const barTexture = new THREE.CanvasTexture(barCanvas);
      const barMat = new THREE.MeshStandardMaterial({ map: barTexture });
      const barMesh = new THREE.Mesh(barGeo, barMat);
      barMesh.position.set(0, 7.5, 0);
      archGroup.add(barMesh);

      this.group.add(archGroup);
    }

    buildEnvironment() {
      if (this.def.theme === 'neon') {
        this.buildNeonMetropolis();
      } else if (this.def.theme === 'desert') {
        this.buildDesertCanyons();
      } else if (this.def.theme === 'coastal') {
        this.buildCoastalParadise();
      }
    }

    buildNeonMetropolis() {
      // Futuristic skyscrapers with glowing windows
      const buildingColors = [0x0a1128, 0x1c2541, 0x0b132b, 0x1f1a38];
      const neonHues = [0x00f5d4, 0x7b2cbf, 0xf72585, 0x4cc9f0];

      for (let i = 0; i < 90; i++) {
        const w = 15 + Math.random() * 25;
        const d = 15 + Math.random() * 25;
        const h = 40 + Math.random() * 120;

        // Position buildings outside road buffer
        const angle = Math.random() * Math.PI * 2;
        const radius = 90 + Math.random() * 280;
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;

        // Check distance to track curve
        if (this.distanceToTrack(x, z) < this.roadWidth * 1.6) continue;

        const bGeo = new THREE.BoxGeometry(w, h, d);
        const bMat = new THREE.MeshStandardMaterial({
          color: buildingColors[Math.floor(Math.random() * buildingColors.length)],
          roughness: 0.3,
          metalness: 0.7
        });
        const building = new THREE.Mesh(bGeo, bMat);
        building.position.set(x, h / 2, z);
        this.group.add(building);

        // Glowing neon antenna / rooftop lights
        if (Math.random() < 0.6) {
          const lightGeo = new THREE.BoxGeometry(w * 0.9, 1.5, d * 0.9);
          const lightMat = new THREE.MeshBasicMaterial({
            color: neonHues[Math.floor(Math.random() * neonHues.length)]
          });
          const roofNeon = new THREE.Mesh(lightGeo, lightMat);
          roofNeon.position.set(x, h + 0.8, z);
          this.group.add(roofNeon);
        }
      }

      // Street Lamps along track
      for (let i = 0; i < this.waypoints.length; i += 12) {
        const pt = this.waypoints[i];
        const tangent = this.curve.getTangentAt(i / this.waypoints.length);
        const normal = new THREE.Vector3().crossVectors(tangent, new THREE.Vector3(0, 1, 0)).normalize();

        [-1, 1].forEach(side => {
          const lampGroup = new THREE.Group();
          lampGroup.position.copy(pt).add(normal.clone().multiplyScalar(side * (this.roadWidth / 2 + 2.5)));
          
          const poleGeo = new THREE.CylinderGeometry(0.12, 0.15, 6, 6);
          const poleMat = new THREE.MeshStandardMaterial({ color: 0x333333 });
          const pole = new THREE.Mesh(poleGeo, poleMat);
          pole.position.y = 3;
          lampGroup.add(pole);

          const headGeo = new THREE.BoxGeometry(0.8, 0.2, 0.8);
          const headMat = new THREE.MeshBasicMaterial({ color: 0x00f5d4 });
          const head = new THREE.Mesh(headGeo, headMat);
          head.position.y = 6.1;
          lampGroup.add(head);

          this.group.add(lampGroup);
        });
      }
    }

    buildDesertCanyons() {
      // Sandstone rock spires and canyon arches
      const rockMat = new THREE.MeshStandardMaterial({
        color: 0xa84825,
        roughness: 0.9
      });

      for (let i = 0; i < 75; i++) {
        const radius = 100 + Math.random() * 260;
        const angle = Math.random() * Math.PI * 2;
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;

        if (this.distanceToTrack(x, z) < this.roadWidth * 1.5) continue;

        const rockHeight = 25 + Math.random() * 60;
        const rockWidth = 20 + Math.random() * 35;
        const rGeo = new THREE.ConeGeometry(rockWidth, rockHeight, 6);
        const rock = new THREE.Mesh(rGeo, rockMat);
        rock.position.set(x, rockHeight / 2, z);
        rock.rotation.y = Math.random() * Math.PI;
        this.group.add(rock);
      }

      // Desert Cacti
      const cactusMat = new THREE.MeshStandardMaterial({ color: 0x2d6a4f, roughness: 0.7 });
      for (let i = 0; i < 60; i++) {
        const angle = Math.random() * Math.PI * 2;
        const radius = 50 + Math.random() * 300;
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;

        if (this.distanceToTrack(x, z) < this.roadWidth * 1.4) continue;

        const cGroup = new THREE.Group();
        cGroup.position.set(x, 0, z);

        const stemGeo = new THREE.CylinderGeometry(0.4, 0.4, 4, 8);
        const stem = new THREE.Mesh(stemGeo, cactusMat);
        stem.position.y = 2;
        cGroup.add(stem);

        const armGeo = new THREE.CylinderGeometry(0.25, 0.25, 2, 8);
        const arm = new THREE.Mesh(armGeo, cactusMat);
        arm.position.set(0.8, 2.5, 0);
        arm.rotation.z = Math.PI / 4;
        cGroup.add(arm);

        this.group.add(cGroup);
      }
    }

    buildCoastalParadise() {
      // Ocean water plane
      const waterGeo = new THREE.PlaneGeometry(1600, 1600);
      const waterMat = new THREE.MeshStandardMaterial({
        color: 0x0077b6,
        roughness: 0.1,
        metalness: 0.8
      });
      const water = new THREE.Mesh(waterGeo, waterMat);
      water.rotation.x = -Math.PI / 2;
      water.position.y = -0.5;
      this.group.add(water);

      // Palm Trees
      const trunkMat = new THREE.MeshStandardMaterial({ color: 0x6f4e37, roughness: 0.8 });
      const leafMat = new THREE.MeshStandardMaterial({ color: 0x2d6a4f, roughness: 0.6 });

      for (let i = 0; i < 70; i++) {
        const angle = Math.random() * Math.PI * 2;
        const radius = 60 + Math.random() * 260;
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;

        if (this.distanceToTrack(x, z) < this.roadWidth * 1.5) continue;

        const palm = new THREE.Group();
        palm.position.set(x, 0, z);

        const trunkGeo = new THREE.CylinderGeometry(0.3, 0.5, 7, 7);
        const trunk = new THREE.Mesh(trunkGeo, trunkMat);
        trunk.position.y = 3.5;
        trunk.rotation.z = (Math.random() - 0.5) * 0.2;
        palm.add(trunk);

        const leafGeo = new THREE.ConeGeometry(3.5, 2.0, 7);
        const leaves = new THREE.Mesh(leafGeo, leafMat);
        leaves.position.y = 7.2;
        palm.add(leaves);

        this.group.add(palm);
      }
    }

    distanceToTrack(x, z) {
      let minDist = Infinity;
      const testPt = new THREE.Vector2(x, z);
      for (let i = 0; i < this.waypoints.length; i += 4) {
        const wp = this.waypoints[i];
        const d = testPt.distanceTo(new THREE.Vector2(wp.x, wp.z));
        if (d < minDist) minDist = d;
      }
      return minDist;
    }

    setupCheckpoints() {
      // 8 Checkpoints distributed evenly along the track
      const numCheckpoints = 8;
      this.checkpoints = [];
      for (let i = 0; i < numCheckpoints; i++) {
        const t = i / numCheckpoints;
        const pt = this.curve.getPointAt(t);
        this.checkpoints.push({
          index: i,
          t: t,
          position: pt,
          radius: this.roadWidth * 1.2
        });
      }
    }

    getClosestPointOnSpline(pos) {
      // Finds closest point and progress ratio t along curve
      let minDistance = Infinity;
      let bestT = 0;
      let bestPoint = null;

      const samples = 120;
      for (let i = 0; i < samples; i++) {
        const t = i / samples;
        const pt = this.curve.getPointAt(t);
        const distSq = pt.distanceToSquared(pos);
        if (distSq < minDistance) {
          minDistance = distSq;
          bestT = t;
          bestPoint = pt;
        }
      }

      return {
        t: bestT,
        point: bestPoint,
        distance: Math.sqrt(minDistance)
      };
    }
  }

  window.AutoRaceTracks = TRACK_DEFINITIONS;
  window.AutoRaceTrack3D = Track3D;
})();
