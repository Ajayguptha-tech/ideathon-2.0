import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

export type SceneKind = 'nodes' | 'path' | 'stages' | 'podium' | 'poster';
const add = THREE.AdditiveBlending;
const bm = (c: number, o = 1) =>
  new THREE.MeshBasicMaterial({
    color: c,
    transparent: true,
    opacity: o,
    blending: add,
    depthWrite: false,
  });
const lm = (c: number, o = 1) =>
  new THREE.LineBasicMaterial({ color: c, transparent: true, opacity: o, blending: add });
const edges = (g: THREE.BufferGeometry, c: number) =>
  new THREE.LineSegments(new THREE.EdgesGeometry(g), lm(c));

function build(k: SceneKind, grp: THREE.Group): (t: number) => void {
  try {
    if (k === 'nodes') {
      const P = Array.from({ length: 30 }, () =>
        new THREE.Vector3().randomDirection().multiplyScalar(0.6 + Math.random() * 1.7)
      );
      const seg: THREE.Vector3[] = [];
      P.forEach((a, i) =>
        P.forEach((b, j) => {
          if (j > i && a.distanceTo(b) < 1.5) seg.push(a, b);
        })
      );
      grp.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(seg), lm(0x22d3ee, 0.4)));
      P.forEach((p, i) => {
        const m = new THREE.Mesh(
          new THREE.SphereGeometry(0.06 + (i % 4) * 0.02, 12, 12),
          bm(i % 3 ? 0x67e8f9 : 0xa78bfa)
        );
        m.position.copy(p);
        grp.add(m);
      });
      return (t) => {
        grp.rotation.y = t * 0.2;
        grp.rotation.x = Math.sin(t * 0.3) * 0.2;
      };
    }
    if (k === 'path') {
      const c = new THREE.CatmullRomCurve3(
        [
          [-3.4, -1, 0],
          [-1.8, 0.7, 1],
          [0, -0.6, -1],
          [1.8, 0.9, 0.6],
          [3.4, -0.4, 0],
        ].map((v) => new THREE.Vector3(...v))
      );
      grp.add(
        new THREE.Mesh(new THREE.TubeGeometry(c, 100, 0.035, 8), bm(0x22d3ee, 0.8)),
        new THREE.Mesh(new THREE.TubeGeometry(c, 100, 0.12, 8), bm(0x7c3aed, 0.12))
      );
      [0.05, 0.36, 0.66, 0.95].forEach((u) => {
        const m = new THREE.Mesh(new THREE.OctahedronGeometry(0.2), bm(0xf0abfc));
        m.position.copy(c.getPoint(u));
        grp.add(m, Object.assign(edges(new THREE.OctahedronGeometry(0.3), 0x22d3ee), { position: m.position }));
      });
      const dot = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 12), bm(0xffffff));
      grp.add(dot);
      return (t) => {
        dot.position.copy(c.getPoint((t * 0.12) % 1));
        grp.rotation.y = Math.sin(t * 0.3) * 0.3;
      };
    }
    if (k === 'stages') {
      const a = new THREE.IcosahedronGeometry(0.9, 1),
        b = new THREE.IcosahedronGeometry(0.9, 1);
      const A = new THREE.Group(),
        B = new THREE.Group();
      A.add(new THREE.Mesh(a, bm(0x2563eb, 0.25)), edges(a, 0x22d3ee));
      B.add(new THREE.Mesh(b, bm(0x7c3aed, 0.25)), edges(b, 0xc084fc));
      A.position.x = -2;
      B.position.x = 2;
      const ring = new THREE.Mesh(new THREE.TorusGeometry(1.3, 0.015, 8, 64), bm(0x67e8f9));
      const ring2 = ring.clone();
      ring.position.x = -2;
      ring2.position.x = 2;
      ring2.material = bm(0xc084fc);
      const link = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-1.1, 0, 0), new THREE.Vector3(1.1, 0, 0)]),
        lm(0xffffff, 0.7)
      );
      const dots = Array.from({ length: 6 }, () => {
        const m = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 8), bm(0xffffff));
        grp.add(m);
        return m;
      });
      grp.add(A, B, ring, ring2, link);
      return (t) => {
        A.rotation.y = t * 0.6;
        B.rotation.y = -t * 0.6;
        ring.rotation.x = t * 0.5;
        ring2.rotation.x = -t * 0.5;
        dots.forEach((d, i) => {
          d.position.x = -1.1 + 2.2 * ((t * 0.3 + i / 6) % 1);
        });
      };
    }
    if (k === 'podium') {
      [
        [-1.4, 1.1, 0xcbd5e1],
        [0, 1.8, 0xfbbf24],
        [1.4, 0.8, 0xfb923c],
      ].forEach(([x, h, c]) => {
        const g = new THREE.BoxGeometry(1.2, h, 1.2),
          m = new THREE.Mesh(g, bm(c, 0.14));
        m.position.set(x, h / 2 - 1, 0);
        const e = edges(g, c);
        e.position.copy(m.position);
        grp.add(m, e);
      });
      const sp = new THREE.Points(
        new THREE.BufferGeometry().setAttribute(
          'position',
          new THREE.BufferAttribute(
            new Float32Array(
              Array.from({ length: 90 }, (_, i) =>
                i % 3 === 1 ? Math.random() * 2.5 + 1 : (Math.random() - 0.5) * 1.2
              )
            ),
            3
          )
        ),
        new THREE.PointsMaterial({ color: 0xfde68a, size: 0.05, transparent: true, blending: add })
      );
      grp.add(sp);
      return (t) => {
        grp.rotation.y = t * 0.35;
        sp.position.y = ((t * 0.3) % 1) * -0.6;
      };
    }

    const pg = new THREE.PlaneGeometry(2.4, 3.4),
      plane = new THREE.Mesh(pg, bm(0x7c3aed, 0.12));
    grp.add(plane, edges(new THREE.BoxGeometry(2.4, 3.4, 0.04), 0xa78bfa));
    for (let i = 0; i < 7; i++) {
      const w = 0.8 + Math.random() * 1.1,
        m = new THREE.Mesh(new THREE.PlaneGeometry(w, 0.1), bm(i % 3 ? 0x22d3ee : 0xc084fc, 0.5));
      m.position.set(-1.1 + w / 2, 1.2 - i * 0.38, 0.03);
      grp.add(m);
    }
    const scan = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 0.05), bm(0xffffff, 0.8));
    grp.add(scan);
    return (t) => {
      scan.position.set(0, Math.sin(t * 0.8) * 1.7, 0.06);
      grp.rotation.y = Math.sin(t * 0.4) * 0.5;
      grp.position.y = Math.sin(t * 0.7) * 0.1;
    };
  } catch {
    return () => {};
  }
}

function Inner({ kind }: { kind: SceneKind }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    let r: THREE.WebGLRenderer | undefined;
    let raf = 0;
    let ro: ResizeObserver | undefined;

    try {
      r = new THREE.WebGLRenderer({ alpha: true, antialias: false, powerPreference: 'low-power' });
      r.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.25));
      el.appendChild(r.domElement);

      const scene = new THREE.Scene(),
        cam = new THREE.PerspectiveCamera(45, 1, 0.1, 50);
      cam.position.set(0, 0.4, 7);
      const grp = new THREE.Group();
      grp.position.x = 0;
      scene.add(grp);
      const upd = build(kind, grp);

      const rs = () => {
        if (!el || !r) return;
        const w = el.clientWidth || 1,
          h = el.clientHeight || 1;
        r.setSize(w, h);
        cam.aspect = w / h;
        cam.updateProjectionMatrix();
        grp.position.x = w > 900 ? 2.6 : 0;
      };
      rs();
      ro = new ResizeObserver(rs);
      ro.observe(el);

      const clk = new THREE.Clock();
      const loop = () => {
        raf = requestAnimationFrame(loop);
        if (document.hidden) return;
        try {
          upd(reduce ? 0 : clk.getElapsedTime());
          r?.render(scene, cam);
        } catch {
          cancelAnimationFrame(raf);
        }
      };
      loop();

      return () => {
        cancelAnimationFrame(raf);
        ro?.disconnect();
        try {
          scene.traverse((o) => {
            const m = o as THREE.Mesh;
            m.geometry?.dispose();
            const mt = m.material as THREE.Material | undefined;
            mt?.dispose?.();
          });
          r?.dispose?.();
          r?.domElement?.remove();
        } catch {
          /* ignore */
        }
      };
    } catch {
      return () => {
        ro?.disconnect();
      };
    }
  }, [kind]);

  return <div ref={ref} className="h-full w-full" />;
}

// Mounts the WebGL scene only while the section is near the viewport.
export default function SectionScene({ kind }: { kind: SceneKind }) {
  const box = useRef<HTMLDivElement>(null);
  const [on, setOn] = useState(false);
  useEffect(() => {
    if (!box.current) return;
    const io = new IntersectionObserver(([e]) => setOn(e.isIntersecting), { rootMargin: '200px' });
    io.observe(box.current);
    return () => io.disconnect();
  }, []);
  return (
    <div ref={box} aria-hidden className="h-full w-full">
      {on && <Inner kind={kind} />}
    </div>
  );
}
