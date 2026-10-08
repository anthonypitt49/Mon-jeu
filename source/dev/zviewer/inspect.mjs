// Inventaire d'un GLB : chaque maillage, sa position, sa taille et son matériau (transparence, face, texture).
import { chromium } from 'playwright';
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage(); await p.goto('http://127.0.0.1:8088/zviewer/index.html'); await p.waitForFunction(() => window.ready);
const r = await p.evaluate(async (f) => {
  const { GLTFLoader } = await import('../node_modules/three/examples/jsm/loaders/GLTFLoader.js'); const THREE = await import('../node_modules/three/build/three.module.js');
  const g = await new GLTFLoader().loadAsync(f); const out = [];
  g.scene.updateMatrixWorld(true);
  g.scene.traverse((o) => { if (!o.isMesh) return; const bb = new THREE.Box3().setFromObject(o); const m = o.material;
    out.push(`${o.name} ${o.isSkinnedMesh ? 'skin' : 'mesh'} c=(${bb.getCenter(new THREE.Vector3()).toArray().map((v) => v.toFixed(2))}) size=(${bb.getSize(new THREE.Vector3()).toArray().map((v) => v.toFixed(2))}) alpha=${m.transparent}/${m.alphaTest}/${m.opacity} side=${m.side} map=${!!m.map} col=${m.color.getHexString()}`); });
  return out;
}, process.argv[2]);
console.log(r.join('\n')); await b.close();
