"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import type { Group, Mesh } from "three";
import { MathUtils, Vector3 } from "three";

type SceneProps = {
  onReady: () => void;
  onContextLost: () => void;
  onContextRestored: () => void;
};

const assembled = [
  new Vector3(-0.74, -0.18, 0),
  new Vector3(0.58, 0.3, -0.12),
  new Vector3(0.38, -0.67, 0.25),
] as const;

const exploded = [
  new Vector3(-1.35, -0.5, 0.35),
  new Vector3(1.15, 0.78, -0.35),
  new Vector3(0.72, -1.18, 0.62),
] as const;

function ContextLifecycle({ onReady, onContextLost, onContextRestored }: SceneProps) {
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

function Assembly() {
  const group = useRef<Group>(null);
  const pieces = useRef<Array<Mesh | null>>([]);

  useFrame(({ camera, clock, pointer }, delta) => {
    const elapsed = clock.getElapsedTime();
    const assembly = MathUtils.smoothstep(Math.min(elapsed / 1.6, 1), 0, 1);

    pieces.current.forEach((piece, index) => {
      if (!piece) return;
      piece.position.lerpVectors(exploded[index], assembled[index], assembly);
    });

    if (group.current) {
      group.current.rotation.y = Math.sin(elapsed * 0.28) * 0.055;
      group.current.rotation.x = -0.12 + Math.sin(elapsed * 0.22) * 0.018;
    }

    camera.position.x = MathUtils.damp(camera.position.x, pointer.x * 0.22, 4, delta);
    camera.position.y = MathUtils.damp(camera.position.y, pointer.y * 0.14, 4, delta);
    camera.lookAt(0, -0.05, 0);
  });

  return (
    <group ref={group} rotation={[-0.12, -0.2, 0.08]}>
      <mesh ref={(mesh) => { pieces.current[0] = mesh; }} rotation={[0.08, 0.12, -0.16]}>
        <tetrahedronGeometry args={[1.18, 0]} />
        <meshStandardMaterial color="#e8c547" roughness={0.72} metalness={0.02} />
      </mesh>
      <mesh ref={(mesh) => { pieces.current[1] = mesh; }} rotation={[-0.1, -0.34, 0.18]} scale={0.82}>
        <tetrahedronGeometry args={[1.18, 0]} />
        <meshStandardMaterial color="#30323d" roughness={0.84} metalness={0} />
      </mesh>
      <mesh ref={(mesh) => { pieces.current[2] = mesh; }} rotation={[0.12, 0.42, -0.08]} scale={0.58}>
        <tetrahedronGeometry args={[1.18, 0]} />
        <meshStandardMaterial color="#f7f4ed" roughness={0.9} metalness={0} />
      </mesh>
    </group>
  );
}

export default function HomeHeroScene(props: SceneProps) {
  return (
    <Canvas
      dpr={[1, 1.5]}
      camera={{ position: [0, 0, 4.6], fov: 34 }}
      gl={{ alpha: false, antialias: true, powerPreference: "high-performance" }}
    >
      <color attach="background" args={["#272a34"]} />
      <ambientLight intensity={1.4} />
      <directionalLight position={[3, 4, 5]} intensity={2.2} color="#fff8dc" />
      <directionalLight position={[-3, -1, 2]} intensity={0.9} color="#e8c547" />
      <Assembly />
      <ContextLifecycle {...props} />
    </Canvas>
  );
}
