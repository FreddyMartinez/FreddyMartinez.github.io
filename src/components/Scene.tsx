import { useRef, type ReactNode } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Stars } from '@react-three/drei'
import type { Group } from 'three'
import Gir from './Gir'

// Gently tilts the whole scene toward the pointer.
function Rig({ children }: { children: ReactNode }) {
  const group = useRef<Group>(null)
  useFrame(({ pointer }, delta) => {
    if (!group.current) return
    const k = 1 - Math.exp(-delta * 3)
    group.current.rotation.y += (pointer.x * 0.15 - group.current.rotation.y) * k
    group.current.rotation.x += (-pointer.y * 0.08 - group.current.rotation.x) * k
  })
  return <group ref={group}>{children}</group>
}

export default function Scene() {
  return (
    <Canvas camera={{ position: [0, 0, 6], fov: 45 }} dpr={[1, 2]}>
      <ambientLight intensity={0.55} />
      <directionalLight position={[-5, 3, 2.5]} intensity={1.8} />
      <pointLight position={[4, -2, 2]} intensity={8} color="#7c8cff" />
      <Rig>
        <Gir />
        <Stars radius={60} depth={40} count={2500} factor={3} fade speed={0.6} />
      </Rig>
    </Canvas>
  )
}
