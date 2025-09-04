import { OrbitControls } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";

// -----------------------------
// 🔮 Fractal Iteration Simulator (Julia-style) — react-three-fiber
// -----------------------------
// Hook your math inside algorithmStep if you want to change behavior.
// Each particle: { pos: THREE.Vector3, vel: THREE.Vector3, seed: number }

function algorithmStep(p, t, dt, params) {
  const { scale, attraction, speed } = params;
  const cRe = parseFloat(params.cRe);
  const cIm = parseFloat(params.cIm);

  // Map 3D position -> complex plane
  let x = p.pos.x / scale;
  let y = p.pos.y / scale;

  // Julia iteration: z = z^2 + c
  const xNew = x * x - y * y + cRe;
  const yNew = 2 * x * y + cIm;
  x = xNew;
  y = yNew;

  // Back to 3D with subtle depth animation
  p.pos.x = x * scale;
  p.pos.y = y * scale;
  p.pos.z = Math.sin(t * 0.5 + p.seed) * scale * 0.3;

  // Gentle attraction to origin for clustering/stability
  p.vel.x += -p.pos.x * attraction * dt;
  p.vel.y += -p.pos.y * attraction * dt;
  p.vel.z += -p.pos.z * attraction * dt;

  // Integrate
  p.pos.addScaledVector(p.vel, dt * speed);
  p.vel.multiplyScalar(0.96); // damping
}

function Particles({ count = 1500, params }) {
  const meshRef = useRef();
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const particles = useRef([]);
  const color = new THREE.Color("#a78bfa"); // neon-violet

  // (Re)init particles when count/spawnRadius/resetToken changes
  useEffect(() => {
    const temp = [];
    for (let i = 0; i < count; i++) {
      const pos = new THREE.Vector3(
        (Math.random() - 0.5) * params.spawnRadius * 2,
        (Math.random() - 0.5) * params.spawnRadius * 2,
        (Math.random() - 0.5) * params.spawnRadius * 2
      );
      const vel = new THREE.Vector3(0, 0, 0);
      temp.push({ pos, vel, seed: Math.random() * 1000 });
    }
    particles.current = temp;
  }, [count, params.spawnRadius, params.resetToken]);

  const clock = useRef(0);
  useFrame((_, delta) => {
    if (params.paused) return;
    clock.current += delta;
    const t = clock.current;
    const dt = Math.min(delta, 0.033);

    for (let i = 0; i < particles.current.length; i++) {
      const p = particles.current[i];
      algorithmStep(p, t, dt, params);
      dummy.position.copy(p.pos);
      dummy.scale.setScalar(params.pointSize);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
      <sphereGeometry args={[0.5, 8, 8]} />
      <meshBasicMaterial
        color={color}
        blending={THREE.AdditiveBlending}
        transparent
        opacity={0.85}
      />
    </instancedMesh>
  );
}

function PatternSimulator({ params }) {
  return (
    <div className="h-[520px] w-full rounded-2xl border border-violet-800/40 bg-black/60 shadow-[0_0_40px_rgba(168,85,247,0.25)] overflow-hidden">
      <Canvas camera={{ position: [0, 0, 60], fov: 60 }}>
        <color attach="background" args={["#050505"]} />
        <Particles count={params.count} params={params} />
        <OrbitControls enableDamping dampingFactor={0.08} maxDistance={200} minDistance={20} />
      </Canvas>
    </div>
  );
}

// -----------------------------
// App — vintage + neon theme, film-grain overlay, preview modal
// -----------------------------
export default function App() {
  const [page, setPage] = useState("home");
  const [preview, setPreview] = useState(null);

  // Example NFTs: replace YOUR_IMAGE_URL_HERE
  const nfts = useMemo(
    () => [
      {
        id: "NFT-001",
        image: "YOUR_IMAGE_URL_HERE",
        traits: [
          { type: "Background", value: "Dark Violet" },
          { type: "Pattern", value: "Fractal Lines" },
          { type: "Rarity", value: "Ultra Rare" },
        ],
      },
      {
        id: "NFT-002",
        image: "YOUR_IMAGE_URL_HERE",
        traits: [
          { type: "Background", value: "Black Sepia" },
          { type: "Pattern", value: "Retro Neon" },
          { type: "Rarity", value: "Rare" },
        ],
      },
    ],
    []
  );

  // Live sim parameters
  const [sim, setSim] = useState({
    paused: false,
    count: 1500,
    pointSize: 0.9,
    speed: 24,
    scale: 24,
    attraction: 0.02,
    spawnRadius: 20,
    cRe: -0.7,
    cIm: 0.27,
    resetToken: 0,
  });

  const SimControls = () => (
    <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3 text-sm text-violet-200/90">
      {[
        { k: "count", min: 200, max: 6000, step: 100 },
        { k: "pointSize", min: 0.4, max: 2, step: 0.1 },
        { k: "speed", min: 5, max: 50, step: 1 },
        { k: "scale", min: 6, max: 60, step: 1 },
        { k: "attraction", min: 0, max: 0.1, step: 0.005 },
        { k: "spawnRadius", min: 5, max: 60, step: 1 },
        { k: "cRe", min: -1, max: 1, step: 0.01 },
        { k: "cIm", min: -1, max: 1, step: 0.01 },
      ].map(({ k, min, max, step }) => (
        <label key={k} className="flex items-center gap-2">
          <span className="w-28 capitalize">{k}</span>
          <input
            type="range"
            min={min}
            max={max}
            step={step}
            value={sim[k]}
            onChange={(e) => setSim((s) => ({ ...s, [k]: parseFloat(e.target.value) }))}
            className="w-full accent-violet-500"
          />
        </label>
      ))}

      {/* Pause/Resume */}
      <button
        onClick={() => setSim((s) => ({ ...s, paused: !s.paused }))}
        className={`col-span-2 md:col-span-1 mt-2 rounded-lg border px-3 py-2 ${
          sim.paused ? "border-violet-700 bg-violet-900/30" : "border-violet-700 bg-black/40"
        }`}
      >
        {sim.paused ? "Resume" : "Pause"}
      </button>
      {/* Randomize Fractal */}
      <button
        onClick={() =>
          setSim((s) => ({
            ...s,
            cRe: parseFloat((Math.random() * 2 - 1).toFixed(3)),
            cIm: parseFloat((Math.random() * 2 - 1).toFixed(3)),
            resetToken: s.resetToken + 1,
          }))
        }
        className="col-span-2 md:col-span-1 mt-2 rounded-lg border border-violet-700 bg-black/40 px-3 py-2 hover:bg-violet-900/40 transition"
      >
        🎲 Randomize Fractal
      </button>
      {/* Reset Particles */}
      <button
        onClick={() => setSim((s) => ({ ...s, resetToken: s.resetToken + 1 }))}
        className="col-span-2 md:col-span-1 mt-2 rounded-lg border border-violet-700 bg-black/40 px-3 py-2"
      >
        Reset Particles
      </button>
    </div>
  );

  return (
    <div className="bg-black text-violet-200 min-h-screen font-serif relative overflow-hidden">
      {/* Film grain overlay */}
      <div className="pointer-events-none fixed inset-0 z-50 opacity-[0.08] bg-[url('https://www.transparenttextures.com/patterns/asfalt-light.png')] mix-blend-overlay"></div>

      {/* Navbar */}
      <nav className="flex justify-between items-center px-6 py-4 bg-black/60 backdrop-blur-md border-b border-violet-800/40 sticky top-0 z-40">
        <h1 className="text-2xl font-bold text-violet-400 tracking-widest">Painting by Numbers</h1>
        <div className="space-x-6 text-lg">
          <button
            onClick={() => setPage("home")}
            className={`hover:text-violet-400 ${page === "home" ? "text-violet-300" : "text-gray-400"}`}
          >
            Home
          </button>
          <button
            onClick={() => setPage("about")}
            className={`hover:text-violet-400 ${page === "about" ? "text-violet-300" : "text-gray-400"}`}
          >
            About
          </button>
        </div>
      </nav>

      {/* Page Transition */}
      <AnimatePresence mode="wait">
        {page === "home" && (
          <motion.div
            key="home"
            initial={{ opacity: 0, filter: "brightness(200%) blur(5px)" }}
            animate={{ opacity: 1, filter: "brightness(100%) blur(0px)" }}
            exit={{ opacity: 0, filter: "brightness(300%) blur(15px)" }}
            transition={{ duration: 1 }}
            className="px-6 py-10"
          >
            {/* Hero */}
            <section className="text-center py-14">
              <motion.h2
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="text-5xl font-extrabold text-violet-300 drop-shadow-lg"
              >
                The Vintage Neon Collection
              </motion.h2>
              <p className="mt-4 text-lg text-gray-400 max-w-2xl mx-auto">
                127 Genesis NFTs → 3,300 Expansion → 8,800 Finale. A journey through neon and time.
              </p>
            </section>

            {/* 3D Pattern Lab */}
            <section className="py-10">
              <h3 className="text-3xl font-extrabold text-violet-300 mb-4">3D Pattern Lab</h3>
              <p className="text-gray-400 mb-4">
                Live simulation of fractal formation. Tweak the sliders or hit Randomize to explore new Julia worlds.
              </p>
              <PatternSimulator params={sim} />
              <SimControls />
            </section>

            {/* Gallery */}
            <section className="grid sm:grid-cols-2 md:grid-cols-3 gap-6 mt-12">
              {nfts.map((nft) => (
                <motion.div
                  key={nft.id}
                  whileHover={{ scale: 1.05 }}
                  onClick={() => setPreview(nft)}
                  className="relative rounded-2xl border-4 border-yellow-800 shadow-[0_0_20px_rgba(138,43,226,0.5)] bg-black/70 cursor-pointer"
                >
                  <img src={nft.image} alt={nft.id} className="rounded-xl w-full h-64 object-cover" />
                  <div className="absolute bottom-0 w-full bg-black/70 text-center py-2 text-violet-300 font-semibold tracking-wide">
                    {nft.id}
                  </div>
                </motion.div>
              ))}
            </section>
          </motion.div>
        )}

        {page === "about" && (
          <motion.div
            key="about"
            initial={{ opacity: 0, filter: "brightness(200%) blur(5px)" }}
            animate={{ opacity: 1, filter: "brightness(100%) blur(0px)" }}
            exit={{ opacity: 0, filter: "brightness(300%) blur(15px)" }}
            transition={{ duration: 1 }}
            className="px-6 py-16 text-center"
          >
            <h2 className="text-4xl font-extrabold text-violet-300 drop-shadow-md">About the Project</h2>
            <p className="mt-6 text-lg text-gray-400 max-w-3xl mx-auto">
              Painting by Numbers is an evolving NFT journey. The Genesis drop of 127 pieces opens the gates to our 3,300‑unit collection, followed by the grand 8,800 finale. Each artwork carries unique traits and vintage‑neon inspired attributes.
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* NFT Preview Modal */}
      <AnimatePresence>
        {preview && (
          <motion.div
            className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-black/90 border-4 border-yellow-700 rounded-2xl max-w-4xl w-full grid md:grid-cols-2 shadow-[0_0_40px_rgba(138,43,226,0.8)]"
            >
              {/* Image */}
              <div className="relative">
                <img src={preview.image} alt={preview.id} className="w-full h-full object-cover rounded-l-2xl" />
              </div>
              {/* Traits */}
              <div className="p-6 flex flex-col text-left">
                <h3 className="text-2xl font-bold text-violet-300 mb-4">{preview.id}</h3>
                <div className="space-y-3">
                  {preview.traits.map((trait, i) => (
                    <div key={i} className="flex justify-between border-b border-violet-800 pb-2">
                      <span className="text-gray-400">{trait.type}</span>
                      <span className="text-violet-300 font-medium">{trait.value}</span>
                    </div>
                  ))}
                </div>
                <button onClick={() => setPreview(null)} className="mt-6 bg-violet-700 hover:bg-violet-600 text-white px-4 py-2 rounded-lg self-end">Close</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
