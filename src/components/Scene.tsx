import { useRef, type ReactNode } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Float, MeshDistortMaterial, Stars } from '@react-three/drei'
import type { Group, Mesh } from 'three'

function Blob() {
  const mesh = useRef<Mesh>(null)
  useFrame((_, delta) => {
    if (!mesh.current) return
    mesh.current.rotation.x += delta * 0.15
    mesh.current.rotation.y += delta * 0.2
  })
  return (
    <Float speed={1.5} rotationIntensity={0.4} floatIntensity={1.2}>
      <mesh ref={mesh} position={[1.8, 0, 0]} scale={1.5}>
        <icosahedronGeometry args={[1, 32]} />
        <MeshDistortMaterial color="#5ee6b5" roughness={0.15} metalness={0.6} distort={0.35} speed={1.8} />
      </mesh>
    </Float>
  )
}

// Gently tilts the whole scene toward the pointer.
function Rig({ children }: { children: ReactNode }) {
  const group = useRef<Group>(null)
  useFrame(({ pointer }, delta) => {
    if (!group.current) return
    const k = 1 - Math.exp(-delta * 3)
    group.current.rotation.y += (pointer.x * 0.35 - group.current.rotation.y) * k
    group.current.rotation.x += (-pointer.y * 0.2 - group.current.rotation.x) * k
  })
  return <group ref={group}>{children}</group>
}

export default function Scene() {
  return (
    <Canvas camera={{ position: [0, 0, 6], fov: 45 }} dpr={[1, 2]}>
      <ambientLight intensity={0.4} />
      <directionalLight position={[4, 5, 3]} intensity={2} />
      <pointLight position={[-4, -2, 2]} intensity={30} color="#7c8cff" />
      <Rig>
        <Blob />
        <Stars radius={60} depth={40} count={2500} factor={3} fade speed={0.6} />
      </Rig>
    </Canvas>
  )
}
