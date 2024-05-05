import * as THREE from "three";

let scene, camera, renderer;
let originalBoxSize = 3;
let boxHeight = 1;
let stack = [];
let overhangs = [];
let gameSatred = false;

const scoreElement = document.getElementById("score");
const instructionsElement = document.getElementById("instructions");
const resultsElement = document.getElementById("results");

// cannon JS code
let world; //like scene in threeJs

function init() {
  // initialize cannon.Js
  world = new CANNON.World();
  world.gravity.set(0, -10, 0);
  world.broadphase = new CANNON.NaiveBroadphase(); //handling collsion
  world.solver.iterations = 40;

  scene = new THREE.Scene();

  // foundation
  addLayer(0, 0, originalBoxSize, originalBoxSize)
  
  // first layer
  addLayer(-10, 0, originalBoxSize, originalBoxSize, "x")

  // light
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
  directionalLight.position.set(10, 20, 0);
  scene.add(directionalLight);

  // camera
  const width = 15;
  const height = width * (window.innerHeight / window.innerWidth);

  camera = new THREE.OrthographicCamera(
    width / -2, // left
    width / 2, // right
    height / 2, // top
    height / -2, // bottom
    1, //near
    1000 //far
  );
  camera.position.set(4, 4, 4);
  camera.lookAt(0, 0, 0);

  // renderer
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);
  renderer.render(scene, camera);
}

function addLayer(x, z, width, depth, direction){
  const y = boxHeight * stack.length; // add new box higher
  const layer = generateBox(x, y, z, width, depth, false);
  layer.direction = direction;
  stack.push(layer)
}

function addOverhang(x, z, width, depth){
  const y = boxHeight * (stack.length - 1);
  const overhang = generateBox(x, y, z, width, depth, true)
  overhangs.push(overhang)
}

function generateBox(x, y, z, width, depth, falling){
  const geometry = new THREE.BoxGeometry(width, boxHeight, depth);
  const color = new THREE.Color(`hsl(${240 + stack.length * 5}, 100%, 50%)`);
  const material = new THREE.MeshLambertMaterial({color});
  const mesh = new THREE.Mesh(geometry,material);
  mesh.position.set(x, y, z);
  scene.add(mesh);

  // create box in cannonjs
  const shape = new CANNON.Box(
    new CANNON.Vec3(width / 2, boxHeight / 2, depth / 2)
  )
  let mass = falling ? 5 : 0;
  const body = new CANNON.Body({ mass, shape });
  body.position.set(x, y, z);
  world.addBody(body);

  return{
    threejs : mesh,
    cannonjs : body,
    width,
    depth,
  }
}

window.addEventListener("click", () => {
  if(!gameSatred){
    renderer.setAnimationLoop(animation);
    gameSatred = true;
  }
  else{
    const topLayer = stack[stack.length - 1];
    const prevLayer = stack[stack.length - 2];

    const direction = topLayer.direction;

    const delta = topLayer.threejs.position[direction] - prevLayer.threejs.position[direction];

    const overhangSize = Math.abs(delta);

    // Size or width of the topLayer box
    const size = direction === "x" ? topLayer.width : topLayer.depth;

    const overLap = size - overhangSize;

    if(overLap > 0){
      // continue game
      const newWidth = direction === "x" ? overLap : topLayer.width;
      const newDepth = direction === "z" ? overLap : topLayer.depth;

      //updating the mainData
      topLayer.width = newWidth;
      topLayer.depth = newDepth;

      // scaling
      topLayer.threejs.scale[direction] = overLap / size;
      topLayer.threejs.position[direction] -= delta / 2;

      // update cannonJs
      const shape = new CANNON.Box(
        new CANNON.Vec3(newWidth / 2, boxHeight /2, newDepth / 2)
      )
      topLayer.cannonjs.shape = []
      topLayer.cannonjs.addShape(shape)
      topLayer.cannonjs.position[direction] -= delta / 2;

      // overHanging part cal
      const overhangShift = (overLap / 2 + overhangSize / 2) * Math.sign(delta);
      const overhangX = direction === "x" ? topLayer.threejs.position.x + overhangShift : topLayer.threejs.position.x;
      const overhangZ = direction === "z" ? topLayer.threejs.position.z + overhangShift : topLayer.threejs.position.z;
      const overhangWidth = direction === "x" ? overhangSize : topLayer.width;
      const overhangDepth = direction === "z" ? overhangSize : topLayer.depth;

      addOverhang(overhangX, overhangZ, overhangWidth, overhangDepth)
      

      const nextX = direction === "x" ? topLayer.threejs.position.x : -10;
      const nextZ = direction === "z" ? topLayer.threejs.position.z : -10;
      const nextDirection = direction === "x" ? "z" : "x";

      // paste a new block
      addLayer(nextX, nextZ, newWidth, newDepth, nextDirection);
    }
  }
})

function updatePhysics(){
  world.step(1 / 60); //render 60 fps

  overhangs.forEach((el) => {
    el.threejs.position.copy(el.cannonjs.position); //copy cannonJs value to threeJs (y coordinate)
    el.threejs.quaternion.copy(el.cannonjs.quaternion); //copy cannonjs 3D coordinates
  })
}

function animation(){
  const speed = 0.1;
  const topLayer = stack[stack.length - 1];
  topLayer.threejs.position[topLayer.direction] += speed;
  topLayer.cannonjs.position[topLayer.direction] += speed;

  if(camera.position.y < boxHeight * (stack.length - 2) + 4){
    camera.position.y += speed;
  }

  updatePhysics();
  renderer.render(scene, camera);
}

init();