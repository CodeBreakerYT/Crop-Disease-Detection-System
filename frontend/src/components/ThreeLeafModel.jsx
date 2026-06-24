import React, { useEffect, useRef } from "react";
import * as THREE from "three";

export default function ThreeLeafModel() {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const requestRef = useRef(null);
  const stateRef = useRef({
    scene: null,
    camera: null,
    renderer: null,
    leafGroup: null,
    laserPlane: null,
    isDragging: false,
    prevMouse: { x: 0, y: 0 },
    rotationTarget: { x: 0.2, y: -0.5 },
    rotationCurrent: { x: 0.2, y: -0.5 },
    width: 0,
    height: 0
  });

  useEffect(() => {
    if (!containerRef.current || !canvasRef.current) return;

    const width = containerRef.current.clientWidth;
    const height = 420; // Expanded height for standard advisor console
    stateRef.current.width = width;
    stateRef.current.height = height;

    // 1. Scene Setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x070c0a); // Dark theme matching bg-secondary
    stateRef.current.scene = scene;

    // 2. Camera Setup
    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    camera.position.set(0, 0, 4.2);
    stateRef.current.camera = camera;

    // 3. Renderer Setup
    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current,
      antialias: true,
      alpha: true
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    stateRef.current.renderer = renderer;

    // 4. Lights Setup
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.55);
    scene.add(ambientLight);

    // Premium white key light for specular gloss
    const dirLight1 = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLight1.position.set(5, 5, 5);
    scene.add(dirLight1);

    // Emerald rim light to highlight waxy leaf edges
    const rimLight = new THREE.DirectionalLight(0x34d399, 0.8);
    rimLight.position.set(-6, -3, 3);
    scene.add(rimLight);

    const pointLight = new THREE.PointLight(0x10b981, 1.2, 10);
    pointLight.position.set(0, 0, 1.5);
    scene.add(pointLight);

    // Light for the backside so it's not dark
    const backLight = new THREE.DirectionalLight(0xffffff, 0.9);
    backLight.position.set(-5, -5, -5);
    scene.add(backLight);

    // 5. Build Procedural 3D Leaf Model
    const leafGroup = new THREE.Group();
    scene.add(leafGroup);
    stateRef.current.leafGroup = leafGroup;

    // Create Leaf Shape Geometry (Subdivided for curvature)
    const shape = new THREE.Shape();
    shape.moveTo(0, -1.2);
    shape.quadraticCurveTo(0.55, -0.6, 0.65, 0);
    shape.quadraticCurveTo(0.65, 0.6, 0.2, 1.0);
    shape.lineTo(0, 1.4); // Leaf tip
    shape.lineTo(-0.2, 1.0);
    shape.quadraticCurveTo(-0.65, 0.6, -0.65, 0);
    shape.quadraticCurveTo(-0.55, -0.6, 0, -1.2);

    const leafGeo = new THREE.ShapeGeometry(shape, 24);
    
    // Define organic leaf curvature function
    const getLeafZ = (x, y) => {
      // Parabolic curvature along X (sides bend down) + gentle sine wave along Y
      return -0.18 * Math.pow(x, 2) + Math.sin(y * 1.5) * 0.06;
    };

    // Deform vertices to introduce 3D curvature
    const posAttr = leafGeo.attributes.position;
    for (let i = 0; i < posAttr.count; i++) {
      const vx = posAttr.getX(i);
      const vy = posAttr.getY(i);
      posAttr.setZ(i, getLeafZ(vx, vy));
    }
    leafGeo.computeVertexNormals();

    const leafMat = new THREE.MeshStandardMaterial({
      color: 0x15803d, // Rich forest emerald
      roughness: 0.28, // High-gloss waxy surface
      metalness: 0.05,
      side: THREE.DoubleSide
    });

    const leafMesh = new THREE.Mesh(leafGeo, leafMat);
    leafGroup.add(leafMesh);

    // Create central and secondary leaf veins segmenting them to track leaf curve
    const veinPointsFront = [];
    const veinPointsBack = [];
    const addVeinPoint = (x, y) => {
      veinPointsFront.push(new THREE.Vector3(x, y, getLeafZ(x, y) + 0.012));
      veinPointsBack.push(new THREE.Vector3(x, y, getLeafZ(x, y) - 0.012));
    };

    // Segmented central vein
    for (let y = -1.2; y < 1.35; y += 0.1) {
      addVeinPoint(0, y);
      addVeinPoint(0, y + 0.1);
    }
    
    // Segmented lateral veins branching out
    for (let y = -0.9; y < 0.9; y += 0.25) {
      const scale = 1.0 - Math.abs(y) / 1.5;
      
      // Right branch segments
      for (let s = 0; s < 6; s++) {
        const t1 = s / 6;
        const t2 = (s + 1) / 6;
        addVeinPoint(0.55 * scale * t1, y + 0.22 * t1);
        addVeinPoint(0.55 * scale * t2, y + 0.22 * t2);
      }
      
      // Left branch segments
      for (let s = 0; s < 6; s++) {
        const t1 = s / 6;
        const t2 = (s + 1) / 6;
        addVeinPoint(-0.55 * scale * t1, y + 0.22 * t1);
        addVeinPoint(-0.55 * scale * t2, y + 0.22 * t2);
      }
    }

    const veinMat = new THREE.LineBasicMaterial({
      color: 0x34d399, // Bright emerald veins
      linewidth: 1.5
    });

    const veinGeoFront = new THREE.BufferGeometry().setFromPoints(veinPointsFront);
    const veinLineFront = new THREE.LineSegments(veinGeoFront, veinMat);
    leafGroup.add(veinLineFront);

    const veinGeoBack = new THREE.BufferGeometry().setFromPoints(veinPointsBack);
    const veinLineBack = new THREE.LineSegments(veinGeoBack, veinMat);
    leafGroup.add(veinLineBack);

    // 6. Glowing Green Holographic Laser Plane Scanner
    const laserGeo = new THREE.BoxGeometry(1.6, 0.03, 0.3);
    const laserMat = new THREE.MeshBasicMaterial({
      color: 0x10b981,
      transparent: true,
      opacity: 0.4
    });
    const laserPlane = new THREE.Mesh(laserGeo, laserMat);
    laserPlane.position.z = 0.08;
    leafGroup.add(laserPlane);
    stateRef.current.laserPlane = laserPlane;

    // Glowing outline edges for laser
    const edges = new THREE.EdgesGeometry(laserGeo);
    const edgeLine = new THREE.LineSegments(
      edges,
      new THREE.LineBasicMaterial({ color: 0x34d399, linewidth: 2 })
    );
    laserPlane.add(edgeLine);

    // Helper Grid background for high-tech HUD look
    const grid = new THREE.GridHelper(5, 15, 0x064e3b, 0x0c1e15);
    grid.position.z = -0.8;
    grid.rotation.x = Math.PI / 2;
    scene.add(grid);

    // 7. Event Listeners for Rotation Drags
    const handleMouseDown = (e) => {
      stateRef.current.isDragging = true;
      stateRef.current.prevMouse = { x: e.clientX, y: e.clientY };
    };

    const handleMouseMove = (e) => {
      if (!stateRef.current.isDragging || !stateRef.current.leafGroup) return;
      const deltaX = e.clientX - stateRef.current.prevMouse.x;
      const deltaY = e.clientY - stateRef.current.prevMouse.y;
      stateRef.current.prevMouse = { x: e.clientX, y: e.clientY };

      stateRef.current.rotationTarget.y += deltaX * 0.007;
      stateRef.current.rotationTarget.x += deltaY * 0.007;
      stateRef.current.rotationTarget.x = Math.max(-Math.PI/4, Math.min(Math.PI/4, stateRef.current.rotationTarget.x));
    };

    const handleMouseUp = () => {
      stateRef.current.isDragging = false;
    };

    const canvasElement = canvasRef.current;
    canvasElement.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    // Touch support
    const handleTouchStart = (e) => {
      if (e.touches.length === 1) {
        stateRef.current.isDragging = true;
        stateRef.current.prevMouse = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      }
    };
    const handleTouchMove = (e) => {
      if (!stateRef.current.isDragging || e.touches.length !== 1 || !stateRef.current.leafGroup) return;
      const deltaX = e.touches[0].clientX - stateRef.current.prevMouse.x;
      const deltaY = e.touches[0].clientY - stateRef.current.prevMouse.y;
      stateRef.current.prevMouse = { x: e.touches[0].clientX, y: e.touches[0].clientY };

      stateRef.current.rotationTarget.y += deltaX * 0.007;
      stateRef.current.rotationTarget.x += deltaY * 0.007;
      stateRef.current.rotationTarget.x = Math.max(-Math.PI/4, Math.min(Math.PI/4, stateRef.current.rotationTarget.x));
    };

    canvasElement.addEventListener("touchstart", handleTouchStart);
    window.addEventListener("touchmove", handleTouchMove);
    window.addEventListener("touchend", handleMouseUp);

    // 8. Resize Observer
    const resizeObserver = new ResizeObserver((entries) => {
      if (!entries || entries.length === 0) return;
      const newWidth = entries[0].contentRect.width;
      const newHeight = entries[0].contentRect.height || 420;
      stateRef.current.width = newWidth;
      stateRef.current.height = newHeight;
      camera.aspect = newWidth / newHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(newWidth, newHeight);
    });
    resizeObserver.observe(containerRef.current);

    // 9. Animation Loop
    let time = 0;
    const animate = () => {
      time += 0.015;
      const { leafGroup, laserPlane, rotationTarget, rotationCurrent, renderer } = stateRef.current;

      if (leafGroup) {
        if (!stateRef.current.isDragging) {
          // Slow floating rotation
          rotationTarget.y += 0.0025;
          leafGroup.position.y = Math.sin(time * 1.2) * 0.06;
        }

        // Smooth rotation damping
        rotationCurrent.x += (rotationTarget.x - rotationCurrent.x) * 0.08;
        rotationCurrent.y += (rotationTarget.y - rotationCurrent.y) * 0.08;
        leafGroup.rotation.x = rotationCurrent.x;
        leafGroup.rotation.y = rotationCurrent.y;
      }

      // Animate green laser sweep up/down the leaf shape mapping its curvature
      if (laserPlane) {
        const sweepY = Math.sin(time * 2.0) * 1.15;
        laserPlane.position.y = sweepY;
        // Map height Z based on curvature equation
        laserPlane.position.z = -0.18 * Math.pow(0, 2) + Math.sin(sweepY * 1.5) * 0.06 + 0.045;
        // Tilt laser to match curved surface slope
        laserPlane.rotation.x = Math.cos(sweepY * 1.5) * 0.09;
      }

      renderer.render(scene, camera);
      requestRef.current = requestAnimationFrame(animate);
    };
    
    requestRef.current = requestAnimationFrame(animate);

    // Cleanup
    return () => {
      cancelAnimationFrame(requestRef.current);
      resizeObserver.disconnect();
      canvasElement.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      canvasElement.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleMouseUp);
      
      scene.traverse((obj) => {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
          if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
          else obj.material.dispose();
        }
      });
      renderer.dispose();
    };
  }, []);

  return (
    <div 
      ref={containerRef} 
      className="relative w-full overflow-hidden rounded-xl border border-emerald-950/20"
      style={{ height: "420px", backgroundColor: "#070c0a" }}
    >
      <canvas ref={canvasRef} className="absolute inset-0 block h-full w-full outline-none" />
      
      {/* 3D Visualizer HUD Heading Overlay (Centered & Larger) */}
      <div 
        className="absolute pointer-events-none select-none flex"
        style={{ left: 0, right: 0, top: "24px", justifyContent: "center" }}
      >
        <div 
          className="flex items-center gap-2 font-bold text-emerald-400 uppercase tracking-widest bg-black/60 backdrop-blur-md rounded-full border border-emerald-500/20 shadow-lg"
          style={{ fontSize: "13px", padding: "8px 20px" }}
        >
          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping"></span>
          3D HOLO-MODEL READY
        </div>
      </div>

      {/* Subtext info positioned a little to the right */}
      <div 
        className="absolute pointer-events-none select-none font-mono tracking-wider"
        style={{ left: "32px", bottom: "24px", fontSize: "10px", color: "rgba(0, 230, 118, 0.7)" }}
      >
        DRAG MODEL TO ROTATE
      </div>
    </div>
  );
}
