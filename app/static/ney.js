// 创建场景
var scene = new THREE.Scene();

// 创建相机
var camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000);
camera.position.z = 5;

// 创建渲染器
var renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// 创建ney的主体
var geometry = new THREE.CylinderGeometry(0.2, 0.2, 3, 32);
var material = new THREE.MeshBasicMaterial({color: 0x8B4513});
var neyBody = new THREE.Mesh(geometry, material);
scene.add(neyBody);

// 创建ney的吹口
var mouthpieceGeometry = new THREE.CylinderGeometry(0.1, 0.1, 0.5, 32);
var mouthpieceMaterial = new THREE.MeshBasicMaterial({color: 0x000000});
var mouthpiece = new THREE.Mesh(mouthpieceGeometry, mouthpieceMaterial);
mouthpiece.position.y = 1.5;
scene.add(mouthpiece);

// 添加环境光
var ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

// 添加点光源
var pointLight = new THREE.PointLight(0xffffff, 1);
pointLight.position.set(5, 5, 5);
scene.add(pointLight);

// 渲染循环
function animate() {
    requestAnimationFrame(animate);
    neyBody.rotation.y += 0.01;
    renderer.render(scene, camera);
}
animate();
c