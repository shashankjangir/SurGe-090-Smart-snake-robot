const container = document.getElementById('canvas-container');
const statusText = document.getElementById('status-text');
const statusDot = document.getElementById('status-dot');
const btnResetCam = document.getElementById('btn-reset-cam');

// Setup Scene — Sky Wash pastel background
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xdceeff);

// Setup Camera
const camera = new THREE.PerspectiveCamera(55, container.clientWidth / container.clientHeight, 0.01, 100);
const DEFAULT_CAM_POS = new THREE.Vector3(0, 1.6, 2.2);
camera.position.copy(DEFAULT_CAM_POS);

// Setup Renderer
let renderer = null;
let controls = null;
try {
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);
    renderer.domElement.style.touchAction = 'none';

    // Setup Controls
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.target.set(0, 0, 0);
} catch (e) {
    renderer = null;
    controls = null;
    console.warn('3D Viewer: WebGL unavailable', e);
    if (statusText) statusText.textContent = '3D Viewer: WebGL unavailable';
}
let following = true;
let drawing = false;
let pointer = null;
let draft = [];
const drawButton = document.getElementById('btn-draw');
const useButton = document.getElementById('btn-use-path');
const cancelButton = document.getElementById('btn-cancel-path');
const followButton = document.getElementById('btn-follow');
const waypointInput = document.getElementById('waypoint-input');
if (!controls) {
    for (const button of [drawButton, useButton, cancelButton, followButton, btnResetCam,
                          document.getElementById('add-waypoint')]) {
        if (button) button.disabled = true;
    }
}
followButton.addEventListener('click', () => {
    following = !following;
    followButton.textContent = `Follow head: ${following ? 'on' : 'off'}`;
});

if (btnResetCam) {
    btnResetCam.addEventListener('click', () => {
        camera.position.copy(DEFAULT_CAM_POS);
        if (controls) controls.target.set(0, 0, 0);
    });
}

// Lighting for soft pastel aesthetic
const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
scene.add(ambientLight);

const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
dirLight.position.set(5, 12, 6);
dirLight.castShadow = true;
scene.add(dirLight);

// Ground Plane — Crisp cartoon grid on paper white ground
const gridHelper = new THREE.GridHelper(100, 200, 0x000000, 0xc0d8f0);
gridHelper.position.y = 0;
scene.add(gridHelper);

const groundGeo = new THREE.PlaneGeometry(100, 100);
const groundMat = new THREE.MeshBasicMaterial({ color: 0xf5f9ff });
const groundMesh = new THREE.Mesh(groundGeo, groundMat);
groundMesh.rotation.x = -Math.PI / 2;
groundMesh.position.y = -0.001;
scene.add(groundMesh);

// Setup Paths
const targetMaterial = new THREE.LineBasicMaterial({ color: 0xffd731, linewidth: 3, depthTest: false });
const targetLine = new THREE.Line(new THREE.BufferGeometry(), targetMaterial);
targetLine.renderOrder = 1;
targetLine.frustumCulled = false;
scene.add(targetLine);

const actualMaterial = new THREE.LineBasicMaterial({ color: 0xfb4903, linewidth: 2, depthTest: false });
const actualLine = new THREE.Line(new THREE.BufferGeometry(), actualMaterial);
actualLine.renderOrder = 2;
actualLine.frustumCulled = false;
scene.add(actualLine);

const draftLine = new THREE.Line(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({color: 0x55db9c, depthTest: false}));
scene.add(draftLine);
const previewLine = new THREE.Line(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({color: 0x5c4ade, depthTest: false}));
scene.add(previewLine);
const raycaster = new THREE.Raycaster();
const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
function setDrawing(value) {
    if (!controls) return;
    drawing = value;
    controls.enabled = !value;
    drawButton.textContent = value ? 'Drawing on ground' : 'Draw path';
    useButton.hidden = !value;
    cancelButton.hidden = !value;
    waypointInput.hidden = !value;
    if (!value) { pointer = null; draft = []; updatePath(draftLine, draft); }
}
drawButton.addEventListener('click', () => setDrawing(!drawing));
cancelButton.addEventListener('click', () => setDrawing(false));
document.getElementById('add-waypoint').addEventListener('click', () => {
    const xInput = document.getElementById('waypoint-x');
    const yInput = document.getElementById('waypoint-y');
    const x = xInput.valueAsNumber, y = yInput.valueAsNumber;
    if (!Number.isFinite(x) || !Number.isFinite(y) || Math.abs(x) > 100 || Math.abs(y) > 100 || draft.length >= 5000) {
        statusText.textContent = 'Enter waypoint coordinates within ±100 m'; return;
    }
    draft.push([x, y]); updatePath(draftLine, draft);
});
useButton.addEventListener('click', async () => {
    if (draft.length < 2) { statusText.textContent = 'Draw at least two points'; return; }
    try {
        const response = await fetch('/api/set_path', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({path:draft})});
        const result = await response.json();
        if (!response.ok || !result.success) throw new Error(result.error || 'Path rejected');
        setDrawing(false);
    } catch (e) { statusText.textContent = e.message; }
});
function addDraftPoint(event) {
    if (!renderer) return;
    const rect = renderer.domElement.getBoundingClientRect();
    const coord = new THREE.Vector2(2 * (event.clientX - rect.left) / rect.width - 1, 1 - 2 * (event.clientY - rect.top) / rect.height);
    raycaster.setFromCamera(coord, camera);
    const point = new THREE.Vector3();
    if (!raycaster.ray.intersectPlane(groundPlane, point) || Math.abs(point.x) > 100 || Math.abs(point.z) > 100) return;
    const next = [point.x, -point.z];
    const last = draft[draft.length - 1];
    if (!last || Math.hypot(next[0] - last[0], next[1] - last[1]) >= 0.05) {
        if (draft.length < 5000) draft.push(next);
        updatePath(draftLine, draft);
    }
}
if (renderer) {
    renderer.domElement.addEventListener('pointerdown', event => {
        if (!drawing || pointer !== null || event.button !== 0) return;
        draft = []; pointer = event.pointerId;
        renderer.domElement.setPointerCapture(pointer);
        addDraftPoint(event);
    });
    renderer.domElement.addEventListener('pointermove', event => { if (drawing && event.pointerId === pointer) addDraftPoint(event); });
    renderer.domElement.addEventListener('pointerup', event => { if (event.pointerId === pointer) { addDraftPoint(event); pointer = null; } });
    renderer.domElement.addEventListener('pointercancel', () => { pointer = null; draft = []; updatePath(draftLine, draft); });
}
window.addEventListener('blur', () => { pointer = null; });
window.addEventListener('message', event => {
    if (event.origin !== location.origin || event.source !== window.parent) return;
    if (event.data?.type === 'reset-view') {
        setDrawing(false); updatePath(previewLine, []); camera.position.copy(DEFAULT_CAM_POS); if (controls) controls.target.set(0, 0, 0); firstFrame = true;
    } else if (event.data?.type === 'preview-path' && Array.isArray(event.data.path) && event.data.path.length <= 5000 &&
        event.data.path.every(p => Array.isArray(p) && p.length === 2 && p.every(v => Number.isFinite(v) && Math.abs(v) <= 100))) {
        updatePath(previewLine, event.data.path);
    }
});

function updatePath(lineObj, pathData) {
    if (!pathData || pathData.length < 2) {
        lineObj.geometry.setFromPoints([]);
        return;
    }
    const points = [];
    for (let i = 0; i < pathData.length; i++) {
        points.push(new THREE.Vector3(pathData[i][0], 0.015, -pathData[i][1]));
    }
    lineObj.geometry.setFromPoints(points);
}

// Snake Segments Array
const segments = [];
let previousHeadPos = new THREE.Vector3(0, 0, 0);
let firstFrame = true;

// Slush Inflatable Ribbon styling for snake segment meshes
function createSegmentMesh(isHead) {
    // Rounded box geometry roughly 40x40x80 mm
    const geometry = new THREE.BoxGeometry(0.045, 0.045, 0.085);

    // Slush Electric Blue (#4da2ff) body, Ember (#fb4903) head
    const material = new THREE.MeshStandardMaterial({
        color: isHead ? 0xfb4903 : 0x4da2ff,
        roughness: 0.35,
        metalness: 0.05
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    // Black outline effect around each segment
    const wireGeo = new THREE.EdgesGeometry(geometry);
    const wireMat = new THREE.LineBasicMaterial({ color: 0x000000, linewidth: 2 });
    const wireMesh = new THREE.LineSegments(wireGeo, wireMat);
    mesh.add(wireMesh);

    return mesh;
}

async function poll3DStatus() {
    if (!controls) return;
    try {
        const res = await fetch('/api/3d_status');
        const data = await res.json();

        if (data.segments && data.segments.length > 0) {
            statusText.textContent = "Live 3D Stream (PyBullet)";
            statusDot.className = "hud-status-dot active";

            while (segments.length < data.segments.length) {
                const isHead = segments.length === 0;
                const mesh = createSegmentMesh(isHead);
                scene.add(mesh);
                segments.push(mesh);
            }

            for (let i = 0; i < data.segments.length; i++) {
                const sData = data.segments[i];
                segments[i].visible = true;
                segments[i].position.set(sData.pos[0], sData.pos[2], -sData.pos[1]);
                segments[i].quaternion.set(sData.quat[0], sData.quat[2], -sData.quat[1], sData.quat[3]);
            }

            if (segments.length > 0 && following && !drawing) {
                const headPos = segments[0].position;

                if (!firstFrame) {
                    const delta = new THREE.Vector3().subVectors(headPos, previousHeadPos);
                    camera.position.add(delta);
                } else {
                    firstFrame = false;
                }

                controls.target.copy(headPos);
                previousHeadPos.copy(headPos);

            }

        } else {
            statusText.textContent = "Waiting for Simulation Engine...";
            statusDot.className = "hud-status-dot";
            segments.forEach(m => m.visible = false);
        }
        updatePath(targetLine, data.target_path);
        updatePath(actualLine, data.actual_path);
    } catch (e) {
        statusText.textContent = "Stream Disconnected";
        statusDot.className = "hud-status-dot";
    }
}

// Chain polls so a slow response never stacks requests; idle while the tab is hidden.
async function pollLoop() {
    if (!document.hidden) await poll3DStatus();
    setTimeout(pollLoop, 50);
}
pollLoop();

function animate() {
    requestAnimationFrame(animate);
    if (controls) controls.update();
    if (renderer) renderer.render(scene, camera);
}
animate();

new ResizeObserver(() => {
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    if (renderer) renderer.setSize(container.clientWidth, container.clientHeight);
}).observe(container);
