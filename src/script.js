import './style.css';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { THREEx } from './util/THREEx.FullScreen.js';
import { THREEx as THREEx2 } from './util/THREEx.KeyboardState';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { GlitchPass } from 'three/examples/jsm/postprocessing/GlitchPass.js';
import { Text } from 'troika-three-text';
import gsap from 'gsap';
import phrases from './phrases.js';

// Color management settings
THREE.ColorManagement.legacyMode = false;

// Levels and difficulties buttons
const levelElementsArray = [
  document.getElementById('level-1'),
  document.getElementById('level-2'),
  document.getElementById('level-3'),
];

const difficultiesElementsArray = [
  document.getElementById('difficulty-beginner'),
  document.getElementById('difficulty-intermediate'),
  document.getElementById('difficulty-advanced'),
];

for (let i = 0; i < levelElementsArray.length; i++) {
  levelElementsArray[i].addEventListener('click', () => {
    containerRestartElement.style.visibility = 'hidden';
    gameRestart(i, activeDifficulty);
    levelElementsArray.forEach((levelElement) => (levelElement.style.backgroundColor = 'rgba(197, 197, 197, 0.25)'));
    window.getComputedStyle(levelElementsArray[i]).backgroundColor === 'rgba(197, 197, 197, 0.25)' &&
      (levelElementsArray[i].style.backgroundColor = 'black');
  });
}

for (let i = 0; i < difficultiesElementsArray.length; i++) {
  difficultiesElementsArray[i].addEventListener('click', () => {
    containerRestartElement.style.visibility = 'hidden';
    gameRestart(activeLevel, i);
    difficultiesElementsArray.forEach(
      (difficultyElement) => (difficultyElement.style.backgroundColor = 'rgba(197, 197, 197, 0.25)')
    );
    window.getComputedStyle(difficultiesElementsArray[i]).backgroundColor === 'rgba(197, 197, 197, 0.25)' &&
      (difficultiesElementsArray[i].style.backgroundColor = 'black');
  });
}

// Canvas element
const canvas = document.getElementById('webgl');

// Timer clock element
const timerElement = document.getElementById('timer');
let timerClock = new THREE.Clock(false);

// Container restart element
const containerRestartElement = document.querySelector('.container-restart');
const restartElement = document.getElementById('restart');
restartElement.addEventListener('click', () => {
  containerRestartElement.style.visibility = 'hidden';
  gameRestart();
});

// Hearts elements & controls elements
const heartsElements = [
  document.getElementById('heart-1'),
  document.getElementById('heart-2'),
  document.getElementById('heart-3'),
];
const forwardKeyElement = document.getElementById('forward');
const leftwardKeyElement = document.getElementById('leftward');
const backwardKeyElement = document.getElementById('backward');
const rightwardKeyElement = document.getElementById('rightward');
const keyboardControlsElements = [forwardKeyElement, leftwardKeyElement, backwardKeyElement, rightwardKeyElement];

// Game variables
let userScore = 0;
let playerLives = 3;
let playerLivesUpdate = false;
let continueInteraction = true;
let continueDriving = true;
let numberOfMoves = 0;
let numberOfMatches = 0;
let numberOfLevels = 5;
let activeLevel = 0;
let activeDifficulty = 0;

// Full screen on "F" key press
THREEx.FullScreen.bindKey({ charCode: 'f'.charCodeAt(0) });

// Keyboard controls extension
let keyboard = new THREEx2.KeyboardState();

// Scene & fog
const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0x000000, 25, 60);

// Sizes
const sizes = {
  width: window.innerWidth,
  height: window.innerHeight,
};

// Car chase camera
const chaseCamera = new THREE.PerspectiveCamera(60, sizes.width / sizes.height, 0.1, 500);
chaseCamera.position.set(0, 1.2, 5);
scene.add(chaseCamera);

// Renderer
const renderer = new THREE.WebGLRenderer({
  canvas: canvas,
  antialias: true,
});
renderer.outputEncoding = THREE.sRGBEncoding;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.setSize(sizes.width, sizes.height);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

// Effect composer and post-processing passes
const effectComposer = new EffectComposer(renderer);
effectComposer.setSize(sizes.width, sizes.height);
effectComposer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

// Render pass
const renderPass = new RenderPass(scene, chaseCamera);
effectComposer.addPass(renderPass);

// Glitch pass
const glitchPass = new GlitchPass();
glitchPass.enabled = false;
glitchPass.goWild = true;
effectComposer.addPass(glitchPass);

// Window resize action
window.addEventListener('resize', () => {
  // Update sizes
  sizes.width = window.innerWidth;
  sizes.height = window.innerHeight;

  // Update camera
  chaseCamera.aspect = sizes.width / sizes.height;
  chaseCamera.updateProjectionMatrix();

  // Update renderer
  renderer.setSize(sizes.width, sizes.height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  // Update effect composer
  effectComposer.setSize(sizes.width, sizes.height);
  effectComposer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});

// Sound effects
const winSoundEffect = new Audio('./sounds/game_win_sound.ogg');
const lossSoundEffect = new Audio('./sounds/game_loss_sound.ogg');
const correctAnswerSoundEffect = new Audio('./sounds/correct_answer_sound.ogg');
const incorrectAnswerSoundEffect = new Audio('./sounds/incorrect_answer_sound.ogg');
const teleportSoundEffect = new Audio('./sounds/teleport_sound.ogg');
teleportSoundEffect.playbackRate = 2;

const allSoundEffectsArray = [
  winSoundEffect,
  lossSoundEffect,
  correctAnswerSoundEffect,
  incorrectAnswerSoundEffect,
  teleportSoundEffect,
];

const playSoundEffect = (soundEffect) => {
  soundEffect.volume = 0.05;
  soundEffect.currentTime = 0;
  soundEffect.play();
};

const muteAllAudio = (mute = true) => {
  allSoundEffectsArray.forEach((sfx) => (sfx.muted = mute ? true : false));
};

let audioMuted = false;
addEventListener('keydown', (event) => {
  if (event.code === 'KeyM') {
    // Mute and unmute audio upon clicking 'M' key
    !audioMuted ? muteAllAudio(true) : muteAllAudio(false);
    audioMuted = !audioMuted;
  } else if (event.code === 'KeyR') {
    // Restart level by clicking 'R' key
    containerRestartElement.style.visibility = 'hidden';
    gameRestart();
  }
});

// Lights section (ambient light and directional light)
const ambientLight = new THREE.AmbientLight(0xffffff, 0.1);
const directionalLight = new THREE.DirectionalLight(0xffffff, 1.5);
directionalLight.position.set(0, 30, 60);
directionalLight.castShadow = true;
directionalLight.shadow.mapSize.width = 4096;
directionalLight.shadow.mapSize.height = 4096;
directionalLight.shadow.camera.near = 0.1;
directionalLight.shadow.camera.far = 250;
directionalLight.shadow.camera.top = 30;
directionalLight.shadow.camera.bottom = -30;
directionalLight.shadow.camera.left = -30;
directionalLight.shadow.camera.right = 30;
scene.add(ambientLight, directionalLight);

// Loaders, textures, geometries, materials
const textureLoader = new THREE.TextureLoader();
const snowflakeTexture = textureLoader.load('./pictures/snowflake.png');
snowflakeTexture.encoding = THREE.sRGBEncoding;
const portalTexture = textureLoader.load('./pictures/portal.jpg');
portalTexture.encoding = THREE.sRGBEncoding;

// Snowflake particles
const snowflakeCount = 15000;
const snowflakeGeometry = new THREE.BufferGeometry();
const snowflakeMaterial = new THREE.PointsMaterial({
  color: 0xffffff,
  size: 0.4,
  sizeAttenuation: true,
  alphaMap: snowflakeTexture,
  transparent: true,
  depthWrite: false,
});

const snowflakePositions = new Float32Array(snowflakeCount * 3);
const velocities = new Float32Array(snowflakeCount * 3);
for (let i = 0; i < snowflakeCount * 3; i++) {
  const i3 = i * 3;

  snowflakePositions[i3] = (Math.random() - 0.5) * 100;
  snowflakePositions[i3 + 1] = Math.random() * 50;
  snowflakePositions[i3 + 2] = (Math.random() - 0.5) * 100;

  velocities[i3] = Math.random() - 0.5;
  velocities[i3 + 1] = Math.random() - 1 * 0.01;
  velocities[i3 + 2] = Math.random() - 0.5;
}
snowflakeGeometry.setAttribute('position', new THREE.BufferAttribute(snowflakePositions, 3));

const particles = new THREE.Points(snowflakeGeometry, snowflakeMaterial);
scene.add(particles);

// Floor & walls geometries, materials

const floorGeometry = new THREE.CircleGeometry(1, 8);
const floorMaterial = new THREE.MeshStandardMaterial({ color: '#002BF6' });

const wallGeometry = new THREE.BoxGeometry(1, 1, 1);
const wallMaterial = new THREE.MeshStandardMaterial({ color: 'red' });

// Floor mesh
const floor = new THREE.Mesh(floorGeometry, floorMaterial);
floor.scale.set(100, 100);
floor.rotation.x = -Math.PI / 2;
floor.position.y = -1;
floor.position.z = -10;
floor.receiveShadow = true;
scene.add(floor);

// Walls meshes
const leftWall = new THREE.Mesh(wallGeometry, wallMaterial);
leftWall.scale.set(1, 3, 60);
leftWall.position.x = -20.5;
leftWall.visible = false;
scene.add(leftWall);

let leftWallBB = new THREE.Box3(new THREE.Vector3(), new THREE.Vector3());
leftWallBB.setFromObject(leftWall);

const rightWall = new THREE.Mesh(wallGeometry, wallMaterial);
rightWall.scale.set(1, 3, 60);
rightWall.position.x = 20.5;
rightWall.visible = false;
scene.add(rightWall);

let rightWallBB = new THREE.Box3(new THREE.Vector3(), new THREE.Vector3());
rightWallBB.setFromObject(rightWall);

const backWall = new THREE.Mesh(wallGeometry, wallMaterial);
backWall.scale.set(40, 3, 1);
backWall.position.z = 30.5;
backWall.visible = false;
scene.add(backWall);

let backWallBB = new THREE.Box3(new THREE.Vector3(), new THREE.Vector3());
backWallBB.setFromObject(backWall);

const frontWall = new THREE.Mesh(wallGeometry, wallMaterial);
frontWall.scale.set(40, 3, 1);
frontWall.position.z = -30.5;
frontWall.visible = false;
scene.add(frontWall);

let frontWallBB = new THREE.Box3(new THREE.Vector3(), new THREE.Vector3());
frontWallBB.setFromObject(frontWall);

// Answer boxes meshes
const answerBoxGeometry = new THREE.BoxGeometry(1, 1, 1);

const answerBoxLeft = new THREE.Mesh(answerBoxGeometry, new THREE.MeshStandardMaterial({ color: 'orange' }));
answerBoxLeft.castShadow = true;
answerBoxLeft.receiveShadow = true;
answerBoxLeft.position.set(-5, -0.5, -10);
scene.add(answerBoxLeft);

let answerBoxLeftBB = new THREE.Box3(new THREE.Vector3(), new THREE.Vector3());
answerBoxLeftBB.setFromObject(answerBoxLeft);

const answerBoxRight = new THREE.Mesh(answerBoxGeometry, new THREE.MeshStandardMaterial({ color: 'orange' }));
answerBoxRight.castShadow = true;
answerBoxRight.receiveShadow = true;
answerBoxRight.position.set(5, -0.5, -10);
scene.add(answerBoxRight);

let answerBoxRightBB = new THREE.Box3(new THREE.Vector3(), new THREE.Vector3());
answerBoxRightBB.setFromObject(answerBoxRight);

// Portal mesh
const portalCircle = new THREE.Mesh(
  new THREE.CircleGeometry(2, 32),
  new THREE.MeshStandardMaterial({ color: 'limegreen', map: portalTexture })
);
portalCircle.position.set(0, -5, -22);
scene.add(portalCircle);

let portalCircleBB = new THREE.Sphere(portalCircle.position, 2);

// Group for the car and its collider
const carGroup = new THREE.Group();

// Car collider
const carColliderGeometry = new THREE.BoxGeometry(1.2, 0.95, 3.21);
const carColliderMaterial = new THREE.MeshBasicMaterial({
  color: 0xff0000,
  wireframe: true,
  visible: false,
});

let carCollider = new THREE.Mesh(carColliderGeometry, carColliderMaterial);
carCollider.position.set(0, -0.58, 0.165);
carGroup.add(carCollider);

let carColliderBB = new THREE.Box3(new THREE.Vector3(), new THREE.Vector3());
carColliderBB.setFromObject(carCollider);

// Load in the vehicle model
const gltfLoader = new GLTFLoader();
gltfLoader.load('./models/muscle_car_white.glb', (gltf) => {
  // Cast shadow for every mesh inside group of 3d objects
  gltf.scene.traverse((mesh) => (mesh.castShadow = true));
  gltf.scene.rotation.y = -Math.PI / 2;
  gltf.scene.position.z = 1;
  gltf.scene.position.y = -0.5;
  carGroup.add(gltf.scene);

  // Set (3D bounding box) for the car
  carColliderBB.setFromObject(carCollider);
});
scene.add(carGroup);

// Actions taken upon detected collision with an answer box
const collisionWithAnswerBox = (mesh) => {
  numberOfMoves++;
  changeMeshOrGroupHeight(mesh, 2, 0.2);

  if (mesh.gameProps.correct) {
    playSoundEffect(correctAnswerSoundEffect);
    changeBoxColor(mesh, new THREE.Color('green'), 0.5);
    ++numberOfMatches === numberOfLevels && gameWin();
  } else if (!mesh.gameProps.correct) {
    playSoundEffect(incorrectAnswerSoundEffect);
    playerLives--;
    playerLivesUpdate = true;
    changeBoxColor(mesh, new THREE.Color('red'), 0.5);
  }

  playerLives !== 0 && continueDriving && changeMeshOrGroupHeight(portalCircle, 0.25, 0.2);
  continueInteraction = false;
};

const resetObjectsAndTeleport = () => {
  playSoundEffect(teleportSoundEffect);
  resetPositionAndRotation(carGroup, { x: 0, y: 0, z: 0 });
  changeBoxColor(answerBoxLeft, new THREE.Color('orange'), 0.1);
  changeBoxColor(answerBoxRight, new THREE.Color('orange'), 0.1);
  changeMeshOrGroupHeight(answerBoxLeft, -0.5, 0.1);
  changeMeshOrGroupHeight(answerBoxRight, -0.5, 0.1);
};

// Turn on/off glitch effect
const activateGlitchPass = (state = true) => {
  continueDriving = !state;
  glitchPass.enabled = state;
};

// Collision checking function
const checkCollisions = () => {
  if (continueInteraction) {
    carColliderBB.intersectsBox(answerBoxLeftBB) && collisionWithAnswerBox(answerBoxLeft);
    carColliderBB.intersectsBox(answerBoxRightBB) && collisionWithAnswerBox(answerBoxRight);
  }

  if (
    carColliderBB.intersectsBox(leftWallBB) ||
    carColliderBB.intersectsBox(rightWallBB) ||
    carColliderBB.intersectsBox(backWallBB) ||
    carColliderBB.intersectsBox(frontWallBB)
  ) {
    playSoundEffect(teleportSoundEffect);
    activateGlitchPass(true);
    resetPositionAndRotation(carGroup, { x: 0, y: 0, z: 0 });
    setTimeout(() => activateGlitchPass(false), 500);
  }

  if (carColliderBB.intersectsSphere(portalCircleBB)) {
    activateGlitchPass(true);
    continueInteraction = true;

    resetObjectsAndTeleport();
    loadLevel(activeLevel, activeDifficulty);
    setTimeout(() => activateGlitchPass(false), 500);
  }
};

// Car & camera position update
const startPosition = new THREE.Vector3();
const updateCarAndCameraPosition = () => {
  const delta = animateClock.getDelta();
  let moveDistance = 10 * delta;
  let rotateAngle = (Math.PI / 2) * delta;

  // Camera offset from carGroup
  const relativeOffset = new THREE.Vector3(0, 1.2, 5);
  const cameraOffset = relativeOffset.applyMatrix4(carGroup.matrixWorld);
  const interpolatedPosition = startPosition.lerp(cameraOffset, continueDriving ? 4 * delta : 40 * delta);

  chaseCamera.position.copy(interpolatedPosition);
  chaseCamera.lookAt(carGroup.position);

  // Key states used for movement tracking
  if (continueDriving) {
    // Only separate keys pressed
    const forwardMovement = keyboard.pressed('W') || keyboard.pressed('up');
    const leftwardMovement = keyboard.pressed('A') || keyboard.pressed('left');
    const backwardMovement = keyboard.pressed('S') || keyboard.pressed('down');
    const rightwardMovement = keyboard.pressed('D') || keyboard.pressed('right');
    const shiftAcceleratedMovement = keyboard.pressed('shift');

    // Speed and angle boost
    shiftAcceleratedMovement && (moveDistance *= 1.3) && (rotateAngle *= 1.3);

    if (forwardMovement) {
      !timerClock.running && timerClock.start();
      carGroup.translateZ(-moveDistance);
      forwardKeyElement.classList.add('active');
    } else forwardKeyElement.classList.remove('active');

    if (backwardMovement) {
      !timerClock.running && timerClock.start();
      carGroup.translateZ(moveDistance * 0.6);
      backwardKeyElement.classList.add('active');
    } else backwardKeyElement.classList.remove('active');

    leftwardMovement ? leftwardKeyElement.classList.add('active') : leftwardKeyElement.classList.remove('active');
    rightwardMovement ? rightwardKeyElement.classList.add('active') : rightwardKeyElement.classList.remove('active');

    // Multiple key combinations
    if (forwardMovement && leftwardMovement) carGroup.rotateOnAxis(new THREE.Vector3(0, 1, 0), rotateAngle);
    if (forwardMovement && rightwardMovement) carGroup.rotateOnAxis(new THREE.Vector3(0, 1, 0), -rotateAngle);
    if (backwardMovement && leftwardMovement) carGroup.rotateOnAxis(new THREE.Vector3(0, 1, 0), -rotateAngle);
    if (backwardMovement && rightwardMovement) carGroup.rotateOnAxis(new THREE.Vector3(0, 1, 0), rotateAngle);

    // Refresh bounding box as the car moves
    carColliderBB.copy(carCollider.geometry.boundingBox).applyMatrix4(carCollider.matrixWorld);

    // Check for any collisions after movement
    checkCollisions();
  } else
    keyboardControlsElements
      .filter((controls) => controls.classList.contains('active'))
      .forEach((key) => key.classList.remove('active'));
};

// Text 3D Objects with the help of troika-three-text
const createAnswerTextObject = (relatedMesh) => {
  const textObject = new Text();
  textObject.font = './fonts/BebasNeue-Regular.ttf';
  textObject.fontSize = 0.6;
  textObject.textAlign = 'center';
  textObject.anchorX = 'center';
  textObject.anchorY = 'middle';
  textObject.color = 'white';
  textObject.maxWidth = 3;
  textObject.lineHeight = 1;
  textObject.position.copy({
    x: relatedMesh.position.x,
    y: relatedMesh.position.y + 1,
    z: relatedMesh.position.z,
  });
  textObject.castShadow = true;
  textObject.outlineColor = 'black';
  textObject.outlineWidth = 0.04;

  return textObject;
};

const answerLeftText = createAnswerTextObject(answerBoxLeft);
const answerRightText = createAnswerTextObject(answerBoxRight);
const phraseText = new Text();
phraseText.font = './fonts/BebasNeue-Regular.ttf';
phraseText.fontSize = 1;
phraseText.textAlign = 'center';
phraseText.anchorX = 'center';
phraseText.anchorY = 'middle';
phraseText.color = new THREE.Color(0.05235015050063985, 1, 0);
phraseText.maxWidth = 7;
phraseText.lineHeight = 1.15;
phraseText.curveRadius = 10;
phraseText.position.y = 2.5;
phraseText.position.z = -12;
phraseText.castShadow = true;
phraseText.outlineColor = 'black';
phraseText.outlineWidth = 0.05;

scene.add(answerLeftText, answerRightText, phraseText);

// Options to choose phrases from with a given difficulty
let optionsToChoose = JSON.parse(JSON.stringify(phrases.filter((phrase) => phrase.difficulty === activeDifficulty)));

// Function that loads in levels
const loadLevel = (levelType = 0, levelDifficulty = 0) => {
  portalCircle.position.y = -5;

  activeLevel = levelType;
  activeDifficulty = levelDifficulty;
  numberOfLevels = levelType === 0 ? 5 : levelType === 1 ? 10 : 15;

  // Get randomly picked phrase from phrases.js file
  const currentPick = optionsToChoose[Math.floor(Math.random() * optionsToChoose.length)];
  currentPick.alreadyUsed = true;
  const answers = [currentPick.correctAnswer, currentPick.incorrectAnswer];
  const firstAnswer = answers[Math.floor(Math.random() * answers.length)];
  const secondAnswer = answers.find((ans) => ans !== firstAnswer);

  // Assign properties for match checking to meshes
  answerBoxLeft.gameProps = {
    id: currentPick.id,
    phrase: currentPick.phrase,
    correct: firstAnswer === currentPick.correctAnswer ? true : false,
    difficulty: currentPick.difficulty,
  };

  answerBoxRight.gameProps = {
    id: currentPick.id,
    phrase: currentPick.phrase,
    correct: !answerBoxLeft.gameProps.correct,
    difficulty: currentPick.difficulty,
  };

  // Left, right answer & phrase text content update
  answerLeftText.text = firstAnswer;
  answerLeftText.sync();
  answerRightText.text = secondAnswer;
  answerRightText.sync();
  phraseText.text = currentPick.phrase;
  phraseText.sync();

  // Update phrases to only contain not already used ones
  optionsToChoose = optionsToChoose.filter((phrase) => !phrase.alreadyUsed);
};
// By default load in the easiest level & difficulty
loadLevel(activeLevel, activeDifficulty);

const gameWin = () => {
  const levelMultiplier = activeLevel === 0 ? 1.0 : activeLevel === 1 ? 2.5 : 5.0;
  const difficultyMultiplier = activeDifficulty === 0 ? 1.0 : activeDifficulty === 1 ? 1.5 : 2.0;
  const accuracyRatio = numberOfLevels / numberOfMatches;

  userScore = parseInt(
    playerLives * 2000 * levelMultiplier * difficultyMultiplier * accuracyRatio - timerClock.getElapsedTime() * 10
  );
  userScore < 0 && (userScore = 0);

  timerClock.stop();
  continueInteraction = false;
  continueDriving = false;

  if (
    window.localStorage.getItem('highestScoreRace') &&
    parseInt(window.localStorage.getItem('highestScoreRace')) < userScore
  )
    window.localStorage.setItem('highestScoreRace', userScore);
  else if (!window.localStorage.getItem('highestScoreRace')) window.localStorage.setItem('highestScoreRace', userScore);

  setTimeout(() => {
    playSoundEffect(winSoundEffect);
    // Show restart modal with score and highest score if exists
    containerRestartElement.style.visibility = 'visible';
    restartElement.textContent = window.localStorage.getItem('highestScoreRace')
      ? `Score: ${userScore} | Highest score: ${window.localStorage.getItem('highestScoreRace')} | Restart`
      : `Score: ${userScore} | Restart`;
  }, 1000);
};

const gameLoss = () => {
  userScore = 0;
  timerClock.stop();
  continueInteraction = false;
  continueDriving = false;

  setTimeout(() => {
    playSoundEffect(lossSoundEffect);
    // Show restart modal
    containerRestartElement.style.visibility = 'visible';
    restartElement.textContent = `Restart`;
  }, 1000);
};

const gameRestart = (level = activeLevel, difficulty = activeDifficulty) => {
  timerClock.stop();
  timerElement.innerHTML = '0.00';
  playerLives = 3;
  playerLivesUpdate = true;
  numberOfMoves = 0;
  numberOfMatches = 0;

  activateGlitchPass(true);
  continueInteraction = false;
  optionsToChoose = JSON.parse(JSON.stringify(phrases.filter((phrase) => phrase.difficulty === difficulty)));

  resetObjectsAndTeleport();
  loadLevel(level, difficulty);

  setTimeout(() => {
    activateGlitchPass(false);
    continueInteraction = true;
  }, 500);
};

// Gsap animation functions
const changeBoxColor = (mesh, destinationColor, duration) => {
  gsap.to(mesh.material.color, {
    duration,
    r: destinationColor.r,
    g: destinationColor.g,
    b: destinationColor.b,
  });
};

const changeMeshOrGroupHeight = (meshOrGroup, height, duration, delay) => {
  gsap.to(meshOrGroup.position, {
    duration,
    delay,
    y: height,
  });
};

const resetPositionAndRotation = (mesh, vector3) => {
  mesh.position.set(vector3.x, vector3.y, vector3.z);
  mesh.rotation.set(vector3.x, vector3.y, vector3.z);
};

// Animation section
const snowflakeClock = new THREE.Clock(); // Clock for snowflake animation
const animateClock = new THREE.Clock(); // Clock for overall animation
const animate = () => {
  // Call animate() upon next frame
  window.requestAnimationFrame(animate);

  updateCarAndCameraPosition();

  // Slowly change directionalLight's position-x overtime
  directionalLight.position.x = Math.sin(animateClock.elapsedTime * 0.02) * 30;

  // Text answers look at the chase camera when the player can interact with answer objects
  if (continueInteraction) {
    answerLeftText.lookAt(new THREE.Vector3(chaseCamera.position.x, 0, chaseCamera.position.z));
    answerRightText.lookAt(new THREE.Vector3(chaseCamera.position.x, 0, chaseCamera.position.z));
  }

  // Portal always looks toward the chase camera
  portalCircle.lookAt(new THREE.Vector3(chaseCamera.position.x, 0, chaseCamera.position.z));

  // update text position
  answerLeftText.position.copy({
    x: answerBoxLeft.position.x,
    y: answerBoxLeft.position.y + 1,
    z: answerBoxLeft.position.z,
  });
  answerRightText.position.copy({
    x: answerBoxRight.position.x,
    y: answerBoxRight.position.y + 1,
    z: answerBoxRight.position.z,
  });

  // Update player lives, check for game loss
  if (playerLivesUpdate) {
    playerLives === 3 && heartsElements.forEach((heart) => (heart.style.visibility = 'visible'));
    playerLives === 2 && (heartsElements[2].style.visibility = 'hidden');
    playerLives === 1 && (heartsElements[1].style.visibility = 'hidden');
    playerLives === 0 && (heartsElements[0].style.visibility = 'hidden') && gameLoss();
    playerLivesUpdate = false;
  }

  // Update the timer element to show elapsed time
  timerClock.running && (timerElement.innerHTML = `${timerClock.getElapsedTime().toFixed(2)}`);

  // Animate snowflake particles
  const snowflakeDelta = snowflakeClock.getDelta();
  const snowflakePositionsArray = particles.geometry.attributes.position.array;
  for (let i = 0; i < snowflakeCount; i++) {
    const i3 = i * 3;

    snowflakePositionsArray[i3] += Math.sin(animateClock.elapsedTime * velocities[i3]) * snowflakeDelta * 2;
    snowflakePositionsArray[i3 + 1] -= velocities[i3 + 1] * snowflakeDelta * 2;
    snowflakePositionsArray[i3 + 2] += Math.sin(animateClock.elapsedTime * velocities[i3 + 2]) * snowflakeDelta * 2;

    if (snowflakePositionsArray[i3] < -50) snowflakePositionsArray[i3] = 50;
    else if (snowflakePositionsArray[i3] > 50) snowflakePositionsArray[i3] = -50;
    snowflakePositionsArray[i3 + 1] < -5 && (snowflakePositionsArray[i3 + 1] = 50);
    if (snowflakePositionsArray[i3 + 2] < -50) snowflakePositionsArray[i3 + 2] = 50;
    else if (snowflakePositionsArray[i3 + 2] > 50) snowflakePositionsArray[i3 + 2] = -50;
  }

  particles.geometry.attributes.position.needsUpdate = true;

  // Render the scene
  effectComposer.render();
};
animate();
