import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";

export default function ThreeInspector({ imageUrl, spots = [], lang = "en" }) {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const [labelPositions, setLabelPositions] = useState([]);
  const requestRef = useRef(null);
  
  // Track scene refs for resize and mouse events
  const stateRef = useRef({
    scene: null,
    camera: null,
    renderer: null,
    leafMesh: null,
    isDragging: false,
    prevMouse: { x: 0, y: 0 },
    rotationTarget: { x: 0, y: 0 },
    rotationCurrent: { x: 0, y: 0 },
    zoom: 4.5,
    zoomTarget: 4.5,
    width: 0,
    height: 0,
    spotsData: []
  });

  useEffect(() => {
    if (!containerRef.current || !canvasRef.current || !imageUrl) return;

    // Defer init by one frame so the container has valid layout dimensions
    let initFrameId = requestAnimationFrame(() => {
    const width = containerRef.current?.clientWidth || 600;
    const height = 550; // Expanded height for diagnostic scanner
    stateRef.current.width = width;
    stateRef.current.height = height;

    // 1. Scene Setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a1410); // Match dark green-black layout
    stateRef.current.scene = scene;

    // 2. Camera Setup
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 0, stateRef.current.zoom);
    stateRef.current.camera = camera;

    // 3. Renderer Setup
    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current,
      antialias: true,
      alpha: false,
      powerPreference: "high-performance"
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    stateRef.current.renderer = renderer;

    // 4. Lighting Setup
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.65);
    scene.add(ambientLight);

    // Warm key light for waxy highlights
    const dirLight1 = new THREE.DirectionalLight(0xffffff, 1.0);
    dirLight1.position.set(6, 6, 8);
    scene.add(dirLight1);

    // Emerald rim light
    const rimLight = new THREE.DirectionalLight(0x10b981, 0.5);
    rimLight.position.set(-6, -4, 4);
    scene.add(rimLight);

    // Back light to illuminate the reverse side of the leaf
    const backLight = new THREE.DirectionalLight(0xffffff, 0.85);
    backLight.position.set(-5, -5, -8);
    scene.add(backLight);

    // 5. Leaf Texture Loader
    const textureLoader = new THREE.TextureLoader();
    textureLoader.load(imageUrl, (texture) => {
      // Find Aspect Ratio
      const imgWidth = texture.image.width;
      const imgHeight = texture.image.height;
      const aspect = imgWidth / imgHeight;

      // Plane Size (fits in 2.2x2.2 box)
      let w = 2.4;
      let h = 2.4 / aspect;
      if (aspect < 1) {
        h = 2.4;
        w = 2.4 * aspect;
      }

      // Create Curved Leaf Mesh (Subdivided for curvature)
      const geometry = new THREE.PlaneGeometry(w, h, 32, 32);
      
      // Leaf curvature function
      const getLeafZ = (x, y) => {
        const normX = x / (w / 2);
        return -0.16 * Math.pow(normX, 2) + Math.sin((y / h) * Math.PI) * 0.08;
      };

      const pos = geometry.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const vx = pos.getX(i);
        const vy = pos.getY(i);
        pos.setZ(i, getLeafZ(vx, vy));
      }
      geometry.computeVertexNormals();

      const material = new THREE.MeshStandardMaterial({
        map: texture,
        bumpMap: texture,
        bumpScale: 0.02,     // Visual depth bump map of leaf veins and lesions
        roughness: 0.32,      // Semi-gloss waxy surface reflection
        metalness: 0.04,
        side: THREE.DoubleSide
      });
      
      const leafMesh = new THREE.Mesh(geometry, material);
      scene.add(leafMesh);
      stateRef.current.leafMesh = leafMesh;

      // The dark backing board (frameMesh) was removed so the leaf texture is visible from the back via DoubleSide

      // Create grid helpers to make it look like a diagnostic scan
      const grid = new THREE.GridHelper(6, 24, 0x10b981, 0x112c20);
      grid.position.z = -0.5;
      grid.rotation.x = Math.PI / 2;
      scene.add(grid);

      // 6. Draw 3D Disease Bounding Boxes & Pointers
      const spotsDataList = [];

      spots.forEach((spot, idx) => {
        // Map spot normalized coordinates [0-1] to plane local coordinates
        // Image top-left is (0,0), bottom-right is (1,1)
        // Plane center is (0,0), ranging from [-w/2, -h/2] to [w/2, h/2]
        const centerX = -w/2 + (spot.x + spot.w/2) * w;
        const centerY = h/2 - (spot.y + spot.h/2) * h;
        
        const boxW = spot.w * w;
        const boxH = spot.h * h;

        const centerZ = getLeafZ(centerX, centerY);

        // Draw wireframe red box with slight 3D thickness (depth)
        const boxGeo = new THREE.BoxGeometry(boxW, boxH, 0.08);
        const edges = new THREE.EdgesGeometry(boxGeo);
        const line = new THREE.LineSegments(
          edges,
          new THREE.LineBasicMaterial({ color: 0xef4444, linewidth: 2 })
        );
        // Position slightly in front of leaf plane
        line.position.set(centerX, centerY, centerZ + 0.041);
        
        // Tilt box slightly around Y axis to match local horizontal leaf slope
        const slopeX = -1.28 * centerX / (w * w);
        const angleY = Math.atan(slopeX);
        line.rotation.y = angleY;
        
        leafMesh.add(line);

        // Semi-transparent red fill for the spot
        const fillMat = new THREE.MeshBasicMaterial({
          color: 0xef4444,
          transparent: true,
          opacity: 0.18,
          side: THREE.DoubleSide
        });
        const fillMesh = new THREE.Mesh(new THREE.PlaneGeometry(boxW, boxH), fillMat);
        fillMesh.position.set(centerX, centerY, centerZ + 0.04);
        fillMesh.rotation.y = angleY;
        leafMesh.add(fillMesh);

        // Draw pointer lines extending from box out in 3D
        const p1 = new THREE.Vector3(centerX, centerY, centerZ + 0.04);
        
        // Decide pointer direction based on quadrant
        const dirX = centerX >= 0 ? 0.35 : -0.35;
        const dirY = centerY >= 0 ? 0.25 : -0.25;
        
        const p2 = new THREE.Vector3(centerX + dirX, centerY + dirY, centerZ + 0.45);
        const p3 = new THREE.Vector3(centerX + dirX + (dirX > 0 ? 0.15 : -0.15), centerY + dirY, centerZ + 0.45);

        const linePoints = [p1, p2, p3];
        const pointerGeo = new THREE.BufferGeometry().setFromPoints(linePoints);
        const pointerLine = new THREE.Line(
          pointerGeo,
          new THREE.LineBasicMaterial({ color: 0xef4444, linewidth: 1.5 })
        );
        leafMesh.add(pointerLine);

        // Small glowing dot at the end of the pointer
        const dotGeo = new THREE.SphereGeometry(0.02, 8, 8);
        const dotMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
        const dotMesh = new THREE.Mesh(dotGeo, dotMat);
        dotMesh.position.copy(p3);
        leafMesh.add(dotMesh);

        // Save reference coordinates to calculate projected screen pixels later
        spotsDataList.push({
          labelId: idx + 1,
          conf: Math.round(spot.confidence * 100),
          localPos: p3 // End of the line
        });
      });

      stateRef.current.spotsData = spotsDataList;
    });

    // 7. Event Handlers (Mouse Drag & Zoom)
    const handleMouseDown = (e) => {
      stateRef.current.isDragging = true;
      stateRef.current.prevMouse = { x: e.clientX, y: e.clientY };
    };

    const handleMouseMove = (e) => {
      if (!stateRef.current.isDragging || !stateRef.current.leafMesh) return;
      
      const deltaX = e.clientX - stateRef.current.prevMouse.x;
      const deltaY = e.clientY - stateRef.current.prevMouse.y;
      stateRef.current.prevMouse = { x: e.clientX, y: e.clientY };

      // Update target rotation
      stateRef.current.rotationTarget.y += deltaX * 0.007;
      stateRef.current.rotationTarget.x += deltaY * 0.007;
      
      // Limit vertical rotation (no flips)
      stateRef.current.rotationTarget.x = Math.max(
        -Math.PI / 3.5,
        Math.min(Math.PI / 3.5, stateRef.current.rotationTarget.x)
      );
    };

    const handleMouseUp = () => {
      stateRef.current.isDragging = false;
    };

    const handleWheel = (e) => {
      e.preventDefault();
      // Zoom factor limit [3.0 - 6.5]
      stateRef.current.zoomTarget += e.deltaY * 0.003;
      stateRef.current.zoomTarget = Math.max(2.8, Math.min(6.2, stateRef.current.zoomTarget));
    };

    const canvasElement = canvasRef.current;
    canvasElement.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    canvasElement.addEventListener("wheel", handleWheel, { passive: false });

    // Touch support
    const handleTouchStart = (e) => {
      if (e.touches.length === 1) {
        stateRef.current.isDragging = true;
        stateRef.current.prevMouse = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      }
    };

    const handleTouchMove = (e) => {
      if (!stateRef.current.isDragging || e.touches.length !== 1 || !stateRef.current.leafMesh) return;
      const deltaX = e.touches[0].clientX - stateRef.current.prevMouse.x;
      const deltaY = e.touches[0].clientY - stateRef.current.prevMouse.y;
      stateRef.current.prevMouse = { x: e.touches[0].clientX, y: e.touches[0].clientY };

      stateRef.current.rotationTarget.y += deltaX * 0.007;
      stateRef.current.rotationTarget.x += deltaY * 0.007;
      stateRef.current.rotationTarget.x = Math.max(-Math.PI/3.5, Math.min(Math.PI/3.5, stateRef.current.rotationTarget.x));
    };

    canvasElement.addEventListener("touchstart", handleTouchStart);
    window.addEventListener("touchmove", handleTouchMove);
    window.addEventListener("touchend", handleMouseUp);

    // 8. Resize Observer
    const resizeObserver = new ResizeObserver((entries) => {
      if (!entries || entries.length === 0) return;
      const newWidth = entries[0].contentRect.width;
      const newHeight = entries[0].contentRect.height || 550;
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
      
      const { leafMesh, camera, renderer, rotationTarget, rotationCurrent, zoomTarget, zoom } = stateRef.current;

      if (leafMesh) {
        // If not dragging, float leaf mesh gently in 3D space
        if (!stateRef.current.isDragging) {
          // Slow floating idle oscillation
          leafMesh.position.y = Math.sin(time * 0.8) * 0.05;
          leafMesh.position.x = Math.cos(time * 0.5) * 0.02;
          
          // Damping rotation back to subtle auto oscillation
          rotationTarget.y += Math.sin(time * 0.1) * 0.0003;
        }

        // Interpolate rotation (smooth damping)
        rotationCurrent.x += (rotationTarget.x - rotationCurrent.x) * 0.08;
        rotationCurrent.y += (rotationTarget.y - rotationCurrent.y) * 0.08;

        leafMesh.rotation.x = rotationCurrent.x;
        leafMesh.rotation.y = rotationCurrent.y;
      }

      // Smooth zoom damping
      stateRef.current.zoom += (zoomTarget - stateRef.current.zoom) * 0.1;
      camera.position.z = stateRef.current.zoom;

      // Render Scene
      renderer.render(scene, camera);

      // Project 3D points to 2D HTML overlays
      if (leafMesh && stateRef.current.spotsData.length > 0) {
        const positions = stateRef.current.spotsData.map((spot) => {
          const tempV = new THREE.Vector3().copy(spot.localPos);
          // Local to World coordinates
          leafMesh.localToWorld(tempV);
          // World to screen Normalized Device Coordinates (NDC)
          tempV.project(camera);

          // Map NDC to 2D Pixel positions
          const xPixel = (tempV.x * 0.5 + 0.5) * stateRef.current.width;
          const yPixel = (-tempV.y * 0.5 + 0.5) * stateRef.current.height;

          // Check if point is behind camera
          const visible = tempV.z <= 1;

          return {
            id: spot.labelId,
            conf: spot.conf,
            x: xPixel,
            y: yPixel,
            visible
          };
        });
        setLabelPositions(positions);
      }

      requestRef.current = requestAnimationFrame(animate);
    };

    requestRef.current = requestAnimationFrame(animate);

    // Store cleanup references in a variable accessible to the outer cleanup
    stateRef.current._cleanup = () => {
      cancelAnimationFrame(requestRef.current);
      resizeObserver.disconnect();
      canvasElement.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      canvasElement.removeEventListener("wheel", handleWheel);
      canvasElement.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleMouseUp);
      
      // Dispose Geometries/Materials
      scene.traverse((obj) => {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
          if (Array.isArray(obj.material)) {
            obj.material.forEach((m) => m.dispose());
          } else {
            obj.material.dispose();
          }
        }
      });
      renderer.dispose();
    };
    }); // end requestAnimationFrame

    // Clean up
    return () => {
      cancelAnimationFrame(initFrameId);
      if (stateRef.current._cleanup) {
        stateRef.current._cleanup();
      } else {
        // If cleanup hasn't been set yet (init frame hasn't fired), cancel animation
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, [imageUrl, spots]);

  return (
    <div 
      ref={containerRef} 
      className="relative w-full overflow-hidden rounded-2xl border border-emerald-950/30 shadow-inner"
      style={{ height: "550px", backgroundColor: "#0a1410" }}
    >
      {/* 3D WebGL Canvas */}
      <canvas ref={canvasRef} className="absolute inset-0 block h-full w-full outline-none" />

      {/* Futuristic Diagnostic HUD Overlay */}
      <div className="absolute left-6 top-6 pointer-events-none select-none flex flex-col gap-1.5 bg-black/60 backdrop-blur-md px-3.5 py-2.5 rounded-lg border border-emerald-500/20 text-xs text-emerald-400 font-mono">
        <div className="flex items-center gap-1.5 text-[10px] text-emerald-500 font-bold uppercase tracking-wider">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
          Diagnostic Scanner 3D
        </div>
        <div>MODEL: RESNET-CNN</div>
        <div>STATUS: INGESTED</div>
        <div>MARKERS: {spots.length} FOUND</div>
      </div>

      {/* Floating 2D HTML Labels positioned relative to 3D projected coordinates */}
      {labelPositions.map((pos) => {
        if (!pos.visible) return null;
        
        // Decide label align: if label is on the left side of screen, float to right, and vice-versa
        const alignLeft = pos.x > stateRef.current.width / 2;
        
        return (
          <div
            key={pos.id}
            className="absolute pointer-events-none z-10 flex items-center gap-2 transition-all duration-75"
            style={{
              left: `${pos.x}px`,
              top: `${pos.y}px`,
              transform: "translate(-50%, -50%)"
            }}
          >
            {/* The Target Circle Marker directly on the end of the line */}
            <div className="h-3 w-3 rounded-full border-2 border-red-500 bg-red-950/60 flex items-center justify-center animate-ping" />
            <div className="absolute h-1.5 w-1.5 rounded-full bg-red-500" />
            
            {/* The callout tag containing details */}
            <div 
              className={`absolute bg-red-950/80 backdrop-blur-md border border-red-500/40 rounded px-2 py-1 flex flex-col font-mono text-[9px] text-red-100 shadow-md ${
                alignLeft ? "right-4" : "left-4"
              }`}
              style={{ width: "115px", whiteSpace: "normal" }}
            >
              <div className="text-[8px] uppercase tracking-wide text-red-400 font-bold">
                {lang === "hi" ? "असंगति #" : 
                 lang === "es" ? "Anomalía #" :
                 lang === "pa" ? "ਖ਼ਰਾਬੀ #" :
                 lang === "te" ? "మచ్చ #" : "Anomaly #"}{pos.id}
              </div>
              <div className="font-bold">
                {lang === "hi" ? "विश्वास: " :
                 lang === "es" ? "Conf.: " :
                 lang === "pa" ? "ਭਰੋਸਾ: " :
                 lang === "te" ? "నమ్మకం: " : "Confidence: "}{pos.conf}%
              </div>
            </div>
          </div>
        );
      })}

      {/* Mouse Rotate instructions indicator */}
      <div className="absolute bottom-5 right-5 pointer-events-none select-none text-[10px] text-emerald-500/70 font-mono uppercase bg-emerald-950/20 px-2.5 py-1.5 rounded-md border border-emerald-500/10">
        🖱️ {lang === "hi" ? "घुमाने के लिए खींचें" : 
            lang === "es" ? "Arrastrar para rotar" :
            lang === "pa" ? "ਘੁਮਾਉਣ ਲਈ ਖਿੱਚੋ" :
            lang === "te" ? "తిప్పడానికి లాగండి" : "Drag to rotate"} | 🔍 Scroll to Zoom
      </div>
    </div>
  );
}
