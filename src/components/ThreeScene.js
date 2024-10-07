import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { ExtrudeGeometry } from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import 'bulma/css/bulma.min.css';
import './ThreeScene.css';
import { FaHome, FaUndo, FaRedo, FaPlus, FaMinus } from 'react-icons/fa';
import { TextureLoader } from 'three';

// Constants
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
  const [buildingHeight, setBuildingHeight] = useState(.5);
  const [buildingPitch, setBuildingPitch] = useState(90);
  const startPointRef = useRef(null);
  const controls = useRef(null);
  const [selectedObject, setSelectedObject] = useState(null);
  const [polygons, setPolygons] = useState([]);
  const [debugMessage, setDebugMessage] = useState('');
  const [windowTexture, setWindowTexture] = useState(null);

  useEffect(() => {
    const init = async () => {
      // Initialize Three.js scene, camera, and renderer
      sceneRef.current = new THREE.Scene();
      cameraRef.current = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
      
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

      // Load window texture
      const loader = new TextureLoader();
      const texture = await loader.loadAsync('/window_texture.jpg');
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;
      texture.repeat.set(5, 5); // Adjust values to control the texture scaling
      setWindowTexture(texture);

      // Start animation loop
      animate();
    };

    init();

    // Handle window resizing
    const handleResize = () => {
      const container = mountRef.current;
      const width = container.clientWidth;
      const height = container.clientHeight;

      cameraRef.current.aspect = width / height;
      cameraRef.current.updateProjectionMatrix();

      rendererRef.current.setSize(width, height);
    };

    window.addEventListener('resize', handleResize);

    // Clean up
    return () => {
      if (mountRef.current && rendererRef.current) {
        mountRef.current.removeChild(rendererRef.current.domElement);
      }
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Animation loop
  const animate = () => {
    requestAnimationFrame(animate);
    rendererRef.current.render(sceneRef.current, cameraRef.current);
    controls.current.update();
  };

  // Helper function to get intersection point
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

  // Get random location from predefined list
  const getRandomLocation = () => {
    return LOCATIONS[Math.floor(Math.random() * LOCATIONS.length)].coords;
  };

  // Load new background image
  const loadNewBackgroundImage = async () => {
    // Fetch and load background image
    const imageUrl = await fetchBackgroundImage();
    await loadBackgroundImage(imageUrl);
  }; 
  
  // Fetch background image URL
  const fetchBackgroundImage = async () => {
    const center = getRandomLocation();
    const zoom = 19;
    const size = '640x640';
    const mapType = 'satellite';
    
    const url = `https://maps.googleapis.com/maps/api/staticmap?center=${center}&zoom=${zoom}&size=${size}&maptype=${mapType}&key=${GOOGLE_MAPS_API_KEY}`;
    
    return url;
  };

  // Load background image into scene
  const loadBackgroundImage = (imageUrl) => {
    return new Promise((resolve) => {
      new THREE.TextureLoader().load(imageUrl, (texture) => {
        const aspect = 1; // Since we're using a square image
        const imageGeometry = new THREE.PlaneGeometry(20 * aspect, 20);
        const imageMaterial = new THREE.MeshBasicMaterial({ map: texture });
        const imageMesh = new THREE.Mesh(imageGeometry, imageMaterial);
        sceneRef.current.add(imageMesh);

        // Adjust camera to fit the scene
        const newHeight = 7;
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

  // Handle mouse click events
  const onMouseClick = (event) => {
    if (event.target === rendererRef.current.domElement && selectedObject === 'polygon') {
      const intersectionPoint = getIntersectionPoint(event);
      setDebugMessage(`Click detected at: ${intersectionPoint.x.toFixed(2)}, ${intersectionPoint.y.toFixed(2)}, ${intersectionPoint.z.toFixed(2)}`);

      if (!isDrawing) {
        // Start drawing
        startPointRef.current = intersectionPoint;
        pointsRef.current = [intersectionPoint];
        setIsDrawing(true);
        setDebugMessage(prevMessage => prevMessage + '\nStarted drawing');
      } else {
        // Continue drawing
        const distanceToStart = intersectionPoint.distanceTo(startPointRef.current);
        const closeThreshold = 0.5; // Adjust this value to change the "close" threshold

        if (distanceToStart < closeThreshold && pointsRef.current.length > 2) {
          // Close to starting point, complete the polygon
          completeDrawing();
          rendererRef.current.domElement.style.cursor = 'default'; // Reset cursor
        } else {
          // Add new point
          pointsRef.current.push(intersectionPoint);
          updateLine();
          setDebugMessage(prevMessage => prevMessage + `\nAdded point: ${pointsRef.current.length}`);
        }
      }
    }
  };

  // Handle mouse move events
  const onMouseMove = (event) => {
    if (isDrawing && !isDrawingComplete && event.target === rendererRef.current.domElement) {
      const intersectionPoint = getIntersectionPoint(event);
      updatePreviewLine(intersectionPoint);

      // Check if close to starting point
      if (startPointRef.current) {
        const distanceToStart = intersectionPoint.distanceTo(startPointRef.current);
        const closeThreshold = 0.5; // Should match the threshold in onMouseClick

        // Change to mouse pointer hand when close to starting point
        if (distanceToStart < closeThreshold && pointsRef.current.length > 2) {
          rendererRef.current.domElement.style.cursor = 'pointer';
        } else {
          rendererRef.current.domElement.style.cursor = 'default';
        }
      }
    }
  };

  // Update the line being drawn
  const updateLine = () => {
    if (lineRef.current) sceneRef.current.remove(lineRef.current);

    const geometry = new THREE.BufferGeometry().setFromPoints(pointsRef.current);
    const material = new THREE.LineBasicMaterial({ color: 0x0000ff, linewidth: 2 });
    lineRef.current = new THREE.Line(geometry, material);

    sceneRef.current.add(lineRef.current);
    setDebugMessage(prevMessage => prevMessage + '\nUpdated line');
  };

  // Update preview line while drawing
  const updatePreviewLine = (endPoint) => {
    if (previewLineRef.current) sceneRef.current.remove(previewLineRef.current);

    if (pointsRef.current.length > 0) {
      const startPoint = pointsRef.current[pointsRef.current.length - 1];
      const geometry = new THREE.BufferGeometry().setFromPoints([startPoint, endPoint]);
      const material = new THREE.LineBasicMaterial({ 
        color: 0x00ff00,  // Preview line color:  green
        opacity: 1,       // Preview line opacity
        transparent: false,
        linewidth: 100
      });
      previewLineRef.current = new THREE.Line(geometry, material);

      sceneRef.current.add(previewLineRef.current);
    }
  };

  // Complete the drawing process
  const completeDrawing = () => {
    setIsDrawingComplete(true);
    setIsDrawing(false);
    if (previewLineRef.current) {
      sceneRef.current.remove(previewLineRef.current);
    }
    pointsRef.current.push(pointsRef.current[0]);
    updateLine();
    createBuilding();
    setPolygons([...polygons, { points: [...pointsRef.current], height: buildingHeight, pitch: buildingPitch }]);
    setSelectedObject(null);
    setDebugMessage(prevMessage => prevMessage + '\nCompleted drawing');
    rendererRef.current.domElement.style.cursor = 'default'; // Reset cursor
  };

  // Create 3D building from drawn polygon
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

    const wallGeometry = new ExtrudeGeometry(shape, extrudeSettings);
    wallGeometry.translate(0, 0, -buildingHeight / 2);  // Center the geometry vertically

    // Create roof geometry
    const roofGeometry = new THREE.BufferGeometry().setFromPoints(pointsRef.current);
    roofGeometry.translate(0, 0, buildingHeight / 2);  // Move roof to top of building

    // Create materials
    const wallMaterial = new THREE.MeshPhongMaterial({
      color: 0xcccccc,
      map: windowTexture,
      side: THREE.DoubleSide,
    });
    const roofMaterial = new THREE.MeshPhongMaterial({ color: 0x8b4513, side: THREE.DoubleSide });

    const wallMesh = new THREE.Mesh(wallGeometry, wallMaterial);
    const roofMesh = new THREE.Mesh(roofGeometry, roofMaterial);

    // Group wall and roof
    buildingRef.current = new THREE.Group();
    buildingRef.current.add(wallMesh);
    buildingRef.current.add(roofMesh);

    // Apply pitch rotation
    const pitchRadians = (buildingPitch * Math.PI) / 180;
    buildingRef.current.rotation.x = -pitchRadians;  // Negative to tilt forward

    // Calculate the offset to keep the base at ground level
    const offset = (buildingHeight / 2) * Math.sin(pitchRadians);
    buildingRef.current.position.set(0, 0, offset);

    sceneRef.current.add(buildingRef.current);

    if (windowTexture) {
      // Calculate and set the repeat based on building dimensions
      const width = Math.max(...pointsRef.current.map(p => p.x)) - Math.min(...pointsRef.current.map(p => p.x));
      const height = buildingHeight;
      windowTexture.repeat.set(width / 10, height / 10); // Adjust the divisor to control scaling
      windowTexture.needsUpdate = true;
    }
  };

  // Reset the entire scene
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
    setPolygons([]);
    setSelectedObject(null);
  };

  // Reset camera to initial position
  const resetCamera = () => {
    cameraRef.current.position.set(0, -5, 5);
    cameraRef.current.lookAt(0, 0, 0);
    controls.current.reset();
  };

  // Undo last point in polygon drawing
  const undoLastPoint = () => {
    if (pointsRef.current.length > 0) {
      pointsRef.current.pop();
      updateLine();
    }
  };

  // Zoom in camera
  const zoomIn = () => {
    cameraRef.current.position.z -= 0.5;
  };

  // Zoom out camera
  const zoomOut = () => {
    cameraRef.current.position.z += 0.5;
  };

  // Effect for handling click and mouse move events
  useEffect(() => {
    const handleClick = (event) => onMouseClick(event);
    const handleMouseMove = (event) => onMouseMove(event);

    window.addEventListener('click', handleClick);
    window.addEventListener('mousemove', handleMouseMove);

    return () => {
      window.removeEventListener('click', handleClick);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [isDrawing, isDrawingComplete, selectedObject]);

  // Effect for updating building when height or pitch changes
  useEffect(() => {
    if (isDrawingComplete) {
      createBuilding();
    }
  }, [buildingHeight, buildingPitch, isDrawingComplete]);

  // Render component
  return (
    <div className="columns is-gapless" style={{ height: '100vh' }}>
      <div className="column is-9 position-relative">
        <div ref={mountRef} style={{ width: '100%', height: '100%' }} />
        <div className="floating-controls">
          <button onClick={resetCamera} className="button is-small">
            <span className="icon">
              <FaHome />
            </span>
          </button>
          <button onClick={undoLastPoint} className="button is-small">
            <span className="icon">
              <FaUndo />
            </span>
          </button>
          {/* Redo button removed */}
          <button onClick={zoomIn} className="button is-small">
            <span className="icon">
              <FaPlus />
            </span>
          </button>
          <button onClick={zoomOut} className="button is-small">
            <span className="icon">
              <FaMinus />
            </span>
          </button>
        </div>
      </div>
      <div className="column is-3">
        <div className="box" style={{ height: '100%', overflowY: 'auto' }}>
          <h3 className="title is-4">Controls</h3>
          <div className="buttons">
            <button onClick={resetScene} className="button is-primary is-fullwidth">
              Reset Scene
            </button>
            <button 
              onClick={() => {
                setSelectedObject('polygon');
                setIsDrawing(false);
                setIsDrawingComplete(false);
                pointsRef.current = [];
                if (lineRef.current) sceneRef.current.remove(lineRef.current);
                if (previewLineRef.current) sceneRef.current.remove(previewLineRef.current);
                setDebugMessage('Polygon tool selected');
              }} 
              className={`button is-info is-fullwidth ${selectedObject === 'polygon' ? 'is-active' : ''}`}
            >
              Draw Polygon
            </button>
            {isDrawing && !isDrawingComplete && (
              <button 
                onClick={completeDrawing} 
                className="button is-success is-fullwidth"
              >
                Complete Drawing
              </button>
            )}
          </div>
          <div className={isDrawingComplete ? '' : 'is-hidden'}>
            <div className="field">
              <label className="label">Building Height</label>
              <div className="control">
                <input
                  className="slider is-fullwidth"
                  step="0.1"
                  min="0"
                  max="5"
                  value={buildingHeight}
                  type="range"
                  onChange={(e) => setBuildingHeight(Number(e.target.value))}
                />
              </div>
              <p className="help">{buildingHeight.toFixed(1)}</p>
            </div>
            <div className="field">
              <label className="label">Building Pitch (degrees)</label>
              <div className="control">
                <input
                  className="slider is-fullwidth"
                  step="1"
                  min="0"
                  max="90"
                  value={buildingPitch}
                  type="range"
                  onChange={(e) => setBuildingPitch(Number(e.target.value))}
                />
              </div>
              <p className="help">{buildingPitch}°</p>
            </div>
          </div>
          <div className="content">
            <h4 className="title is-5">Instructions</h4>
            <ol>
              <li>Click on the map to start drawing your building outline.</li>
              <li>Continue clicking to add more points to the outline.</li>
              <li>To complete the outline, click near the starting point or use the "Complete Drawing" button.</li>
              <li>Adjust the building height and pitch using the sliders.</li>
              <li>Use the "Reset Scene" button to start over with a new location.</li>
              <li>To zoom in and out:
                <ul>
                  <li>Use the "+" and "-" buttons in the floating controls</li>
                  <li>Or scroll your mouse wheel up and down</li>
                </ul>
              </li>
              <li>To rotate the scene:
                <ul>
                  <li>Click and drag with the left mouse button</li>
                </ul>
              </li>
              <li>To pan the scene:
                <ul>
                  <li>Click and drag with the right mouse button</li>
                  <li>Or hold Shift and click and drag with the left mouse button</li>
                </ul>
              </li>
              <li>Use the "Home" button in the floating controls to reset the camera view.</li>
            </ol>
          </div>
          <div className="content">
            <h4 className="title is-5">Debug Info</h4>
            <pre style={{ whiteSpace: 'pre-wrap', wordWrap: 'break-word' }}>
              {debugMessage}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ThreeScene;