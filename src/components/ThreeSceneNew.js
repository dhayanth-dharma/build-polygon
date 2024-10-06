import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { ExtrudeGeometry } from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
const UNSPLASH_ACCESS_KEY = 'kSDe8fmfl_pQVd8sytHS0UNqAEY6MzuesAm7mTbJUIk';
const GOOGLE_MAPS_API_KEY = 'AIzaSyAhSx2AJmZ_jbknqaKa-fOYSvv1cL7xTQ0';
const LOCATIONS = [
  { coords: "40.7128,-74.0060", name: "New York City" },
  { coords: "51.5074,-0.1278", name: "London" },
  { coords: "48.8566,2.3522", name: "Paris" },
  { coords: "35.6762,139.6503", name: "Tokyo" },
  { coords: "22.3193,114.1694", name: "Hong Kong" },
  { coords: "-33.8688,151.2093", name: "Sydney" },
  { coords: "37.7749,-122.4194", name: "San Francisco" },
  { coords: "55.7558,37.6173", name: "Moscow" },
  { coords: "-22.9068,-43.1729", name: "Rio de Janeiro" },
  { coords: "1.3521,103.8198", name: "Singapore" },
];

const ThreeSceneNew = () => {
  const mountRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const rendererRef = useRef(null);
  const raycasterRef = useRef(null);
  const planeRef = useRef(null);
  const pointsRef = useRef([]);
  const lineRef = useRef(null);
  const previewLineRef = useRef(null);
  const buildingRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isDrawingComplete, setIsDrawingComplete] = useState(false);
  const [buildingHeight, setBuildingHeight] = useState(1);
  const [buildingPitch, setBuildingPitch] = useState(0);
  const startPointRef = useRef(null);
  const controls = useRef(null);

  const [isDrawingActive, setIsDrawingActive] = useState(false);

  useEffect(() => {
    const init = async () => {
      // Set up scene, camera, and renderer
      sceneRef.current = new THREE.Scene();
      cameraRef.current = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
      rendererRef.current = new THREE.WebGLRenderer();

      const width = mountRef.current.clientWidth;
      const height = mountRef.current.clientHeight;
      rendererRef.current.setSize(width, height);
      mountRef.current.appendChild(rendererRef.current.domElement);

      // Set up raycaster and plane for mouse interaction
      raycasterRef.current = new THREE.Raycaster();
      planeRef.current = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);

      // Set up camera position
      cameraRef.current.position.set(0, -5, 5);
      cameraRef.current.lookAt(0, 0, 0);


      // Load initial background image
      await loadNewBackgroundImage();

      // Add ambient light
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
      sceneRef.current.add(ambientLight);

      // Add directional light
      const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
      
      directionalLight.position.set(5, 5, 5);
      sceneRef.current.add(directionalLight);
      sceneRef.current.background = new THREE.Color(0xffffff);

      controls.current = new OrbitControls(cameraRef.current, rendererRef.current.domElement);

      // Start animation loop
      animate();
    };

    init();

    // Clean up
    return () => {
      if (mountRef.current && rendererRef.current) {
        mountRef.current.removeChild(rendererRef.current.domElement);
      }
    };
  }, []);

  const loadNewBackgroundImage = async () => {
    // Fetch and load background image
    const imageUrl = await fetchBackgroundImage();
    await loadBackgroundImage(imageUrl);
  }; 


  const animate = () => {
    requestAnimationFrame(animate);
    rendererRef.current.render(sceneRef.current, cameraRef.current);
    controls.current.update();
  };


  const getIntersectionPoint = (event) => {
    const mouse = new THREE.Vector2(
      (event.clientX / window.innerWidth) * 2 - 1,
      -(event.clientY / window.innerHeight) * 2 + 1
    );

    raycasterRef.current.setFromCamera(mouse, cameraRef.current);
    const intersects = new THREE.Vector3();
    raycasterRef.current.ray.intersectPlane(planeRef.current, intersects);
    return intersects;
  };

 
  
  const getRandomLocation = () => {
    return LOCATIONS[Math.floor(Math.random() * LOCATIONS.length)];
  };

  const fetchBackgroundImage = async () => {
    const center = '45.45048, 4.38733'; // Example coordinates for New York City
    const zoom = 19;
    const size = '640x640';
    const mapType = 'satellite';
    
    const url = `https://maps.googleapis.com/maps/api/staticmap?center=${center}&zoom=${zoom}&size=${size}&maptype=${mapType}&key=${GOOGLE_MAPS_API_KEY}`;
    
    return url;
  };

  const loadBackgroundImage = (imageUrl) => {
    return new Promise((resolve) => {
      new THREE.TextureLoader().load(imageUrl, (texture) => {
        const aspect = 1; // Since we're using a square image
        const imageGeometry = new THREE.PlaneGeometry(6 * aspect, 6);
        const imageMaterial = new THREE.MeshBasicMaterial({ map: texture });
        const imageMesh = new THREE.Mesh(imageGeometry, imageMaterial);
        sceneRef.current.add(imageMesh);

        // Adjust camera to fit the image
        const newHeight = 2;
        const newWidth = newHeight * aspect;
        cameraRef.current.left = -newWidth / 2;
        cameraRef.current.right = newWidth / 2;
        cameraRef.current.top = newHeight / 2;
        cameraRef.current.bottom = -newHeight / 2;
        cameraRef.current.updateProjectionMatrix();

        resolve();
      });
    });
  };


  const resetScene = () => {
    // Remove existing building and lines
    if (buildingRef.current) sceneRef.current.remove(buildingRef.current);
    if (lineRef.current) sceneRef.current.remove(lineRef.current);
    if (previewLineRef.current) sceneRef.current.remove(previewLineRef.current);

    // Reset points and state
    pointsRef.current = [];
    startPointRef.current = null;
    setIsDrawingComplete(false);
    setBuildingHeight(1);
    setBuildingPitch(0);

    // Load new background image
    loadNewBackgroundImage();
  };


  const onMouseClick = (event) => {
    if (!isDrawingActive || isDrawingComplete) return;

    const intersectionPoint = getIntersectionPoint(event);

    if (!startPointRef.current) {
      startPointRef.current = intersectionPoint;
    } else {
      // Check if the new point is close to the start point
      const distance = intersectionPoint.distanceTo(startPointRef.current);
      if (distance < 0.1 && pointsRef.current.length > 2) {
        completeDrawing();
        return;
      }
    }

    // Add the clicked point
    pointsRef.current.push(intersectionPoint);

    // Update or create the line
    updateLine();
  };

  const onMouseMove = (event) => {
    if (!isDrawingActive || isDrawingComplete) return;

    const intersectionPoint = getIntersectionPoint(event);
    updatePreviewLine(intersectionPoint);
  };



  const updateLine = () => {
    // Remove existing line if it exists
    if (lineRef.current) sceneRef.current.remove(lineRef.current);

    // Create a new line geometry
    const geometry = new THREE.BufferGeometry().setFromPoints(pointsRef.current);
    const material = new THREE.LineBasicMaterial({ color: 0x0000ff, linewidth: 2 });
    lineRef.current = new THREE.Line(geometry, material);

    // Add the line to the scene
    sceneRef.current.add(lineRef.current);
  };


  const updatePreviewLine = (endPoint) => {
    // Remove existing preview line if it exists
    if (previewLineRef.current) sceneRef.current.remove(previewLineRef.current);

    if (pointsRef.current.length > 0) {
      const startPoint = pointsRef.current[pointsRef.current.length - 1];
      const geometry = new THREE.BufferGeometry().setFromPoints([startPoint, endPoint]);
      const material = new THREE.LineBasicMaterial({ color: 0xff0000, opacity: 0.5, transparent: true, linewidth: 2 });
      previewLineRef.current = new THREE.Line(geometry, material);

      // Add the preview line to the scene
      sceneRef.current.add(previewLineRef.current);
    }
  };

  const completeDrawing = () => {
    setIsDrawingComplete(true);
    setIsDrawing(false);
    if (previewLineRef.current) {
      sceneRef.current.remove(previewLineRef.current);
    }
    // Close the polygon by adding the first point to the end
    pointsRef.current.push(pointsRef.current[0]);
    updateLine();
    createBuilding();
  };


  const createBuilding = () => {
    if (buildingRef.current) {
      sceneRef.current.remove(buildingRef.current);
    }

    const shape = new THREE.Shape(pointsRef.current.map(p => new THREE.Vector2(p.x, p.y)));
    const extrudeSettings = {
      steps: 1,
      depth: buildingHeight,
      bevelEnabled: false,
    };

    const geometry = new ExtrudeGeometry(shape, extrudeSettings);
    geometry.rotateX(-Math.PI / 2);
    geometry.translate(0, buildingHeight / 2, 0);

    const material = new THREE.MeshPhongMaterial({ color: 0x00ff00, side: THREE.DoubleSide });
    buildingRef.current = new THREE.Mesh(geometry, material);

    // Apply pitch rotation
    buildingRef.current.rotation.x = (buildingPitch * Math.PI) / 180;

    sceneRef.current.add(buildingRef.current);
  };


  useEffect(() => {
    const canvas = rendererRef.current.domElement;
    canvas.addEventListener('click', onMouseClick);
    canvas.addEventListener('mousemove', onMouseMove);

    return () => {
      canvas.removeEventListener('click', onMouseClick);
      canvas.removeEventListener('mousemove', onMouseMove);
    };
  }, [isDrawingActive, isDrawingComplete]);

  useEffect(() => {
    if (isDrawingComplete) {
      createBuilding();
    }
  }, [buildingHeight, buildingPitch, isDrawingComplete]);

  return (
    // <div>
    //   <div ref={mountRef} style={{ width: '100%', height: '80vh' }} />
    //   <div style={{ padding: '20px', backgroundColor: '#f0f0f0', borderTop: '1px solid #ccc' }}>
    //     <button onClick={() => setIsDrawingActive(!isDrawingActive)} style={buttonStyle}>
    //       {isDrawingActive ? 'Deactivate Drawing' : 'Activate Drawing'}
    //     </button>
    //     <button onClick={resetScene} style={buttonStyle}>Reset Scene</button>
    //     {isDrawingComplete && (
    //       <>
    //         <label style={labelStyle}>
    //           Building Height:
    //           <input
    //             type="number"
    //             value={buildingHeight}
    //             onChange={(e) => setBuildingHeight(Number(e.target.value))}
    //             min="0"
    //             step="0.1"
    //             style={inputStyle}
    //           />
    //         </label>
    //         <label style={labelStyle}>
    //           Building Pitch (degrees):
    //           <input
    //             type="number"
    //             value={buildingPitch}
    //             onChange={(e) => setBuildingPitch(Number(e.target.value))}
    //             min="0"
    //             max="90"
    //             step="1"
    //             style={inputStyle}
    //           />
    //         </label>
    //       </>
    //     )}
    //   </div>
    // </div>
    <div ref={mountRef} style={{ width: '100%', height: '400px' }} />
  );
};


// Add these style objects at the end of the file, before the export statement
const buttonStyle = {
  backgroundColor: '#4CAF50',
  border: 'none',
  color: 'white',
  padding: '10px 20px',
  textAlign: 'center',
  textDecoration: 'none',
  display: 'inline-block',
  fontSize: '16px',
  margin: '4px 2px',
  cursor: 'pointer',
  borderRadius: '4px',
};

const labelStyle = {
  display: 'block',
  margin: '10px 0',
  fontSize: '16px',
};

const inputStyle = {
  width: '100px',
  padding: '5px',
  fontSize: '16px',
  marginLeft: '10px',
  border: '1px solid #ccc',
  borderRadius: '4px',
};



export default ThreeSceneNew;