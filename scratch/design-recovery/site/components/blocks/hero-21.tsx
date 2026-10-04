"use client";

import { ArrowRight, Play } from "lucide-react";
import { motion, useReducedMotion, type Variants } from "motion/react";
import { useEffect, useRef } from "react";
import * as THREE from "three";

const auroraVertexShader = `
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

const auroraFragmentShader = `
  precision highp float;

  varying vec2 vUv;
  uniform vec2 uResolution;
  uniform float uTime;
  uniform float uTheme;

  vec3 mod289(vec3 x) {
    return x - floor(x * (1.0 / 289.0)) * 289.0;
  }

  vec4 mod289(vec4 x) {
    return x - floor(x * (1.0 / 289.0)) * 289.0;
  }

  vec4 permute(vec4 x) {
    return mod289(((x * 34.0) + 10.0) * x);
  }

  vec4 taylorInvSqrt(vec4 r) {
    return 1.79284291400159 - 0.85373472095314 * r;
  }

  float snoise(vec3 v) {
    const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
    const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);

    vec3 i = floor(v + dot(v, C.yyy));
    vec3 x0 = v - i + dot(i, C.xxx);

    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min(g.xyz, l.zxy);
    vec3 i2 = max(g.xyz, l.zxy);

    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy;
    vec3 x3 = x0 - D.yyy;

    i = mod289(i);
    vec4 p = permute(permute(permute(
      i.z + vec4(0.0, i1.z, i2.z, 1.0))
      + i.y + vec4(0.0, i1.y, i2.y, 1.0))
      + i.x + vec4(0.0, i1.x, i2.x, 1.0));

    float n_ = 0.142857142857;
    vec3 ns = n_ * D.wyz - D.xzx;

    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_);

    vec4 x = x_ * ns.x + ns.yyyy;
    vec4 y = y_ * ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);

    vec4 b0 = vec4(x.xy, y.xy);
    vec4 b1 = vec4(x.zw, y.zw);

    vec4 s0 = floor(b0) * 2.0 + 1.0;
    vec4 s1 = floor(b1) * 2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));

    vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
    vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;

    vec3 p0 = vec3(a0.xy, h.x);
    vec3 p1 = vec3(a0.zw, h.y);
    vec3 p2 = vec3(a1.xy, h.z);
    vec3 p3 = vec3(a1.zw, h.w);

    vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
    p0 *= norm.x;
    p1 *= norm.y;
    p2 *= norm.z;
    p3 *= norm.w;

    vec4 m = max(0.6 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
    m = m * m;
    return 42.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
  }

  float fbm(vec3 p) {
    float value = 0.0;
    float amplitude = 0.5;
    for (int i = 0; i < 5; i++) {
      value += amplitude * snoise(p);
      p = p * 2.03 + vec3(13.7, 7.3, 3.1);
      amplitude *= 0.5;
    }
    return value;
  }

  float grain(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
  }

  void main() {
    vec2 aspect = vec2(uResolution.x / max(uResolution.y, 1.0), 1.0);
    vec2 p = (vUv - 0.5) * aspect;
    float t = uTime * 0.05;

    vec2 flow = p;
    flow.x += sin(flow.y * 2.1 + t * 1.3) * 0.17;
    flow.y += cos(flow.x * 2.5 - t * 1.1) * 0.12;

    float cloud = fbm(vec3(flow * 1.4, t * 0.8));
    float veil = fbm(vec3(flow * 2.3 + vec2(cloud * 0.2, -cloud * 0.14), t * 0.6 + 4.0));
    float ribbon = sin((flow.y + cloud * 0.38) * 6.4 + flow.x * 2.4 - uTime * 0.2);
    float aurora = smoothstep(0.06, 0.9, ribbon * 0.5 + 0.5) * smoothstep(-0.3, 0.8, veil);
    float drift = smoothstep(0.08, 0.82, cloud * 0.5 + 0.5);
    float glowCore = pow(smoothstep(0.92, 0.06, length(p + vec2(0.0, 0.08))), 2.6);
    float vign = smoothstep(1.18, 0.24, length(p * vec2(0.86, 1.22)));

    vec3 darkColor = vec3(0.014, 0.016, 0.026);
    darkColor += vec3(0.30, 0.19, 0.54) * aurora * 0.38 * vign;
    darkColor += vec3(0.09, 0.40, 0.48) * drift * 0.2 * vign;
    darkColor += vec3(0.74, 0.77, 0.9) * glowCore * 0.12;
    darkColor *= 0.5 + vign * 0.68;

    vec3 lightColor = vec3(0.976, 0.976, 0.985);
    lightColor = mix(lightColor, vec3(0.84, 0.82, 0.94), aurora * 0.4 * vign);
    lightColor = mix(lightColor, vec3(0.83, 0.9, 0.94), drift * 0.32 * vign);
    lightColor = mix(lightColor, vec3(1.0), glowCore * 0.5);

    vec3 color = mix(lightColor, darkColor, uTheme);
    color += (grain(gl_FragCoord.xy) - 0.5) * mix(0.007, 0.02, uTheme);

    gl_FragColor = vec4(color, 1.0);
  }
`;

const container: Variants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.1, delayChildren: 0.1 },
  },
};

const item: Variants = {
  hidden: { opacity: 0, y: 18 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.65, ease: [0.22, 1, 0.36, 1] },
  },
};

const headline: Variants = {
  hidden: { opacity: 0, y: 26, filter: "blur(10px)" },
  show: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] },
  },
};

const orb: Variants = {
  hidden: { opacity: 0, scale: 0.8, filter: "blur(12px)" },
  show: {
    opacity: 1,
    scale: 1,
    filter: "blur(0px)",
    transition: { duration: 0.9, ease: [0.22, 1, 0.36, 1] },
  },
};

function AuroraField() {
  const containerRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const geometry = new THREE.PlaneGeometry(2, 2);
    const material = new THREE.ShaderMaterial({
      vertexShader: auroraVertexShader,
      fragmentShader: auroraFragmentShader,
      uniforms: {
        uResolution: { value: new THREE.Vector2(1, 1) },
        uTime: { value: 0 },
        uTheme: { value: 1 },
      },
      depthWrite: false,
      depthTest: false,
    });
    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: false,
        powerPreference: "high-performance",
      });
    } catch {
      geometry.dispose();
      material.dispose();
      return;
    }

    renderer.domElement.className = "absolute inset-0 h-full w-full";
    container.appendChild(renderer.domElement);

    const query = window.matchMedia("(prefers-color-scheme: dark)");
    const readTheme = () => {
      const classes = document.documentElement.classList;
      if (classes.contains("dark")) return 1;
      if (classes.contains("light")) return 0;
      return query.matches ? 1 : 0;
    };

    let themeTarget = readTheme();
    material.uniforms.uTheme.value = themeTarget;

    const clock = new THREE.Clock();
    const staticTime = 26;
    let frame = 0;

    const renderFrame = () => {
      material.uniforms.uTime.value = reduceMotion
        ? staticTime
        : clock.getElapsedTime();
      const current = material.uniforms.uTheme.value as number;
      material.uniforms.uTheme.value = reduceMotion
        ? themeTarget
        : current + (themeTarget - current) * 0.06;
      renderer.render(scene, camera);
    };

    const loop = () => {
      renderFrame();
      frame = requestAnimationFrame(loop);
    };

    const resize = () => {
      const rect = container.getBoundingClientRect();
      const width = Math.max(1, rect.width);
      const height = Math.max(1, rect.height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.setSize(width, height, false);
      material.uniforms.uResolution.value.set(width, height);
      renderFrame();
    };

    const handleThemeChange = () => {
      themeTarget = readTheme();
      if (reduceMotion) renderFrame();
    };

    const mutationObserver = new MutationObserver(handleThemeChange);
    mutationObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    query.addEventListener("change", handleThemeChange);

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(container);
    resize();

    if (!reduceMotion) {
      frame = requestAnimationFrame(loop);
    }

    return () => {
      cancelAnimationFrame(frame);
      mutationObserver.disconnect();
      query.removeEventListener("change", handleThemeChange);
      resizeObserver.disconnect();
      scene.remove(mesh);
      geometry.dispose();
      material.dispose();
      renderer.dispose();
      if (renderer.domElement.parentElement === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [reduceMotion]);

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0"
    />
  );
}

export function Hero21() {
  const reduceMotion = useReducedMotion();

  return (
    <section className="relative flex min-h-screen w-full items-start overflow-hidden bg-white px-4 py-16 dark:bg-neutral-950 sm:px-6 sm:py-20 lg:items-center lg:px-8">
      <AuroraField />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_52%_46%_at_50%_48%,rgba(255,255,255,0.72),rgba(255,255,255,0)_100%),linear-gradient(to_bottom,rgba(255,255,255,0)_58%,rgba(255,255,255,0.8))] dark:hidden"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 hidden bg-[radial-gradient(ellipse_78%_66%_at_50%_50%,rgba(5,6,12,0)_32%,rgba(5,6,12,0.58)_100%),linear-gradient(to_bottom,rgba(5,6,12,0.08)_52%,rgba(5,6,12,0.82))] dark:block"
      />

      <motion.div
        variants={container}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-80px" }}
        className="relative z-10 mx-auto flex w-full max-w-[1400px] flex-col items-center text-center"
      >
        <motion.div variants={orb} className="relative h-24 w-24">
          <div
            aria-hidden="true"
            className="absolute -inset-8 rounded-full bg-indigo-300/40 blur-2xl dark:bg-indigo-400/25"
          />
          <motion.div
            aria-hidden="true"
            className="absolute inset-0 rounded-full bg-[conic-gradient(from_120deg,#c7d2fe,#f5d0fe,#a5f3fc,#c7d2fe)] blur-[6px]"
            animate={
              reduceMotion ? undefined : { rotate: 360, scale: [1, 1.05, 1] }
            }
            transition={{
              rotate: { duration: 26, repeat: Infinity, ease: "linear" },
              scale: { duration: 5, repeat: Infinity, ease: "easeInOut" },
            }}
          />
          <div className="absolute inset-[13px] rounded-full border border-white/70 bg-white/85 backdrop-blur-sm dark:border-white/10 dark:bg-neutral-950/85" />
          <div className="absolute left-1/2 top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-neutral-950 dark:bg-white" />
        </motion.div>

        <motion.p
          variants={item}
          className="mt-6 text-sm font-medium text-neutral-950 dark:text-white"
        >
          Halo Intelligence
        </motion.p>

        <motion.h1
          variants={headline}
          className="mt-5 max-w-4xl text-4xl font-medium leading-[1.02] tracking-[-0.04em] text-neutral-950 dark:text-white sm:text-6xl md:text-7xl"
        >
          One calm intelligence
          <br />
          <span className="text-neutral-500 dark:text-neutral-400">
            across every tool.
          </span>
        </motion.h1>

        <motion.p
          variants={item}
          className="mt-6 max-w-xl text-base leading-relaxed text-neutral-600 dark:text-neutral-300 sm:text-lg"
        >
          Halo reads context from mail, docs, and tickets, then quietly preps
          the next step so nobody chases status again.
        </motion.p>

        <motion.div
          variants={item}
          className="mt-10 flex w-full flex-col gap-3 sm:w-auto sm:flex-row"
        >
          <button className="inline-flex w-full cursor-pointer items-center justify-center rounded-full bg-neutral-950 px-6 py-3 text-sm font-medium text-white transition-colors duration-200 hover:bg-neutral-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:bg-white dark:text-neutral-950 dark:hover:bg-neutral-200 dark:focus-visible:ring-neutral-400 dark:focus-visible:ring-offset-neutral-950 sm:w-auto sm:px-8 sm:py-3.5 sm:text-base">
            Try Halo today
            <ArrowRight className="ml-2 h-4 w-4" />
          </button>
          <button className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-full border border-neutral-300 bg-white/60 px-6 py-3 text-sm font-medium text-neutral-900 backdrop-blur transition-colors duration-200 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:border-white/20 dark:bg-white/5 dark:text-white dark:hover:bg-white/10 dark:focus-visible:ring-neutral-400 dark:focus-visible:ring-offset-neutral-950 sm:w-auto sm:px-8 sm:py-3.5 sm:text-base">
            <Play className="h-4 w-4 fill-current" />
            Watch it work
          </button>
        </motion.div>

        <motion.p
          variants={item}
          className="mt-8 text-xs text-neutral-500 dark:text-neutral-400"
        >
          Free for teams of five · No credit card required
        </motion.p>
      </motion.div>
    </section>
  );
}

export default Hero21;
