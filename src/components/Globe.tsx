"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { latLonToXYZ } from "@/lib/geo";
import type { CityGroup } from "@/lib/types";

interface GlobeProps {
  cities: CityGroup[];
  /** City to fly to and highlight. */
  focusSlug?: string | null;
  onSelect?: (slug: string) => void;
  /** Show the floating city name chips. */
  showLabels?: boolean;
  /** Camera distance: smaller = closer. */
  zoom?: number;
  autoRotate?: boolean;
  className?: string;
}

const PIN = 0xe0607e;
const D2R = Math.PI / 180;

const vec = (lat: number, lon: number, r = 1) => new THREE.Vector3(...latLonToXYZ(lat, lon, r));

/* Cute toon-shaded Earth: pastel ocean, matcha land, butter deserts, white poles. */
const earthVertex = /* glsl */ `
varying vec2 vUv; varying vec3 vN; varying vec3 vW;
void main(){
  vUv = uv;
  vN = normalize((modelMatrix * vec4(normal, 0.)).xyz);
  vec4 w = modelMatrix * vec4(position, 1.);
  vW = w.xyz;
  gl_Position = projectionMatrix * viewMatrix * w;
}`;
const earthFragment = /* glsl */ `
uniform sampler2D colourMap; uniform sampler2D waterMap; uniform vec3 sunDir;
varying vec2 vUv; varying vec3 vN; varying vec3 vW;
void main(){
  vec3 n = normalize(vN);
  vec3 v = normalize(cameraPosition - vW);
  float water = texture2D(waterMap, vUv).r;
  float land = 1. - smoothstep(0.35, 0.6, water);
  vec3 day = texture2D(colourMap, vUv).rgb;
  float lat = abs(vUv.y - 0.5) * 2.;
  vec3 ocean = mix(vec3(0.69, 0.86, 0.96), vec3(0.78, 0.91, 0.98), smoothstep(0., 0.9, lat));
  vec3 matcha = vec3(0.62, 0.82, 0.55);
  vec3 butter = vec3(0.99, 0.86, 0.55);
  vec3 peach = vec3(0.99, 0.76, 0.62);
  float dry = smoothstep(0.32, 0.5, day.r - day.b * 0.6);
  vec3 lc = mix(matcha, butter, dry);
  lc = mix(lc, peach, smoothstep(0.55, 0.75, day.r) * dry * 0.6);
  lc = mix(lc, vec3(1., 0.98, 0.96), smoothstep(0.78, 0.86, lat));
  float coast = smoothstep(0.25, 0.5, land) - smoothstep(0.5, 0.85, land);
  vec3 col = mix(ocean, lc, land);
  col = mix(col, vec3(0.42, 0.62, 0.55), coast * 0.55);
  float d = dot(n, sunDir);
  float t = 0.84 + 0.16 * smoothstep(-0.05, 0.25, d);
  t -= 0.07 * (1. - smoothstep(-0.6, -0.2, d));
  col *= t;
  float rim = pow(1. - max(dot(n, v), 0.), 2.5);
  col = mix(col, vec3(1., 0.97, 0.94), rim * 0.55);
  gl_FragColor = vec4(col, 1.);
}`;

interface CityObj {
  city: CityGroup;
  pin: THREE.Group;
  head: THREE.Mesh;
  ring: THREE.Mesh;
  label: HTMLButtonElement;
  born: number;
  pop: number;
}

interface Engine {
  setCities: (cities: CityGroup[]) => void;
  flyTo: (slug: string | null) => void;
  setShowLabels: (show: boolean) => void;
  dispose: () => void;
}

export default function Globe({
  cities,
  focusSlug = null,
  onSelect,
  showLabels = true,
  zoom = 4.6,
  autoRotate = true,
  className = "",
}: GlobeProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<Engine | null>(null);
  const onSelectRef = useRef(onSelect);
  const [failed, setFailed] = useState(false);
  const [hint, setHint] = useState(true);

  onSelectRef.current = onSelect;

  useEffect(() => {
    const wrap = wrapRef.current;
    const labelLayer = labelRef.current;
    if (!wrap || !labelLayer) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch {
      setFailed(true);
      return;
    }
    THREE.ColorManagement.enabled = false;
    renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor(0x000000, 0);
    wrap.prepend(renderer.domElement);
    renderer.domElement.style.display = "block";
    renderer.domElement.style.touchAction = "none";

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
    camera.position.set(0, 0, zoom);

    const sunDir = new THREE.Vector3(-0.55, 0.6, 0.85).normalize();
    // three.js r155+ uses physical light units, so scale the classic values by PI.
    scene.add(new THREE.AmbientLight(0xffffff, 0.8 * Math.PI));
    const dl = new THREE.DirectionalLight(0xffffff, 0.42 * Math.PI);
    dl.position.copy(sunDir).multiplyScalar(5);
    scene.add(dl);

    const globe = new THREE.Group();
    scene.add(globe);

    const blank = new THREE.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1);
    blank.needsUpdate = true;
    const earthMat = new THREE.ShaderMaterial({
      uniforms: { colourMap: { value: blank }, waterMap: { value: blank }, sunDir: { value: sunDir } },
      vertexShader: earthVertex,
      fragmentShader: earthFragment,
    });
    const loader = new THREE.TextureLoader();
    const aniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    loader.load("/textures/earth-colour.jpg", (t) => {
      t.anisotropy = aniso;
      earthMat.uniforms.colourMap.value = t;
    });
    loader.load("/textures/water-mask.jpg", (t) => {
      t.anisotropy = aniso;
      earthMat.uniforms.waterMap.value = t;
    });
    const earth = new THREE.Mesh(new THREE.SphereGeometry(1, 128, 128), earthMat);
    globe.add(earth);

    // Puffy clouds that orbit on their own.
    const clouds = new THREE.Group();
    scene.add(clouds);
    const cloudMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
    const puff = new THREE.SphereGeometry(1, 20, 20);
    [
      [35, -20], [-25, 40], [50, 120], [-40, 160], [15, -140], [-10, -70], [60, 30], [5, 95],
    ].forEach(([lat, lon]) => {
      const g = new THREE.Group();
      [[0, 0, 0, 0.07], [0.07, 0.012, 0, 0.055], [-0.065, 0, 0.01, 0.05], [0.02, 0.042, 0, 0.052], [-0.03, 0.028, 0.02, 0.042]].forEach(
        ([x, y, z, r]) => {
          const m = new THREE.Mesh(puff, cloudMat);
          m.position.set(x, y, z);
          m.scale.setScalar(r);
          g.add(m);
        },
      );
      const p = vec(lat, lon, 1.24);
      g.position.copy(p);
      g.lookAt(p.clone().multiplyScalar(2));
      clouds.add(g);
    });

    // Pins and labels.
    const pinMat = new THREE.MeshLambertMaterial({ color: PIN });
    const shineMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const headGeo = new THREE.SphereGeometry(0.034, 24, 24);
    const coneGeo = new THREE.ConeGeometry(0.031, 0.07, 24);
    const shineGeo = new THREE.SphereGeometry(0.011, 12, 12);
    const ringGeo = new THREE.RingGeometry(0.02, 0.032, 32);
    let objs: CityObj[] = [];
    let labelsOn = showLabels;
    let activeSlug: string | null = null;
    let clock = 0;

    function buildPin(city: CityGroup, index: number, existing?: CityObj): CityObj {
      if (existing) {
        existing.city = city;
        updateLabel(existing);
        placePin(existing);
        return existing;
      }
      const pin = new THREE.Group();
      const cone = new THREE.Mesh(coneGeo, pinMat);
      cone.rotation.x = Math.PI;
      cone.position.y = 0.035;
      const head = new THREE.Mesh(headGeo, pinMat);
      head.position.y = 0.085;
      const shine = new THREE.Mesh(shineGeo, shineMat);
      shine.position.set(-0.012, 0.012, 0.026);
      head.add(shine);
      const ring = new THREE.Mesh(
        ringGeo,
        new THREE.MeshBasicMaterial({ color: PIN, transparent: true, opacity: 0.5, side: THREE.DoubleSide, depthWrite: false }),
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.002;
      pin.add(cone, head, ring);
      head.userData.slug = city.slug;
      globe.add(pin);

      const label = document.createElement("button");
      label.type = "button";
      label.className =
        "globe-label pointer-events-auto absolute left-0 top-0 flex items-center gap-1.5 whitespace-nowrap rounded-full bg-paper py-1.5 pl-2.5 pr-2 text-[13px] font-extrabold text-ink shadow-[0_6px_16px_rgba(74,47,39,.16)] transition-opacity duration-300 focus-visible:outline-3 focus-visible:outline-berry-deep";
      label.addEventListener("click", (e) => {
        e.stopPropagation();
        onSelectRef.current?.(obj.city.slug);
      });
      labelLayer!.appendChild(label);
      const obj: CityObj = { city, pin, head, ring, label, born: clock + index * 0.15, pop: 0 };
      updateLabel(obj);
      placePin(obj);
      return obj;
    }

    function updateLabel(o: CityObj) {
      const n = o.city.cafes.length;
      o.label.innerHTML = "";
      const nameEl = document.createElement("span");
      nameEl.textContent = o.city.city;
      const count = document.createElement("span");
      count.className = "inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-berry px-1.5 text-[11.5px] text-ink";
      count.textContent = String(n);
      o.label.append(nameEl, count);
      o.label.setAttribute("aria-label", `${o.city.city}, ${n} ${n === 1 ? "cafe" : "cafes"}`);
    }

    function placePin(o: CityObj) {
      const p = vec(o.city.lat, o.city.lon, 1);
      o.pin.position.copy(p);
      o.pin.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), p.clone().normalize());
      o.head.userData.slug = o.city.slug;
      o.pin.userData.size = 1 + Math.min(o.city.cafes.length, 10) * 0.05;
    }

    function setCities(list: CityGroup[]) {
      const bySlug = new Map(objs.map((o) => [o.city.slug, o]));
      const next: CityObj[] = [];
      list.forEach((c, i) => {
        const existing = bySlug.get(c.slug);
        const grew = existing && c.cafes.length > existing.city.cafes.length;
        const o = buildPin(c, objs.length ? 0 : i, existing);
        if (grew) o.pop = 1;
        if (!existing && objs.length) o.pop = 1;
        bySlug.delete(c.slug);
        next.push(o);
      });
      for (const gone of bySlug.values()) {
        globe.remove(gone.pin);
        gone.label.remove();
      }
      objs = next;
    }

    // ---- interaction ----
    let yaw = 0;
    let pitch = 0.3;
    {
      const home = vec(15, 80);
      yaw = -Math.atan2(home.x, home.z);
    }
    let vy = 0;
    let vp = 0;
    let targetZ = zoom;
    let focus: { yaw: number; pitch: number } | null = null;
    let dragging = false;
    let moved = 0;
    let lastX = 0;
    let lastY = 0;
    let idle = 0;
    const pointers = new Map<number, { x: number; y: number }>();
    let pinchStart = 0;
    let pinchZ = 0;
    const clampP = (p: number) => Math.max(-1.2, Math.min(1.2, p));
    const clampZ = (z: number) => Math.max(2.4, Math.min(7.5, z));
    const canvas = renderer.domElement;

    const onDown = (e: PointerEvent) => {
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      canvas.setPointerCapture(e.pointerId);
      if (pointers.size === 2) {
        const [a, b] = [...pointers.values()];
        pinchStart = Math.hypot(a.x - b.x, a.y - b.y);
        pinchZ = targetZ;
      }
      dragging = true;
      moved = 0;
      lastX = e.clientX;
      lastY = e.clientY;
      focus = null;
      canvas.style.cursor = "grabbing";
    };
    const onMove = (e: PointerEvent) => {
      if (!pointers.has(e.pointerId)) return;
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pointers.size === 2) {
        const [a, b] = [...pointers.values()];
        targetZ = clampZ((pinchZ * pinchStart) / Math.max(Math.hypot(a.x - b.x, a.y - b.y), 1));
        moved += 10;
        setHint(false);
        return;
      }
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      lastX = e.clientX;
      lastY = e.clientY;
      moved += Math.abs(dx) + Math.abs(dy);
      const k = (0.0042 * (camera.position.z - 1)) / 3.6;
      vy = dx * k;
      vp = dy * k;
      yaw += vy;
      pitch = clampP(pitch + vp);
      idle = 0;
      if (moved > 6) setHint(false);
    };
    const onUp = (e: PointerEvent) => {
      pointers.delete(e.pointerId);
      if (pointers.size === 0) {
        dragging = false;
        canvas.style.cursor = "grab";
        if (moved < 6) pick(e.clientX, e.clientY);
      }
    };
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      targetZ = clampZ(targetZ + e.deltaY * 0.002);
      setHint(false);
    };
    canvas.style.cursor = "grab";
    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerup", onUp);
    canvas.addEventListener("pointercancel", onUp);
    canvas.addEventListener("wheel", onWheel, { passive: false });

    const ray = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    function pick(x: number, y: number) {
      const r = canvas.getBoundingClientRect();
      ndc.set(((x - r.left) / r.width) * 2 - 1, -((y - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(ndc, camera);
      const hits = ray.intersectObjects(objs.map((o) => o.head), false);
      const slug = hits[0]?.object.userData.slug as string | undefined;
      if (slug) onSelectRef.current?.(slug);
    }

    function flyTo(slug: string | null) {
      activeSlug = slug;
      const o = objs.find((x) => x.city.slug === slug);
      if (!o) return;
      const v = vec(o.city.lat, o.city.lon);
      const ty = -Math.atan2(v.x, v.z);
      const tp = clampP(o.city.lat * D2R);
      const diff = ((((ty - yaw) % (Math.PI * 2)) + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
      focus = { yaw: yaw + diff, pitch: tp };
      if (reduced) {
        yaw = focus.yaw;
        pitch = focus.pitch;
        focus = null;
      }
      o.pop = 1;
    }

    // ---- sizing ----
    let w = 1;
    let h = 1;
    const resize = () => {
      w = Math.max(1, wrap.clientWidth);
      h = Math.max(1, wrap.clientHeight);
      renderer.setSize(w, h, false);
      renderer.domElement.style.width = `${w}px`;
      renderer.domElement.style.height = `${h}px`;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);
    resize();

    // ---- loop ----
    const easeOutBack = (x: number) => 1 + 2.70158 * Math.pow(x - 1, 3) + 1.70158 * Math.pow(x - 1, 2);
    const tmp = new THREE.Vector3();
    const camDir = new THREE.Vector3();
    let raf = 0;
    let last = performance.now();
    let visible = true;
    const io = new IntersectionObserver(([entry]) => (visible = entry.isIntersecting));
    io.observe(wrap);

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (!visible) return;
      clock += dt;
      if (!dragging) {
        if (focus) {
          yaw += (focus.yaw - yaw) * 0.08;
          pitch += (focus.pitch - pitch) * 0.08;
          if (Math.abs(focus.yaw - yaw) < 0.001 && Math.abs(focus.pitch - pitch) < 0.001) focus = null;
        } else {
          yaw += vy;
          pitch = clampP(pitch + vp);
          vy *= 0.94;
          vp *= 0.94;
          idle += dt;
          if (autoRotate && !reduced && !activeSlug && idle > 2.5) yaw += 0.07 * dt;
        }
      }
      camera.position.z += (targetZ - camera.position.z) * 0.08;
      globe.rotation.set(pitch, yaw, 0);
      clouds.rotation.set(pitch * 0.6, yaw + (reduced ? 0 : clock * 0.05), 0);
      globe.updateMatrixWorld();
      camDir.copy(camera.position).normalize();

      for (const o of objs) {
        const age = clock - o.born;
        const intro = reduced ? 1 : Math.min(1, Math.max(0, (age - 0.3) / 0.6));
        let s = intro > 0 ? easeOutBack(intro) : 0.001;
        if (o.pop > 0) {
          o.pop = Math.max(0, o.pop - dt * 1.6);
          s *= 1 + 0.45 * Math.sin(o.pop * Math.PI);
        }
        o.pin.scale.setScalar(Math.max(0.001, s * (o.pin.userData.size as number)));
        o.head.position.y = 0.085 + (reduced ? 0 : Math.sin(clock * 2.2 + o.city.lat) * 0.006);
        const ph = (clock * 0.7 + o.city.lon * 0.01) % 1;
        o.ring.scale.setScalar(1 + ph * 1.8);
        (o.ring.material as THREE.MeshBasicMaterial).opacity = 0.5 * (1 - ph);

        o.head.getWorldPosition(tmp);
        const facing = tmp.clone().normalize().dot(camDir);
        tmp.project(camera);
        const x = (tmp.x * 0.5 + 0.5) * w;
        const y = (-tmp.y * 0.5 + 0.5) * h;
        const hidden = !labelsOn || facing < 0.2 || intro < 1;
        const lw = o.label.offsetWidth || 90;
        const lx = x + 12 + lw > w - 4 ? x - 12 - lw : x + 12;
        o.label.style.transform = `translate(${Math.round(lx)}px, ${Math.round(y - 34)}px)`;
        o.label.style.opacity = hidden ? "0" : "1";
        o.label.style.pointerEvents = hidden ? "none" : "auto";
        o.label.tabIndex = hidden ? -1 : 0;
        const active = o.city.slug === activeSlug;
        o.label.classList.toggle("bg-ink", active);
        o.label.classList.toggle("text-cream", active);
        o.label.classList.toggle("bg-paper", !active);
        o.label.classList.toggle("text-ink", !active);
      }
      // Hide labels that would overlap a busier city's label (the active one always shows).
      const placed: { x: number; y: number; w: number }[] = [];
      [...objs]
        .sort((a, b) => Number(b.city.slug === activeSlug) - Number(a.city.slug === activeSlug) || b.city.cafes.length - a.city.cafes.length)
        .forEach((o) => {
          if (o.label.style.opacity === "0") return;
          const m = /translate\((-?\d+)px, (-?\d+)px\)/.exec(o.label.style.transform);
          if (!m) return;
          const x = Number(m[1]);
          const y = Number(m[2]);
          const lw = o.label.offsetWidth || 90;
          const clash = placed.some((p) => x < p.x + p.w + 4 && p.x < x + lw + 4 && Math.abs(p.y - y) < 30);
          if (clash) {
            o.label.style.opacity = "0";
            o.label.style.pointerEvents = "none";
            o.label.tabIndex = -1;
          } else placed.push({ x, y, w: lw });
        });
      renderer.render(scene, camera);
    };
    raf = requestAnimationFrame(frame);

    engineRef.current = {
      setCities,
      flyTo,
      setShowLabels: (s) => (labelsOn = s),
      dispose: () => {
        cancelAnimationFrame(raf);
        ro.disconnect();
        io.disconnect();
        canvas.removeEventListener("pointerdown", onDown);
        canvas.removeEventListener("pointermove", onMove);
        canvas.removeEventListener("pointerup", onUp);
        canvas.removeEventListener("pointercancel", onUp);
        canvas.removeEventListener("wheel", onWheel);
        objs.forEach((o) => o.label.remove());
        scene.traverse((obj) => {
          const m = obj as THREE.Mesh;
          m.geometry?.dispose?.();
        });
        renderer.dispose();
        canvas.remove();
      },
    };
    return () => {
      engineRef.current?.dispose();
      engineRef.current = null;
    };
    // The engine is created once; later prop changes go through the effects below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    engineRef.current?.setCities(cities);
    if (focusSlug) engineRef.current?.flyTo(focusSlug);
  }, [cities, focusSlug]);

  useEffect(() => {
    engineRef.current?.setShowLabels(showLabels);
  }, [showLabels]);

  const total = cities.reduce((n, c) => n + c.cafes.length, 0);

  return (
    <div className={className || "relative h-full w-full"}>
      <div
        ref={wrapRef}
        className="absolute inset-0"
        role="img"
        aria-label={`Your globe: ${total} cafes in ${cities.length} cities. Drag to spin, scroll or pinch to zoom.`}
      />
      <div ref={labelRef} className="pointer-events-none absolute inset-0 overflow-hidden" />
      {failed && (
        <div className="absolute inset-0 flex items-center justify-center p-6 text-center font-bold text-sub">
          Your browser couldn&apos;t show the 3D globe. Your cafes are still listed in the journal.
        </div>
      )}
      {hint && !failed && (
        <div className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-ink/85 px-4 py-2 text-[13px] font-bold text-cream">
          Drag to spin · Scroll or pinch to zoom · Tap a pin
        </div>
      )}
    </div>
  );
}
