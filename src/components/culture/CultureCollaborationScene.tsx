"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import type { Group, Mesh } from "three";
import { MathUtils } from "three";

type SceneProps = {
  selected: number;
  onReady: () => void;
  onContextLost: () => void;
  onContextRestored: () => void;
};

const positions = [
  [-0.78, 0.22, 0.12],
  [0.52, 0.66, -0.18],
  [0.76, -0.58, 0.08],
  [-0.46, -0.72, -0.2],
] as const;

function ContextLifecycle({ onReady, onContextLost, onContextRestored }: Omit<SceneProps, "selected">) {
  const { gl } = useThree();

  useEffect(() => {
    const canvas = gl.domElement;
    const handleLost = (event: Event) => {
      event.preventDefault();
      onContextLost();
    };
    canvas.addEventListener("webglcontextlost", handleLost);
    canvas.addEventListener("webglcontextrestored", onContextRestored);
    onReady();
    return () => {
      canvas.removeEventListener("webglcontextlost", handleLost);
      canvas.removeEventListener("webglcontextrestored", onContextRestored);
    };
  }, [gl, onContextLost, onContextRestored, onReady]);

  return null;
}

function DisciplineAssembly({ selected }: Pick<SceneProps, "selected">) {
  const group = useRef<Group>(null);
  const pieces = useRef<Array<Mesh | null>>([]);

  useFrame(({ clock }, delta) => {
    const elapsed = clock.getElapsedTime();
    if (group.current) {
      group.current.rotation.y = -0.28 + Math.sin(elapsed * 0.24) * 0.06;
      group.current.rotation.x = -0.2 + Math.sin(elapsed * 0.19) * 0.025;
    }

    pieces.current.forEach((piece, index) => {
      if (!piece) return;
      const target = index === selected ? 1.08 : 0.86;
      const scale = MathUtils.damp(piece.scale.x, target, 5, delta);
      piece.scale.setScalar(scale);
    });
  });

  return (
    <group ref={group} rotation={[-0.2, -0.28, 0.08]}>
      {positions.map((position, index) => (
        <mesh
          key={index}
          ref={(mesh) => { pieces.current[index] = mesh; }}
          position={position}
          rotation={[index * 0.18, index * -0.34, index * 0.14]}
        >
          <tetrahedronGeometry args={[0.78, 0]} />
          <meshStandardMaterial
            color={index === selected ? "#e8c547" : index % 2 === 0 ? "#f7f4ed" : "#30323d"}
            roughness={0.84}
            metalness={0}
          />
        </mesh>
      ))}
    </group>
  );
}

export default function CultureCollaborationScene({ selected, ...lifecycle }: SceneProps) {
  return (
    <Canvas
      dpr={[1, 1.5]}
      camera={{ position: [0, 0, 4.3], fov: 38 }}
      gl={{ alpha: false, antialias: true, powerPreference: "high-performance" }}
    >
      <color attach="background" args={["#272a34"]} />
      <ambientLight intensity={1.5} />
      <directionalLight position={[3, 4, 5]} intensity={2} color="#fff8dc" />
      <directionalLight position={[-2, -2, 3]} intensity={0.8} color="#e8c547" />
      <DisciplineAssembly selected={selected} />
      <ContextLifecycle {...lifecycle} />
    </Canvas>
  );
}
