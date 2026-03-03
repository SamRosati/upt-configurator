// Import the THREE.js library
import * as THREE from "https://cdn.skypack.dev/three@0.129.0/build/three.module.js";
// To allow for the camera to move around the scene
import { OrbitControls } from "https://cdn.skypack.dev/three@0.129.0/examples/jsm/controls/OrbitControls.js";
// To allow for importing the .gltf file
import { GLTFLoader } from "https://cdn.skypack.dev/three@0.129.0/examples/jsm/loaders/GLTFLoader.js";

// Create a Three.JS Scene
const scene = new THREE.Scene();
// Create a new camera with positions and angles
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

// Keep the 3D object on a global variable so we can access it later
let object;

// OrbitControls allow the camera to move around the scene
let controls;

// Set which object to render - Matches your exact filename
let objToRender = 'UPT_Configurator_Master_20260118';

// Instantiate a loader for the .gltf/.glb file
const loader = new GLTFLoader();

// Load the file 
// FIX: Ensure path starts with 'models/' to match your folder structure
loader.load(
  `models/${objToRender}.glb`, 
  function (gltf) {
    // If the file is loaded, add it to the scene
    object = gltf.scene;
    scene.add(object);
    console.log("Model loaded successfully");
  },
  function (xhr) {
    // While it is loading, log the progress
    if (xhr.lengthComputable) {
        console.log((xhr.loaded / xhr.total * 100) + '% loaded');
    }
  },
  function (error) {
    // If there is an error, log it
    console.error("An error happened while loading the model:", error);
  }
);

// Instantiate a new renderer and set its size
const renderer = new THREE.WebGLRenderer({ alpha: true }); // Alpha: true allows for the transparent background
renderer.setSize(window.innerWidth, window.innerHeight);

// Add the renderer to the DOM
const container = document.getElementById("container3D");
if (container) {
    container.appendChild(renderer.domElement);
}

// Set how far the camera will be from the 3D model
// FIX: Lowered default distance to 10 for better initial visibility
camera.position.z = objToRender === "dino" ? 25 : 10;

// Add lights to the scene, so we can actually see the 3D model
const topLight = new THREE.DirectionalLight(0xffffff, 1); // (color, intensity)
topLight.position.set(500, 500, 500); 
topLight.castShadow = true;
scene.add(topLight);

const ambientLight = new THREE.AmbientLight(0x333333, 2);
scene.add(ambientLight);

// Initialize OrbitControls so you can move the camera with your mouse
controls = new OrbitControls(camera, renderer.domElement);

// Render the scene
function animate() {
  requestAnimationFrame(animate);
  
  // Update controls for smooth movement
  if (controls) controls.update();
  
  // Draw the scene
  renderer.render(scene, camera);
}

// Add a listener to the window, so we can resize the window and the camera
window.addEventListener("resize", function () {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Start the 3D rendering loop
animate();