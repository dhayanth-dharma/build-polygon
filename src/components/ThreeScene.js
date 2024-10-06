import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { ExtrudeGeometry } from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
const GOOGLE_MAPS_API_KEY = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;

const LOCATIONS = [
  { coords: "48.78479793799535, 2.6247703730708505", name: "Paris 1" },
  { coords: "48.78045504062628, 2.6038215883993496", name: "Paris 2" },
  { coords: "48.54829946535937, 3.3023097436630633", name: "Poivron 1" },
  { coords: "51.507314476482705, 0.2120248015104845", name: "London 1" },
  { coords: "51.50987041997743, 0.2116197898643152", name: "London 2" },
  { coords: "43.09834798688306, -71.45641583918686", name: "US 1" },
  { coords: "42.98974503169808, -71.46006243164102", name: "US 2" },
  { coords: "42.367634132148, -71.02288017747071", name: "US 3" },
  { coords: "42.28570182984335, -71.13689187266701", name: "US 4" },
  { coords: "56.20208874967972, -117.31777994139695", name: "US 5" },
  { coords: "45.45048, 4.38733", name: "Saint Etienne" },
];

const ThreeScene = () => {
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
  const [buildingHeight, setBuildingHeight] = useState(0);
  const [buildingPitch, setBuildingPitch] = useState(90);
  const startPointRef = useRef(null);
  const controls = useRef(null);

  useEffect(() => {
    const init = async () => {
      // Set up scene, camera, and renderer
      sceneRef.current = new THREE.Scene();
      cameraRef.current = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
      
      // Use container size instead of window size
      const container = mountRef.current;
      const width = container.clientWidth;
      const height = container.clientHeight;

      
      rendererRef.current = new THREE.WebGLRenderer();

      rendererRef.current.setSize(width, height);
      mountRef.current.appendChild(rendererRef.current.domElement);

      // Update camera aspect ratio
      cameraRef.current.aspect = width / height;
      cameraRef.current.updateProjectionMatrix();


      // Set up raycaster and plane for mouse interaction
      raycasterRef.current = new THREE.Raycaster();
      
      planeRef.current = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);

      // Set up camera position
      cameraRef.current.position.set(0, -5, 5);
      cameraRef.current.lookAt(0, 0, 0);

      // Fetch and load background image
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


  const animate = () => {
    requestAnimationFrame(animate);
    rendererRef.current.render(sceneRef.current, cameraRef.current);
    controls.current.update();
  };


  // Update getIntersectionPoint function
  const getIntersectionPoint = (event) => {
    const container = mountRef.current;
    const rect = container.getBoundingClientRect();
    const mouse = new THREE.Vector2(
      ((event.clientX - rect.left) / container.clientWidth) * 2 - 1,
      -((event.clientY - rect.top) / container.clientHeight) * 2 + 1
    );

    raycasterRef.current.setFromCamera(mouse, cameraRef.current);
    const intersects = new THREE.Vector3();
    raycasterRef.current.ray.intersectPlane(planeRef.current, intersects);
    return intersects;
  };

  const getRandomLocation = () => {
    return LOCATIONS[Math.floor(Math.random() * LOCATIONS.length)].coords;
  };

  const loadNewBackgroundImage = async () => {
    // Fetch and load background image
    const imageUrl = await fetchBackgroundImage();
    await loadBackgroundImage(imageUrl);
  }; 
  
  const fetchBackgroundImage = async () => {
    // const center = '45.45048, 4.38733'; // Example coordinates for New York City
    const center = getRandomLocation(); // Example coordinates for New York City
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


  const onMouseClick = (event) => {
    if (event.target === rendererRef.current.domElement) { 
      if (!isDrawingComplete) {
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
  
        setIsDrawing(true);
      }
    }
  };

  const onMouseMove = (event) => {
    if (event.target === rendererRef.current.domElement) {
      if (isDrawing && !isDrawingComplete) {
        const intersectionPoint = getIntersectionPoint(event);
        updatePreviewLine(intersectionPoint);
      }
    }
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

  useEffect(() => {
    window.addEventListener('click', onMouseClick);
    window.addEventListener('mousemove', onMouseMove);
    return () => {
      window.removeEventListener('click', onMouseClick);
      window.removeEventListener('mousemove', onMouseMove);
    };
  }, [isDrawing, isDrawingComplete]);

  useEffect(() => {
    if (isDrawingComplete) {
      createBuilding();
    }
  }, [buildingHeight, buildingPitch, isDrawingComplete]);

  return (
    <div>
      
      <div ref={mountRef} style={{ width: '100%', height: '80vh' }} />
      <div style={{ textAlign: 'center'}}>
        <button onClick={resetScene} style={buttonStyle}>Reset Scene</button>
        <button onClick={completeDrawing} style={buttonStyle}>Complete</button>
        {(
          <>
            <label style={labelStyle}>
              Building Height:
              <input
                type="range"
                value={buildingHeight}
                onChange={(e) => setBuildingHeight(Number(e.target.value))}
                min="0"
                step="0.1"
                style={inputStyle}
              />
            </label>
            <label style={labelStyle}>
              Building Pitch (degrees):
              <input
                type="range"
                value={buildingPitch}
                onChange={(e) => setBuildingPitch(Number(e.target.value))}
                min="0"
                max="90"
                step="1"
                style={inputStyle}
              />
            </label>
          </>
        )}
      </div>
    </div>
  );
};


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
export default ThreeScene;