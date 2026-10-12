import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

type Props = { variant?: 'intro' | 'hero'; surge?: boolean };
const add = THREE.AdditiveBlending;
const CY = 0x22d3ee, VI = 0x8b5cf6, BL = 0x2563eb, NAVY = 0x050816;

const glowTex = () => {
  try {
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const x = c.getContext('2d');
    if (!x) return null;
    const g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.25, 'rgba(103,232,249,.65)');
    g.addColorStop(1, 'rgba(34,211,238,0)');
    x.fillStyle = g;
    x.fillRect(0, 0, 128, 128);
    return new THREE.CanvasTexture(c);
  } catch {
    return null;
  }
};

const waveMat = (a: number, b: number, ph: number) =>
  new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: add,
    uniforms: {
      uT: { value: 0 },
      uA: { value: 1 },
      ph: { value: ph },
      c1: { value: new THREE.Color(a) },
      c2: { value: new THREE.Color(b) },
    },
    vertexShader:
      'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader:
      'varying vec2 vUv;uniform float uT,uA,ph;uniform vec3 c1,c2;void main(){float f=pow(.5+.5*sin(vUv.x*62.83185*2.+ph-uT*3.),4.);gl_FragColor=vec4(mix(c1,c2,f)*(.3+2.4*f)*uA,1.);}',
  });

function isWebGLAvailable(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return !!(
      window.WebGLRenderingContext &&
      (canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
    );
  } catch {
    return false;
  }
}

export default function ThreeDScene({ variant = 'hero', surge = false }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const surgeRef = useRef(surge);
  surgeRef.current = surge;
  const [ok, setOk] = useState(true);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (!isWebGLAvailable()) {
      setOk(false);
      return;
    }

    const intro = variant === 'intro';
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const mobile = typeof window !== 'undefined' && window.innerWidth < 768;

    let r: THREE.WebGLRenderer | undefined;
    let comp: EffectComposer | undefined;
    let raf = 0;
    let ro: ResizeObserver | undefined;
    let io: IntersectionObserver | undefined;
    let tex: THREE.CanvasTexture | null = null;
    const scene = new THREE.Scene();

    try {
      r = new THREE.WebGLRenderer({
        antialias: false,
        powerPreference: 'high-performance',
        alpha: true,
      });

      r.setPixelRatio(Math.min(window.devicePixelRatio || 1, mobile ? 1.25 : 1.75));
      el.appendChild(r.domElement);

      // Context lost listener
      r.domElement.addEventListener('webglcontextlost', (e) => {
        e.preventDefault();
        cancelAnimationFrame(raf);
        setOk(false);
      });

      scene.background = new THREE.Color(NAVY);
      scene.fog = new THREE.FogExp2(NAVY, 0.045);

      const cam = new THREE.PerspectiveCamera(48, 1, 0.1, 100);
      const base = new THREE.Vector3(0, intro ? 2.6 : 2.2, intro ? 9 : 8.2);
      const root = new THREE.Group();
      root.position.x = intro && !mobile ? 2.6 : 0;
      root.rotation.x = 0.18;
      scene.add(root);

      tex = glowTex();

      // PCB base plate with pins
      const pg = new THREE.BoxGeometry(4.4, 0.1, 4.4);
      const plate = new THREE.Group();
      plate.position.y = -0.55;
      plate.add(
        new THREE.Mesh(pg, new THREE.MeshBasicMaterial({ color: 0x0b1030 })),
        new THREE.LineSegments(
          new THREE.EdgesGeometry(pg),
          new THREE.LineBasicMaterial({ color: BL })
        )
      );
      root.add(plate);

      const pins = new THREE.InstancedMesh(
        new THREE.BoxGeometry(0.07, 0.05, 0.22),
        new THREE.MeshBasicMaterial({ color: 0x7dd3fc }),
        4 * 18
      );
      const d = new THREE.Object3D();
      let pi = 0;
      for (let s = 0; s < 4; s++) {
        for (let i = 0; i < 18; i++) {
          const o = -1.95 + i * 0.23;
          d.rotation.set(0, (s * Math.PI) / 2, 0);
          const p = new THREE.Vector3(o, -0.55, 2.28).applyAxisAngle(
            new THREE.Vector3(0, 1, 0),
            (s * Math.PI) / 2
          );
          d.position.copy(p);
          d.updateMatrix();
          pins.setMatrixAt(pi++, d.matrix);
        }
      }
      root.add(pins);

      // Circuit traces + travelling light
      const paths: THREE.CurvePath<THREE.Vector3>[] = [];
      const tl: THREE.Vector3[] = [];
      const nT = mobile ? 14 : 28;
      for (let i = 0; i < nT; i++) {
        const s = i % 4;
        const o = -1.95 + (i % 18) * 0.23;
        const y = -0.49;
        const e = new THREE.Vector3(o, y, 2.2).applyAxisAngle(
          new THREE.Vector3(0, 1, 0),
          (s * Math.PI) / 2
        );
        const m = e.clone().multiplyScalar(0.55);
        m.y = y;
        const c = new THREE.Vector3(e.x * 0.25, y, e.z * 0.25);
        const mid =
          Math.abs(e.x) > Math.abs(e.z)
            ? new THREE.Vector3(m.x, y, c.z)
            : new THREE.Vector3(c.x, y, m.z);
        const cp = new THREE.CurvePath<THREE.Vector3>();
        cp.add(new THREE.LineCurve3(e, mid));
        cp.add(new THREE.LineCurve3(mid, c));
        paths.push(cp);
        root.add(
          new THREE.Line(
            new THREE.BufferGeometry().setFromPoints(cp.getPoints(24)),
            new THREE.LineBasicMaterial({
              color: i % 3 ? 0x34d399 : CY,
              transparent: true,
              opacity: 0.55,
            })
          )
        );
        tl.push(new THREE.Vector3());
      }
      const tGeo = new THREE.BufferGeometry().setFromPoints(tl);
      const pointsMat = new THREE.PointsMaterial({
        color: 0xbafcff,
        size: 0.12,
        transparent: true,
        blending: add,
        depthWrite: false,
      });
      if (tex) pointsMat.map = tex;
      root.add(new THREE.Points(tGeo, pointsMat));

      // Stacked die layers
      const layers: THREE.Group[] = [];
      for (let i = 0; i < 4; i++) {
        const g = new THREE.Group();
        const s = 2.6 - i * 0.42;
        const geo = new THREE.BoxGeometry(s, 0.14, s);
        g.add(
          new THREE.Mesh(
            geo,
            new THREE.MeshBasicMaterial({
              color: i % 2 ? VI : BL,
              transparent: true,
              opacity: 0.2,
              blending: add,
              depthWrite: false,
            })
          )
        );
        g.add(
          new THREE.LineSegments(
            new THREE.EdgesGeometry(geo),
            new THREE.LineBasicMaterial({ color: i === 3 ? 0xa5f3fc : CY })
          )
        );
        root.add(g);
        layers.push(g);
      }

      // Processor core and glowing beam
      const core = new THREE.Mesh(
        new THREE.IcosahedronGeometry(0.3, 2),
        new THREE.MeshBasicMaterial({ color: new THREE.Color(0.6, 2.4, 3) })
      );
      const cage = new THREE.Mesh(
        new THREE.IcosahedronGeometry(0.55, 1),
        new THREE.MeshBasicMaterial({
          color: CY,
          wireframe: true,
          transparent: true,
          opacity: 0.6,
          blending: add,
        })
      );
      const spriteMat = new THREE.SpriteMaterial({
        color: 0x67e8f9,
        blending: add,
        depthWrite: false,
        transparent: true,
      });
      if (tex) spriteMat.map = tex;
      const glow = new THREE.Sprite(spriteMat);

      const beam = new THREE.Mesh(
        new THREE.CylinderGeometry(0.04, 0.55, 7, 24, 1, true),
        new THREE.MeshBasicMaterial({
          color: CY,
          transparent: true,
          opacity: 0.1,
          blending: add,
          depthWrite: false,
          side: THREE.DoubleSide,
        })
      );
      beam.position.y = 3.2;
      root.add(core, cage, glow, beam);

      // Energy waves
      const waves: { c: THREE.CatmullRomCurve3; m: THREE.ShaderMaterial; mesh: THREE.Mesh }[] = [];
      for (let k = 0; k < (mobile ? 4 : 7); k++) {
        const pp: THREE.Vector3[] = [];
        const rad = 2.9 + k * 0.3;
        for (let j = 0; j < 14; j++) {
          const a = (j / 14) * Math.PI * 2;
          pp.push(
            new THREE.Vector3(
              Math.cos(a) * rad,
              Math.sin(a * 2 + k * 1.3) * (0.4 + k * 0.12),
              Math.sin(a) * rad
            )
          );
        }
        const c = new THREE.CatmullRomCurve3(pp, true);
        const m = waveMat(k % 2 ? 0xa855f7 : VI, k % 3 ? 0x67e8f9 : 0xf0abfc, k * 1.7);
        const mesh = new THREE.Mesh(new THREE.TubeGeometry(c, 160, 0.028, 6, true), m);
        mesh.rotation.set(k * 0.45, k * 0.9, k * 0.18);
        root.add(mesh);
        waves.push({ c, m, mesh });
      }

      // Floor grid & dust particles
      const grid = new THREE.GridHelper(40, 80, BL, 0x1e1b4b);
      grid.position.y = -2.4;
      (grid.material as THREE.Material).transparent = true;
      (grid.material as THREE.Material).opacity = 0.45;
      scene.add(grid);

      const pc = mobile ? 200 : 700;
      const pa = new Float32Array(pc * 3);
      for (let i = 0; i < pc * 3; i++) pa[i] = (Math.random() - 0.5) * 24;
      const dustMat = new THREE.PointsMaterial({
        color: 0x93c5fd,
        size: 0.07,
        transparent: true,
        opacity: 0.8,
        blending: add,
        depthWrite: false,
      });
      if (tex) dustMat.map = tex;
      const dust = new THREE.Points(
        new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(pa, 3)),
        dustMat
      );
      scene.add(dust);

      // Postprocessing EffectComposer with Bloom
      comp = new EffectComposer(r);
      comp.addPass(new RenderPass(scene, cam));
      const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.9, 0.7, 0.18);
      comp.addPass(bloom);
      comp.addPass(new OutputPass());

      const resize = () => {
        if (!el || !r || !comp) return;
        const w = el.clientWidth || window.innerWidth || 1;
        const h = el.clientHeight || window.innerHeight || 1;
        r.setSize(w, h);
        comp.setSize(w, h);
        cam.aspect = w / h;
        cam.updateProjectionMatrix();
      };
      resize();

      ro = new ResizeObserver(resize);
      ro.observe(el);

      let visible = true;
      io = new IntersectionObserver(([e]) => {
        visible = e.isIntersecting;
      });
      io.observe(el);

      const mouse = { x: 0, y: 0 };
      const onMove = (e: PointerEvent) => {
        mouse.x = e.clientX / window.innerWidth - 0.5;
        mouse.y = e.clientY / window.innerHeight - 0.5;
      };
      if (!mobile) window.addEventListener('pointermove', onMove);

      const clock = new THREE.Clock();
      const tmp = new THREE.Vector3();
      let t = 0;
      let s = 0;

      const loop = () => {
        raf = requestAnimationFrame(loop);
        if (!visible || document.hidden) return;
        const dt = Math.min(clock.getDelta(), 0.05);
        const m = reduce ? 0 : 1;
        s += ((surgeRef.current ? 1 : 0) - s) * 0.05;
        t += dt * m * (1 + s * 5);

        root.rotation.y = t * 0.22 + mouse.x * 0.6;
        layers.forEach((g, i) => {
          g.position.y = (i - 1.2) * (0.3 + 0.07 * Math.sin(t * 0.9 + i) + s * 0.3);
        });

        const pulse = 1 + 0.15 * Math.sin(t * 3.2) + s * 1.4;
        core.scale.setScalar(pulse);
        cage.scale.setScalar(1 + 0.1 * Math.sin(t * 2) + s);
        cage.rotation.y = t;
        cage.rotation.x = t * 0.7;
        glow.scale.setScalar(2.2 * pulse + s * 4);
        glow.position.y = 0.1;
        (glow.material as THREE.SpriteMaterial).opacity = 0.75 + 0.25 * Math.sin(t * 3);
        beam.scale.set(1 + s * 2, 1, 1 + s * 2);

        waves.forEach((w, k) => {
          w.m.uniforms.uT.value = t * (1 + k * 0.08);
          w.m.uniforms.uA.value = 0.8 + 0.3 * Math.sin(t * 1.3 + k) + s * 1.2;
          w.mesh.rotation.y += dt * m * 0.05 * (k % 2 ? 1 : -1);
        });

        const a = tGeo.getAttribute('position') as THREE.BufferAttribute;
        paths.forEach((p, i) => {
          p.getPoint((t * 0.35 + i * 0.137) % 1, tmp);
          a.setXYZ(i, tmp.x, tmp.y, tmp.z);
        });
        a.needsUpdate = true;

        dust.rotation.y = t * 0.02;
        dust.position.y = Math.sin(t * 0.2) * 0.2;
        bloom.strength = 0.9 + 0.15 * Math.sin(t * 2) + s * 1.8;

        cam.position.x += (base.x + mouse.x * 2.4 - cam.position.x) * 0.04;
        cam.position.y += (base.y - mouse.y * 1.6 - cam.position.y) * 0.04;
        cam.position.z = base.z - s * 3 + (reduce ? 0 : Math.sin(t * 0.3) * 0.35);
        cam.lookAt(root.position.x * 0.6, 0, 0);

        try {
          comp?.render();
        } catch {
          // If a frame fails to render, stop loop safely
          cancelAnimationFrame(raf);
          setOk(false);
        }
      };

      loop();

      return () => {
        cancelAnimationFrame(raf);
        ro?.disconnect();
        io?.disconnect();
        if (!mobile) window.removeEventListener('pointermove', onMove);
        try {
          scene.traverse((o) => {
            const m = o as THREE.Mesh;
            m.geometry?.dispose();
            const mt = m.material as THREE.Material | THREE.Material[] | undefined;
            (Array.isArray(mt) ? mt : mt ? [mt] : []).forEach((x) => x?.dispose?.());
          });
          tex?.dispose?.();
          comp?.dispose?.();
          r?.dispose?.();
          r?.domElement?.remove();
        } catch {
          /* ignore cleanup errors */
        }
      };
    } catch (err) {
      console.warn('ThreeDScene initialization caught error:', err);
      setOk(false);
      cancelAnimationFrame(raf);
      return () => {
        ro?.disconnect();
        io?.disconnect();
      };
    }
  }, [variant]);

  // Graceful futuristic fallback if WebGL is unavailable or fails
  if (!ok) {
    return (
      <div
        aria-hidden
        className="relative flex h-full w-full items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_60%_50%,#5b21b655,transparent_60%),radial-gradient(circle_at_40%_60%,#0891b244,transparent_55%)]"
      >
        <div className="relative flex items-center justify-center">
          <div className="h-64 w-64 rounded-full border border-cyan-400/30 animate-pulse shadow-[0_0_50px_rgba(34,211,238,0.3)]" />
          <div className="absolute h-48 w-48 rounded-2xl border border-violet-500/40 rotate-45 shadow-[0_0_35px_rgba(139,92,246,0.3)]" />
          <div className="absolute flex h-28 w-28 items-center justify-center rounded-lg border-2 border-cyan-300 bg-cyan-950/60 shadow-[0_0_30px_#22d3ee] backdrop-blur-sm">
            <div className="h-12 w-12 rounded bg-cyan-400/80 animate-ping" />
          </div>
        </div>
      </div>
    );
  }

  return <div ref={ref} aria-hidden className="h-full w-full" />;
}
