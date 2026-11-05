import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'

// 1. Procedural Hexagonal Cyber-Circuit Texture for the Globe Core
function createHexCircuitTexture() {
  const canvas = document.createElement('canvas')
  canvas.width = 1024
  canvas.height = 1024
  const ctx = canvas.getContext('2d')
  if (!ctx) return new THREE.CanvasTexture(canvas)

  // Dark emerald cybernetic background
  ctx.fillStyle = '#061a10'
  ctx.fillRect(0, 0, 1024, 1024)

  // Hexagonal grid tessellation
  const hexRadius = 24
  const h = hexRadius * Math.sqrt(3)
  const w = hexRadius * 2

  ctx.strokeStyle = '#10b981'
  ctx.lineWidth = 1.8

  function drawHex(cx, cy, r) {
    ctx.beginPath()
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i
      const x = cx + r * Math.cos(angle)
      const y = cy + r * Math.sin(angle)
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
    ctx.closePath()
  }

  for (let y = -h; y < 1024 + h; y += h) {
    for (let x = -w, row = 0; x < 1024 + w; x += w * 0.75, row++) {
      const cy = y + (row % 2 === 0 ? 0 : h / 2)
      drawHex(x, cy, hexRadius * 0.88)
      ctx.stroke()

      // Random highlighted active nano-cells
      if (Math.random() < 0.22) {
        ctx.fillStyle = 'rgba(52, 211, 153, 0.45)'
        ctx.fill()
      }
    }
  }

  // Bright horizontal data lines and circuit trace nodes
  ctx.strokeStyle = '#6ee7b7'
  ctx.lineWidth = 3.5
  ctx.fillStyle = '#ffffff'

  const lineCount = 14
  for (let i = 1; i < lineCount; i++) {
    const y = (1024 / lineCount) * i
    ctx.beginPath()
    ctx.moveTo(80, y)
    ctx.lineTo(944, y)
    ctx.stroke()

    // Circuit terminal nodes
    const nodeCount = 5 + Math.floor(Math.random() * 4)
    for (let j = 0; j < nodeCount; j++) {
      const nx = 120 + Math.random() * 780
      ctx.beginPath()
      ctx.arc(nx, y, 7, 0, Math.PI * 2)
      ctx.fill()

      ctx.strokeStyle = '#34d399'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.arc(nx, y, 11, 0, Math.PI * 2)
      ctx.stroke()
    }
  }

  const texture = new THREE.CanvasTexture(canvas)
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.ClampToEdgeWrapping
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}

// 2. Procedural Radial Contact Shadow Texture
function createContactShadowTexture() {
  const canvas = document.createElement('canvas')
  canvas.width = 256
  canvas.height = 256
  const ctx = canvas.getContext('2d')
  if (!ctx) return new THREE.CanvasTexture(canvas)

  const gradient = ctx.createRadialGradient(128, 128, 0, 128, 128, 124)
  gradient.addColorStop(0, 'rgba(0, 0, 0, 0.75)')
  gradient.addColorStop(0.35, 'rgba(4, 30, 20, 0.45)')
  gradient.addColorStop(0.7, 'rgba(6, 78, 59, 0.15)')
  gradient.addColorStop(1, 'rgba(0, 0, 0, 0)')

  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, 256, 256)

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}

// 3. Hexagonal Shard Particle Texture
function createShardParticleTexture() {
  const canvas = document.createElement('canvas')
  canvas.width = 64
  canvas.height = 64
  const ctx = canvas.getContext('2d')
  if (!ctx) return new THREE.CanvasTexture(canvas)

  ctx.fillStyle = '#34d399'
  ctx.beginPath()
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 3) * i
    const px = 32 + 28 * Math.cos(a)
    const py = 32 + 28 * Math.sin(a)
    if (i === 0) ctx.moveTo(px, py)
    else ctx.lineTo(px, py)
  }
  ctx.closePath()
  ctx.fill()

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}

export default function GeodesicGlobe3D({
  className = '',
  style = {},
  interactive = true,
  speed = 1.0,
  showShadow = true
}) {
  const containerRef = useRef(null)
  const [webGlSupported, setWebGlSupported] = useState(true)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    // Verify WebGL availability
    let renderer
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: 'high-performance'
      })
    } catch (e) {
      console.warn('WebGL initialization failed, falling back to 2D mark:', e)
      setWebGlSupported(false)
      return
    }

    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.25
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    renderer.setSize(container.clientWidth || 340, container.clientHeight || 340)

    const domElement = renderer.domElement
    domElement.style.width = '100%'
    domElement.style.height = '100%'
    domElement.style.display = 'block'
    container.appendChild(domElement)

    // Scene and Camera
    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(
      42,
      (container.clientWidth || 340) / (container.clientHeight || 340),
      0.1,
      100
    )
    camera.position.set(0, 0.4, 6.2)

    // Materials
    const hexTexture = createHexCircuitTexture()
    const shadowTexture = createContactShadowTexture()
    const shardTexture = createShardParticleTexture()

    const coreMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x072818,
      map: hexTexture,
      metalness: 0.88,
      roughness: 0.22,
      clearcoat: 0.8,
      clearcoatRoughness: 0.12,
      emissive: new THREE.Color(0x065f46),
      emissiveIntensity: 0.95
    })

    const innerHeartMaterial = new THREE.MeshBasicMaterial({
      color: 0x34d399,
      wireframe: true,
      transparent: true,
      opacity: 0.45
    })

    const ringMaterial = new THREE.MeshStandardMaterial({
      color: 0xa7f3d0,
      metalness: 0.9,
      roughness: 0.18
    })

    const nodeMaterial = new THREE.MeshStandardMaterial({
      color: 0x4ade80,
      emissive: new THREE.Color(0x22c55e),
      emissiveIntensity: 3.5,
      roughness: 0.1
    })

    const gimbalMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xd4af37, // Champagne gold
      metalness: 0.92,
      roughness: 0.35,
      clearcoat: 0.4
    })

    // Group holding the entire Geodesic Globe Emblem
    const globeGroup = new THREE.Group()
    scene.add(globeGroup)

    const radius = 1.7

    // 1. Core Sphere
    const sphereGeom = new THREE.SphereGeometry(radius, 48, 48)
    const coreMesh = new THREE.Mesh(sphereGeom, coreMaterial)
    globeGroup.add(coreMesh)

    // 2. Photonic Heart Resonator
    const innerGeom = new THREE.SphereGeometry(radius * 0.74, 28, 28)
    const innerMesh = new THREE.Mesh(innerGeom, innerHeartMaterial)
    globeGroup.add(innerMesh)

    // 3. Segmented Orbital Data Latitude Rings
    const ringsGroup = new THREE.Group()
    const ringCount = 7
    for (let i = 0; i < ringCount; i++) {
      const latAngle = ((i - (ringCount - 1) / 2) / ((ringCount - 1) / 2)) * 0.95
      const ringR = Math.cos(latAngle) * (radius * 1.05)
      const ringY = Math.sin(latAngle) * radius

      const ringGeom = new THREE.TorusGeometry(ringR, 0.024, 8, 48)
      const ringMesh = new THREE.Mesh(ringGeom, ringMaterial)
      ringMesh.rotation.x = Math.PI / 2
      ringMesh.position.y = ringY

      // Glowing circuit nodes on ring
      const nodeCount = 3 + (i % 3)
      for (let j = 0; j < nodeCount; j++) {
        const theta = (Math.PI * 2 * j) / nodeCount + i * 0.8
        const nodeGeom = new THREE.SphereGeometry(0.062, 10, 10)
        const nodeMesh = new THREE.Mesh(nodeGeom, nodeMaterial)
        nodeMesh.position.set(Math.cos(theta) * ringR, Math.sin(theta) * ringR, 0)
        ringMesh.add(nodeMesh)
      }
      ringsGroup.add(ringMesh)
    }
    globeGroup.add(ringsGroup)

    // 4. Dispersing Hexagonal Shard Particles floating upwards
    const shardCount = 75
    const shardGeom = new THREE.BufferGeometry()
    const shardPositions = new Float32Array(shardCount * 3)

    for (let i = 0; i < shardCount; i++) {
      const angle = Math.random() * Math.PI * 2
      const dist = (Math.random() * 0.9 + 0.1) * radius
      const yOff = radius * 0.7 + Math.random() * 1.8

      shardPositions[i * 3 + 0] = Math.cos(angle) * dist
      shardPositions[i * 3 + 1] = yOff
      shardPositions[i * 3 + 2] = Math.sin(angle) * dist
    }
    shardGeom.setAttribute('position', new THREE.BufferAttribute(shardPositions, 3))

    const shardMaterial = new THREE.PointsMaterial({
      map: shardTexture,
      size: 0.32,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })
    const particles = new THREE.Points(shardGeom, shardMaterial)
    globeGroup.add(particles)

    // 5. Equatorial Orbital Navigation Ring
    const gimbalGeom = new THREE.TorusGeometry(radius * 1.25, 0.038, 12, 64)
    const gimbalMesh = new THREE.Mesh(gimbalGeom, gimbalMaterial)
    gimbalMesh.rotation.x = Math.PI / 2.7
    gimbalMesh.rotation.y = Math.PI / 6
    globeGroup.add(gimbalMesh)

    // 6. Contact Shadow
    let shadowMesh = null
    if (showShadow) {
      const shadowGeom = new THREE.PlaneGeometry(radius * 3.4, radius * 3.4)
      const shadowMat = new THREE.MeshBasicMaterial({
        map: shadowTexture,
        transparent: true,
        opacity: 0.65,
        depthWrite: false
      })
      shadowMesh = new THREE.Mesh(shadowGeom, shadowMat)
      shadowMesh.rotation.x = -Math.PI / 2
      shadowMesh.position.y = -radius * 1.08
      scene.add(shadowMesh)
    }

    // 7. Lighting
    const keyLight = new THREE.DirectionalLight(0xf0fdf4, 2.5)
    keyLight.position.set(5, 7, 5)
    scene.add(keyLight)

    const fillLight = new THREE.HemisphereLight(0x1a3328, 0x050807, 1.4)
    scene.add(fillLight)

    const rimLight = new THREE.DirectionalLight(0x34d399, 2.2)
    rimLight.position.set(-5, 4, -4)
    scene.add(rimLight)

    // Mouse Parallax & Smooth Rotation
    let targetRotX = 0.15
    let isDragging = false
    let prevMouseX = 0
    let prevMouseY = 0

    const handlePointerMove = e => {
      if (!interactive) return
      if (isDragging) {
        const deltaX = e.clientX - prevMouseX
        const deltaY = e.clientY - prevMouseY
        prevMouseX = e.clientX
        prevMouseY = e.clientY
        globeGroup.rotation.y += deltaX * 0.01
        globeGroup.rotation.x += deltaY * 0.01
      } else {
        const rect = domElement.getBoundingClientRect()
        const normY = -(((e.clientY - rect.top) / rect.height) * 2 - 1)
        targetRotX = 0.15 + normY * 0.25
      }
    }

    const handlePointerDown = e => {
      if (!interactive) return
      isDragging = true
      prevMouseX = e.clientX
      prevMouseY = e.clientY
      domElement.style.cursor = 'grabbing'
    }

    const handlePointerUp = () => {
      isDragging = false
      if (domElement) domElement.style.cursor = interactive ? 'grab' : 'default'
    }

    if (interactive) {
      domElement.style.cursor = 'grab'
      domElement.addEventListener('pointerdown', handlePointerDown)
      window.addEventListener('pointermove', handlePointerMove)
      window.addEventListener('pointerup', handlePointerUp)
    }

    // Handle Resize
    const resizeObserver = new ResizeObserver(() => {
      if (!container || !renderer) return
      const width = container.clientWidth || 340
      const height = container.clientHeight || 340
      if (width > 0 && height > 0) {
        camera.aspect = width / height
        camera.updateProjectionMatrix()
        renderer.setSize(width, height)
      }
    })
    resizeObserver.observe(container)

    // Kinetic Animation Loop
    let animationFrameId
    let lastTime = performance.now()

    const animate = time => {
      animationFrameId = requestAnimationFrame(animate)
      const dt = Math.min((time - lastTime) / 1000, 0.1)
      lastTime = time

      // Automatic planetary rotations
      globeGroup.rotation.y += dt * 0.25 * speed
      ringsGroup.rotation.y += dt * 0.55 * speed
      innerMesh.rotation.y -= dt * 0.35 * speed
      gimbalMesh.rotation.z += dt * 0.18 * speed

      // Smooth mouse-follow interpolation when not dragging
      if (!isDragging) {
        globeGroup.rotation.x += (targetRotX - globeGroup.rotation.x) * 0.05
      }

      // Floating Shard Particle Cloud update
      const pArray = particles.geometry.attributes.position.array
      for (let i = 0; i < shardCount; i++) {
        pArray[i * 3 + 1] += dt * 0.45 * speed
        if (pArray[i * 3 + 1] > radius * 2.2) {
          pArray[i * 3 + 1] = radius * 0.65
        }
      }
      particles.geometry.attributes.position.needsUpdate = true

      renderer.render(scene, camera)
    }

    animationFrameId = requestAnimationFrame(animate)

    // Cleanup on unmount
    return () => {
      cancelAnimationFrame(animationFrameId)
      resizeObserver.disconnect()

      if (interactive) {
        domElement.removeEventListener('pointerdown', handlePointerDown)
        window.removeEventListener('pointermove', handlePointerMove)
        window.removeEventListener('pointerup', handlePointerUp)
      }

      // Dispose Three.js objects
      hexTexture.dispose()
      shadowTexture.dispose()
      shardTexture.dispose()

      sphereGeom.dispose()
      innerGeom.dispose()
      shardGeom.dispose()
      gimbalGeom.dispose()

      coreMaterial.dispose()
      innerHeartMaterial.dispose()
      ringMaterial.dispose()
      nodeMaterial.dispose()
      gimbalMaterial.dispose()
      shardMaterial.dispose()

      if (renderer) {
        renderer.dispose()
        if (domElement.parentElement) {
          domElement.parentElement.removeChild(domElement)
        }
      }
    }
  }, [interactive, speed, showShadow])

  if (!webGlSupported) {
    return null
  }

  return (
    <div
      ref={containerRef}
      className={`geodesic-globe-3d-wrap ${className}`}
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        overflow: 'hidden',
        pointerEvents: interactive ? 'auto' : 'none',
        ...style
      }}
    />
  )
}
