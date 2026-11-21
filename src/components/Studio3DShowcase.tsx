import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';
import {
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Layers,
  SlidersHorizontal,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { FRAME_FINISHES } from '../data/catalog';
import type { CameraPresetId, FrameFinishId, StudioModelId } from '../types/golden';

interface Studio3DShowcaseProps {
  activeModel: StudioModelId;
  onSelectModel: (model: StudioModelId) => void;
  activeFinish: FrameFinishId;
  onSelectFinish: (finish: FrameFinishId) => void;
}

interface ModelHandles {
  group: THREE.Group;
  frameMaterials: THREE.MeshPhysicalMaterial[];
  updateAnimation: (operation: number, explode: number) => void;
}

const MODEL_META: Record<
  StudioModelId,
  {
    title: string;
    subtitle: string;
    operationLabel: string;
    operationUnit: string;
    specNote: string;
  }
> = {
  pleated: {
    title: 'Pleated Sliding Mosquito Door',
    subtitle: 'Accordion-folded fiberglass mesh · 4mm barrier-free threshold',
    operationLabel: 'Slide Mesh',
    operationUnit: '% Open',
    specNote: '14-fold tensioned mesh with magnetic pull stile',
  },
  zebra: {
    title: 'Dual-Layer Zebra Window Blind',
    subtitle: 'Sheer & linen alternating weave · Extruded aluminum cassette',
    operationLabel: 'Drop & Filter',
    operationUnit: '% Lowered',
    specNote: 'Stainless beaded chain & weighted elliptical rail',
  },
  ss316: {
    title: 'SS 316 Hinged Security Screen',
    subtitle: 'Marine-grade 316 steel mesh · Triple machined barrel hinges',
    operationLabel: 'Swing Sash',
    operationUnit: '° Angle',
    specNote: 'Coastal corrosion-proof sash with multipoint latch',
  },
};

const CAMERA_PRESETS: Record<
  CameraPresetId,
  { label: string; pos: [number, number, number]; target: [number, number, number] }
> = {
  front: { label: 'Front', pos: [0, 1.58, 4.35], target: [0, 1.38, 0] },
  angle: { label: '3/4 View', pos: [2.75, 1.82, 3.65], target: [0, 1.34, 0] },
  detail: { label: 'Macro', pos: [0.95, 1.48, 2.05], target: [0.1, 1.42, 0.05] },
  top: { label: 'Track', pos: [-2.15, 2.55, 2.65], target: [0, 1.25, 0] },
};

// Module-scoped scratch vectors for zero GC allocation inside the render loop
const _camTargetPos = new THREE.Vector3();
const _camLookTarget = new THREE.Vector3();
const _zoomOffset = new THREE.Vector3();

function detectSoftwareGl(): boolean {
  try {
    const probeCanvas = document.createElement('canvas');
    const gl = probeCanvas.getContext('webgl2');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param));
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return true;
  }
}

function createMeshWeaveTexture(
  maxAnisotropy: number,
  wireColor: string,
  cellSize: number,
  lineWidth: number
): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  ctx.clearRect(0, 0, size, size);
  ctx.fillStyle = 'rgba(18, 19, 21, 0.28)';
  ctx.fillRect(0, 0, size, size);

  ctx.strokeStyle = wireColor;
  ctx.lineWidth = lineWidth;

  for (let x = 0; x <= size; x += cellSize) {
    ctx.beginPath();
    ctx.moveTo(x + 0.5, 0);
    ctx.lineTo(x + 0.5, size);
    ctx.stroke();
  }
  for (let y = 0; y <= size; y += cellSize) {
    ctx.beginPath();
    ctx.moveTo(0, y + 0.5);
    ctx.lineTo(size, y + 0.5);
    ctx.stroke();
  }

  // Subtle woven specular highlight at thread intersections
  ctx.fillStyle = 'rgba(220, 224, 232, 0.24)';
  for (let x = 0; x < size; x += cellSize) {
    for (let y = 0; y < size; y += cellSize) {
      ctx.fillRect(x, y, 1.5, 1.5);
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

function createZebraFabricTexture(maxAnisotropy: number): {
  map: THREE.CanvasTexture;
  alphaMap: THREE.CanvasTexture;
} {
  const width = 512;
  const height = 512;
  const colorCanvas = document.createElement('canvas');
  colorCanvas.width = width;
  colorCanvas.height = height;
  const cCtx = colorCanvas.getContext('2d')!;

  const alphaCanvas = document.createElement('canvas');
  alphaCanvas.width = width;
  alphaCanvas.height = height;
  const aCtx = alphaCanvas.getContext('2d')!;

  const bandHeight = 64; // 4 opaque + 4 sheer bands vertically
  for (let y = 0; y < height; y += bandHeight * 2) {
    // Opaque woven linen band
    cCtx.fillStyle = '#D6C8B2';
    cCtx.fillRect(0, y, width, bandHeight);

    // Linen horizontal slub texture
    for (let s = 0; s < bandHeight; s += 3) {
      cCtx.fillStyle = s % 6 === 0 ? 'rgba(130, 112, 88, 0.14)' : 'rgba(255, 250, 240, 0.15)';
      cCtx.fillRect(0, y + s, width, 1.5);
    }
    // Fine vertical warp threads
    cCtx.fillStyle = 'rgba(110, 96, 78, 0.08)';
    for (let x = 0; x < width; x += 6) {
      cCtx.fillRect(x, y, 1, bandHeight);
    }

    aCtx.fillStyle = '#FAFAFA';
    aCtx.fillRect(0, y, width, bandHeight);

    // Sheer micro-voile band
    cCtx.fillStyle = '#EAE4D8';
    cCtx.fillRect(0, y + bandHeight, width, bandHeight);
    cCtx.fillStyle = 'rgba(255, 255, 255, 0.25)';
    for (let s = 0; s < bandHeight; s += 4) {
      cCtx.fillRect(0, y + bandHeight + s, width, 1);
    }

    aCtx.fillStyle = '#383838';
    aCtx.fillRect(0, y + bandHeight, width, bandHeight);
  }

  const map = new THREE.CanvasTexture(colorCanvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = THREE.RepeatWrapping;
  map.wrapT = THREE.RepeatWrapping;
  map.repeat.set(1, 2.2);
  map.anisotropy = maxAnisotropy;

  const alphaMap = new THREE.CanvasTexture(alphaCanvas);
  alphaMap.wrapS = THREE.RepeatWrapping;
  alphaMap.wrapT = THREE.RepeatWrapping;
  alphaMap.repeat.set(1, 2.2);
  alphaMap.anisotropy = maxAnisotropy;

  return { map, alphaMap };
}

function createTeakWoodTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#8A5630';
  ctx.fillRect(0, 0, 256, 512);

  for (let x = 0; x < 256; x += 2) {
    const wave = Math.sin(x * 0.14) * 14;
    const tone = 110 + Math.floor(Math.sin(x * 0.23) * 18);
    ctx.strokeStyle = `rgba(${tone}, ${Math.floor(tone * 0.55)}, ${Math.floor(tone * 0.28)}, 0.42)`;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.bezierCurveTo(x + wave * 0.2, 170, x - wave * 0.25, 340, x, 512);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

function createPlinthTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#252320';
  ctx.fillRect(0, 0, 512, 512);

  for (let i = 0; i < 600; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const w = 18 + Math.random() * 65;
    const h = 1 + Math.random() * 2;
    ctx.fillStyle =
      i % 2 === 0 ? 'rgba(255, 248, 232, 0.035)' : 'rgba(10, 9, 8, 0.14)';
    ctx.fillRect(x, y, w, h);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 2);
  tex.anisotropy = maxAnisotropy;
  return tex;
}

function createContactShadowTexture(): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(size / 2, size / 2, 12, size / 2, size / 2, size / 2);
  grad.addColorStop(0, 'rgba(0, 0, 0, 0.62)');
  grad.addColorStop(0.55, 'rgba(0, 0, 0, 0.24)');
  grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  return tex;
}

function createBeveledBar(
  width: number,
  height: number,
  depth: number,
  bevel = 0.008
): THREE.ExtrudeGeometry {
  const shape = new THREE.Shape();
  const hw = width / 2;
  const hh = height / 2;
  shape.moveTo(-hw, -hh);
  shape.lineTo(hw, -hh);
  shape.lineTo(hw, hh);
  shape.lineTo(-hw, hh);
  shape.closePath();

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: Math.max(0.004, depth - bevel * 2),
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 2,
  });
  geo.center();
  return geo;
}

function buildPleatedDoorModel(
  frameMat: THREE.MeshPhysicalMaterial,
  darkHardwareMat: THREE.MeshStandardMaterial,
  steelTrackMat: THREE.MeshStandardMaterial,
  architecturalWallMat: THREE.MeshStandardMaterial,
  meshTex: THREE.CanvasTexture
): ModelHandles {
  const group = new THREE.Group();
  const frameW = 2.08;
  const frameH = 2.46;
  const barT = 0.082;
  const barD = 0.095;

  // 1. Architectural plaster portal surround (grounds the door in architectural context)
  const surroundGroup = new THREE.Group();
  const surroundDepth = 0.24;
  const surroundThick = 0.14;
  const leftWall = new THREE.Mesh(
    createBeveledBar(surroundThick, frameH + surroundThick, surroundDepth, 0.006),
    architecturalWallMat
  );
  leftWall.position.set(-(frameW / 2 + surroundThick / 2 + 0.008), (frameH + surroundThick) / 2, -0.04);
  leftWall.castShadow = true;
  leftWall.receiveShadow = true;

  const rightWall = leftWall.clone();
  rightWall.position.x = frameW / 2 + surroundThick / 2 + 0.008;

  const topWall = new THREE.Mesh(
    createBeveledBar(frameW + surroundThick * 2 + 0.02, surroundThick, surroundDepth, 0.006),
    architecturalWallMat
  );
  topWall.position.set(0, frameH + surroundThick / 2 + 0.008, -0.04);
  topWall.castShadow = true;
  topWall.receiveShadow = true;

  // Warm backlit courtyard glass panel behind the opening so the pleated mesh reads vividly
  const backdropGlowMat = new THREE.MeshStandardMaterial({
    color: '#D8CDB8',
    emissive: '#B69A6B',
    emissiveIntensity: 0.24,
    roughness: 0.85,
    metalness: 0.0,
  });
  const backdropPane = new THREE.Mesh(
    new THREE.PlaneGeometry(frameW - 0.08, frameH - 0.08),
    backdropGlowMat
  );
  backdropPane.position.set(0, frameH / 2, -0.145);

  surroundGroup.add(leftWall, rightWall, topWall, backdropPane);
  group.add(surroundGroup);

  // 2. Outer extruded aluminum frame (4 mitered members + corner caps)
  const outerFrameGroup = new THREE.Group();
  const topFrame = new THREE.Mesh(createBeveledBar(frameW, barT, barD), frameMat);
  topFrame.position.set(0, frameH - barT / 2, 0);
  topFrame.castShadow = true;

  const leftJamb = new THREE.Mesh(createBeveledBar(barT, frameH, barD), frameMat);
  leftJamb.position.set(-frameW / 2 + barT / 2, frameH / 2, 0);
  leftJamb.castShadow = true;

  const rightJamb = new THREE.Mesh(createBeveledBar(barT, frameH, barD), frameMat);
  rightJamb.position.set(frameW / 2 - barT / 2, frameH / 2, 0);
  rightJamb.castShadow = true;

  // Fixed cassette housing on the left side that holds compressed pleats
  const cassetteBox = new THREE.Mesh(
    createBeveledBar(0.095, frameH - barT, barD + 0.015),
    frameMat
  );
  cassetteBox.position.set(-frameW / 2 + barT + 0.04, frameH / 2, 0.004);
  cassetteBox.castShadow = true;

  // 4 machined dark corner cleats
  const cleatGeo = createBeveledBar(0.06, 0.06, barD + 0.012, 0.004);
  const cleatOffsets: [number, number][] = [
    [-frameW / 2 + 0.038, frameH - 0.038],
    [frameW / 2 - 0.038, frameH - 0.038],
  ];
  cleatOffsets.forEach(([cx, cy]) => {
    const cleat = new THREE.Mesh(cleatGeo, darkHardwareMat);
    cleat.position.set(cx, cy, 0);
    outerFrameGroup.add(cleat);
  });

  outerFrameGroup.add(topFrame, leftJamb, rightJamb, cassetteBox);
  group.add(outerFrameGroup);

  // 3. Ultra-low-profile 4mm barrier-free bottom threshold track with dual stainless guide rails
  const trackGroup = new THREE.Group();
  const basePlate = new THREE.Mesh(createBeveledBar(frameW, 0.022, 0.125, 0.004), steelTrackMat);
  basePlate.position.set(0, 0.011, 0);
  basePlate.receiveShadow = true;

  const railGeo = new THREE.BoxGeometry(frameW - 0.08, 0.012, 0.01);
  const railFront = new THREE.Mesh(railGeo, darkHardwareMat);
  railFront.position.set(0, 0.024, 0.024);
  const railBack = new THREE.Mesh(railGeo, darkHardwareMat);
  railBack.position.set(0, 0.024, -0.024);
  trackGroup.add(basePlate, railFront, railBack);
  group.add(trackGroup);

  // 4. Articulated 14-fold pleated accordion mosquito mesh
  const meshGroup = new THREE.Group();
  const foldCount = 14;
  const innerH = frameH - barT - 0.035;
  const pleatMat = new THREE.MeshStandardMaterial({
    color: '#2A2D32',
    map: meshTex,
    roughness: 0.78,
    metalness: 0.12,
    transparent: true,
    opacity: 0.9,
    side: THREE.DoubleSide,
  });
  const foldGeo = new THREE.PlaneGeometry(1, innerH);
  const folds: THREE.Mesh[] = [];

  for (let i = 0; i < foldCount; i++) {
    const fold = new THREE.Mesh(foldGeo, pleatMat);
    fold.position.y = innerH / 2 + 0.025;
    fold.castShadow = false;
    folds.push(fold);
    meshGroup.add(fold);
  }

  // Horizontal black Kevlar tension cords running across the pleated mesh
  const cordMat = new THREE.MeshStandardMaterial({
    color: '#111214',
    roughness: 0.6,
    metalness: 0.2,
  });
  const cordGeo = new THREE.CylinderGeometry(0.0035, 0.0035, 1, 6);
  cordGeo.rotateZ(Math.PI / 2);
  const cords: THREE.Mesh[] = [];
  [0.52, 1.24, 1.96].forEach((cy) => {
    const cord = new THREE.Mesh(cordGeo, cordMat);
    cord.position.set(0, cy, 0.002);
    cords.push(cord);
    meshGroup.add(cord);
  });

  group.add(meshGroup);

  // 5. Moving ergonomic vertical pull stile, machined handle & magnetic closure strip
  const pullBarGroup = new THREE.Group();
  const pullStile = new THREE.Mesh(
    createBeveledBar(0.064, innerH + 0.015, barD - 0.01),
    frameMat
  );
  pullStile.position.set(0, innerH / 2 + 0.028, 0);
  pullStile.castShadow = true;

  // Machined curved ergonomic pull handle (TubeGeometry)
  const handleCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.015, 1.02, 0.045),
    new THREE.Vector3(0.015, 1.05, 0.092),
    new THREE.Vector3(0.015, 1.38, 0.092),
    new THREE.Vector3(0.015, 1.41, 0.045),
  ]);
  const handleTube = new THREE.Mesh(
    new THREE.TubeGeometry(handleCurve, 20, 0.011, 10, false),
    darkHardwareMat
  );
  handleTube.castShadow = true;

  // Back side handle mirror
  const handleBack = handleTube.clone();
  handleBack.scale.z = -1;

  // Vertical magnetic closure strip on leading edge
  const magnetStrip = new THREE.Mesh(
    new THREE.BoxGeometry(0.012, innerH, 0.024),
    darkHardwareMat
  );
  magnetStrip.position.set(0.036, innerH / 2 + 0.028, 0);

  pullBarGroup.add(pullStile, handleTube, handleBack, magnetStrip);
  group.add(pullBarGroup);

  const leftAnchorX = -frameW / 2 + barT + 0.088;
  const maxSpan = frameW - barT * 2 - 0.155;

  const updateAnimation = (operation: number, explode: number) => {
    // operation: 0 = fully closed (mesh stretched across), 1 = fully retracted open
    const closedRatio = 1 - operation * 0.84;
    const currentSpan = Math.max(0.14, maxSpan * closedRatio);
    const stepX = currentSpan / foldCount;
    const maxFoldWidth = maxSpan / foldCount;
    const pleatDepth = Math.sqrt(Math.max(0.0004, maxFoldWidth * maxFoldWidth * 1.18 - stepX * stepX));
    const halfDepth = Math.min(0.042, pleatDepth * 0.48);

    folds.forEach((fold, idx) => {
      const x0 = leftAnchorX + idx * stepX;
      const x1 = x0 + stepX;
      const z0 = idx % 2 === 0 ? -halfDepth : halfDepth;
      const z1 = idx % 2 === 0 ? halfDepth : -halfDepth;
      const dx = x1 - x0;
      const dz = z1 - z0;
      const segLen = Math.hypot(dx, dz);

      fold.position.x = (x0 + x1) / 2;
      fold.position.z = (z0 + z1) / 2;
      fold.scale.x = segLen;
      fold.rotation.y = -Math.atan2(dz, dx);
    });

    cords.forEach((cord) => {
      cord.scale.x = currentSpan;
      cord.position.x = leftAnchorX + currentSpan / 2;
    });

    pullBarGroup.position.x = leftAnchorX + currentSpan + 0.032;

    // Exploded architectural inspection layer separation
    surroundGroup.position.z = -explode * 0.42;
    outerFrameGroup.position.z = explode * 0.02;
    trackGroup.position.y = -explode * 0.14;
    meshGroup.position.z = explode * 0.28;
    pullBarGroup.position.z = explode * 0.46;
  };

  updateAnimation(0.28, 0);

  return { group, frameMaterials: [frameMat], updateAnimation };
}

function buildZebraBlindModel(
  frameMat: THREE.MeshPhysicalMaterial,
  darkHardwareMat: THREE.MeshStandardMaterial,
  steelTrackMat: THREE.MeshStandardMaterial,
  architecturalWallMat: THREE.MeshStandardMaterial,
  zebraTextures: { map: THREE.CanvasTexture; alphaMap: THREE.CanvasTexture },
  isSoftwareGl: boolean
): ModelHandles {
  const group = new THREE.Group();
  const winW = 1.94;
  const winH = 2.02;
  const baseElevation = 0.34;

  // 1. Architectural window surround + recessed glass pane
  const surroundGroup = new THREE.Group();
  const sill = new THREE.Mesh(
    createBeveledBar(winW + 0.38, 0.075, 0.32, 0.008),
    architecturalWallMat
  );
  sill.position.set(0, baseElevation - 0.04, -0.06);
  sill.castShadow = true;
  sill.receiveShadow = true;

  const lintel = new THREE.Mesh(
    createBeveledBar(winW + 0.36, 0.12, 0.28, 0.008),
    architecturalWallMat
  );
  lintel.position.set(0, baseElevation + winH + 0.08, -0.06);
  lintel.castShadow = true;

  const leftPillar = new THREE.Mesh(
    createBeveledBar(0.15, winH + 0.12, 0.28, 0.006),
    architecturalWallMat
  );
  leftPillar.position.set(-(winW / 2 + 0.095), baseElevation + winH / 2, -0.06);
  leftPillar.castShadow = true;

  const rightPillar = leftPillar.clone();
  rightPillar.position.x = winW / 2 + 0.095;

  // Architectural support pedestal legs so window sits cleanly grounded on studio plinth y=0
  const baseWall = new THREE.Mesh(
    createBeveledBar(winW + 0.32, baseElevation - 0.07, 0.24, 0.006),
    architecturalWallMat
  );
  baseWall.position.set(0, (baseElevation - 0.07) / 2, -0.06);
  baseWall.receiveShadow = true;

  // Subtle sunlit glass pane behind blind
  const glassMat = new THREE.MeshPhysicalMaterial({
    color: '#D8E3EC',
    emissive: '#B6A07A',
    emissiveIntensity: 0.22,
    roughness: 0.1,
    metalness: 0.05,
    transmission: isSoftwareGl ? 0 : 0.45,
    transparent: true,
    opacity: isSoftwareGl ? 0.45 : 0.9,
  });
  const glassPane = new THREE.Mesh(new THREE.PlaneGeometry(winW - 0.06, winH - 0.04), glassMat);
  glassPane.position.set(0, baseElevation + winH / 2, -0.14);

  surroundGroup.add(sill, lintel, leftPillar, rightPillar, baseWall, glassPane);
  group.add(surroundGroup);

  // 2. Sculpted extruded aluminum top cassette pelmet + end caps + mounting brackets
  const cassetteGroup = new THREE.Group();
  const pelmetY = baseElevation + winH - 0.04;
  const pelmetBody = new THREE.Mesh(createBeveledBar(winW - 0.02, 0.11, 0.125, 0.014), frameMat);
  pelmetBody.position.set(0, pelmetY, 0.04);
  pelmetBody.castShadow = true;

  const leftCap = new THREE.Mesh(createBeveledBar(0.022, 0.114, 0.13, 0.005), darkHardwareMat);
  leftCap.position.set(-(winW / 2 - 0.005), pelmetY, 0.04);
  const rightCap = leftCap.clone();
  rightCap.position.x = winW / 2 - 0.005;

  // Inner extruded aluminum roller barrel
  const rollerTube = new THREE.Mesh(
    new THREE.CylinderGeometry(0.032, 0.032, winW - 0.08, 24),
    steelTrackMat
  );
  rollerTube.rotation.z = Math.PI / 2;
  rollerTube.position.set(0, pelmetY - 0.008, 0.035);

  // Top L-brackets
  const bracketGeo = createBeveledBar(0.06, 0.024, 0.11, 0.003);
  [-0.74, 0.74].forEach((bx) => {
    const br = new THREE.Mesh(bracketGeo, steelTrackMat);
    br.position.set(bx, pelmetY + 0.065, 0.035);
    cassetteGroup.add(br);
  });

  cassetteGroup.add(pelmetBody, leftCap, rightCap, rollerTube);
  group.add(cassetteGroup);

  // 3. Dual-layer alternating zebra fabric sheets (front + back phase-shifted!)
  const fabricGroup = new THREE.Group();
  const frontTexMap = zebraTextures.map.clone();
  frontTexMap.needsUpdate = true;
  const frontAlpha = zebraTextures.alphaMap.clone();
  frontAlpha.needsUpdate = true;

  const backTexMap = zebraTextures.map.clone();
  backTexMap.needsUpdate = true;
  const backAlpha = zebraTextures.alphaMap.clone();
  backAlpha.needsUpdate = true;

  const frontMat = new THREE.MeshStandardMaterial({
    map: frontTexMap,
    alphaMap: frontAlpha,
    transparent: true,
    roughness: 0.88,
    metalness: 0.0,
    side: THREE.DoubleSide,
  });
  const backMat = new THREE.MeshStandardMaterial({
    map: backTexMap,
    alphaMap: backAlpha,
    transparent: true,
    roughness: 0.9,
    metalness: 0.0,
    side: THREE.DoubleSide,
  });

  const fabricW = winW - 0.08;
  const frontSheet = new THREE.Mesh(new THREE.PlaneGeometry(fabricW, 1), frontMat);
  const backSheet = new THREE.Mesh(new THREE.PlaneGeometry(fabricW, 1), backMat);
  frontSheet.position.z = 0.062;
  backSheet.position.z = 0.022;
  fabricGroup.add(frontSheet, backSheet);

  // 4. Weighted elliptical anodized bottom rail bar + end caps
  const bottomBarGroup = new THREE.Group();
  const bottomRail = new THREE.Mesh(
    new THREE.CylinderGeometry(0.022, 0.022, fabricW + 0.02, 20),
    frameMat
  );
  bottomRail.rotation.z = Math.PI / 2;
  bottomRail.scale.set(1, 1, 1.35);
  bottomRail.castShadow = true;

  const tipGeo = new THREE.CylinderGeometry(0.024, 0.024, 0.016, 16);
  tipGeo.rotateZ(Math.PI / 2);
  const leftTip = new THREE.Mesh(tipGeo, darkHardwareMat);
  leftTip.position.x = -(fabricW / 2 + 0.012);
  const rightTip = leftTip.clone();
  rightTip.position.x = fabricW / 2 + 0.012;

  bottomBarGroup.add(bottomRail, leftTip, rightTip);
  bottomBarGroup.position.z = 0.042;
  fabricGroup.add(bottomBarGroup);
  group.add(fabricGroup);

  // 5. Instanced stainless-steel beaded pull chain + wall tensioner cleat
  const chainGroup = new THREE.Group();
  const beadCount = 38;
  const beadGeo = new THREE.SphereGeometry(0.0085, 8, 8);
  const beadInstanced = new THREE.InstancedMesh(beadGeo, steelTrackMat, beadCount);
  const dummy = new THREE.Object3D();
  const chainX = winW / 2 - 0.035;
  const chainTop = pelmetY - 0.04;
  const chainLen = 1.25;

  for (let i = 0; i < beadCount; i++) {
    const t = i / beadCount;
    const angle = t * Math.PI * 2;
    const isLeftStrand = i < beadCount / 2;
    const strandT = isLeftStrand ? i / (beadCount / 2) : (i - beadCount / 2) / (beadCount / 2);
    const y = isLeftStrand
      ? chainTop - strandT * chainLen
      : chainTop - (1 - strandT) * chainLen;
    const zOffset = Math.sin(angle) * 0.016;
    dummy.position.set(chainX + (isLeftStrand ? -0.012 : 0.012), y, 0.068 + zOffset);
    dummy.updateMatrix();
    beadInstanced.setMatrixAt(i, dummy.matrix);
  }
  beadInstanced.instanceMatrix.needsUpdate = true;
  beadInstanced.computeBoundingSphere();

  const tensionCleat = new THREE.Mesh(
    createBeveledBar(0.036, 0.072, 0.028, 0.004),
    darkHardwareMat
  );
  tensionCleat.position.set(chainX, chainTop - chainLen - 0.02, 0.068);
  chainGroup.add(beadInstanced, tensionCleat);
  group.add(chainGroup);

  const maxDrop = winH - 0.14;

  const updateAnimation = (operation: number, explode: number) => {
    // operation: 0 = raised compactly, 1 = lowered full height with privacy band shift
    const drop = 0.28 + operation * (maxDrop - 0.28);
    const topEdge = pelmetY - 0.045;

    frontSheet.scale.y = drop;
    frontSheet.position.y = topEdge - drop / 2;
    backSheet.scale.y = drop;
    backSheet.position.y = topEdge - drop / 2;

    // Shift dual-layer zebra phase smoothly so sheer/opaque stripes open & close privacy
    const repeatsY = drop * 1.35;
    frontTexMap.repeat.set(1, repeatsY);
    frontAlpha.repeat.set(1, repeatsY);
    backTexMap.repeat.set(1, repeatsY);
    backAlpha.repeat.set(1, repeatsY);

    const phaseShift = operation * 1.5;
    frontTexMap.offset.y = phaseShift;
    frontAlpha.offset.y = phaseShift;
    backTexMap.offset.y = -phaseShift * 0.65;
    backAlpha.offset.y = -phaseShift * 0.65;

    bottomBarGroup.position.y = topEdge - drop;
    rollerTube.rotation.x = operation * Math.PI * 6;

    // Exploded view separation
    surroundGroup.position.z = -explode * 0.36;
    cassetteGroup.position.y = explode * 0.24;
    cassetteGroup.position.z = explode * 0.16;
    fabricGroup.position.z = explode * 0.32;
    backSheet.position.z = 0.022 - explode * 0.12;
    chainGroup.position.x = explode * 0.22;
    chainGroup.position.z = explode * 0.28;
  };

  updateAnimation(0.68, 0);

  return { group, frameMaterials: [frameMat], updateAnimation };
}

function buildSS316WindowModel(
  frameMat: THREE.MeshPhysicalMaterial,
  darkHardwareMat: THREE.MeshStandardMaterial,
  steelTrackMat: THREE.MeshStandardMaterial,
  architecturalWallMat: THREE.MeshStandardMaterial,
  meshTex: THREE.CanvasTexture
): ModelHandles {
  const group = new THREE.Group();
  const winW = 1.72;
  const winH = 1.92;
  const sillY = 0.38;

  // 1. Recessed architectural wall frame + warm oak timber sill
  const surroundGroup = new THREE.Group();
  const oakSillMat = new THREE.MeshStandardMaterial({
    color: '#9A7248',
    roughness: 0.62,
    metalness: 0.04,
  });
  const oakSill = new THREE.Mesh(createBeveledBar(winW + 0.42, 0.072, 0.36, 0.01), oakSillMat);
  oakSill.position.set(0, sillY - 0.036, 0.02);
  oakSill.castShadow = true;
  oakSill.receiveShadow = true;

  const lowerWall = new THREE.Mesh(
    createBeveledBar(winW + 0.34, sillY - 0.072, 0.26, 0.006),
    architecturalWallMat
  );
  lowerWall.position.set(0, (sillY - 0.072) / 2, -0.05);
  lowerWall.receiveShadow = true;

  const leftJambWall = new THREE.Mesh(
    createBeveledBar(0.16, winH + 0.14, 0.26, 0.006),
    architecturalWallMat
  );
  leftJambWall.position.set(-(winW / 2 + 0.09), sillY + winH / 2 + 0.05, -0.05);
  leftJambWall.castShadow = true;

  const rightJambWall = leftJambWall.clone();
  rightJambWall.position.x = winW / 2 + 0.09;

  const headerWall = new THREE.Mesh(
    createBeveledBar(winW + 0.36, 0.14, 0.26, 0.006),
    architecturalWallMat
  );
  headerWall.position.set(0, sillY + winH + 0.08, -0.05);
  headerWall.castShadow = true;

  const sunlitBack = new THREE.Mesh(
    new THREE.PlaneGeometry(winW - 0.06, winH - 0.06),
    new THREE.MeshStandardMaterial({
      color: '#CAD7CF',
      emissive: '#7E9C8A',
      emissiveIntensity: 0.22,
      roughness: 0.9,
    })
  );
  sunlitBack.position.set(0, sillY + winH / 2, -0.15);

  surroundGroup.add(oakSill, lowerWall, leftJambWall, rightJambWall, headerWall, sunlitBack);
  group.add(surroundGroup);

  // 2. Outer extruded aluminum sub-frame (fixed inside reveal)
  const outerSubframe = new THREE.Group();
  const subT = 0.062;
  const subD = 0.085;
  const topSub = new THREE.Mesh(createBeveledBar(winW, subT, subD), frameMat);
  topSub.position.set(0, sillY + winH - subT / 2, 0);
  const botSub = new THREE.Mesh(createBeveledBar(winW, subT, subD), frameMat);
  botSub.position.set(0, sillY + subT / 2, 0);
  const leftSub = new THREE.Mesh(createBeveledBar(subT, winH, subD), frameMat);
  leftSub.position.set(-winW / 2 + subT / 2, sillY + winH / 2, 0);
  const rightSub = new THREE.Mesh(createBeveledBar(subT, winH, subD), frameMat);
  rightSub.position.set(winW / 2 - subT / 2, sillY + winH / 2, 0);
  outerSubframe.add(topSub, botSub, leftSub, rightSub);
  group.add(outerSubframe);

  // 3. Swinging sash group pivoted cleanly along the left hinge axis
  const sashW = winW - subT * 2 - 0.012;
  const sashH = winH - subT * 2 - 0.012;
  const hingePivotX = -winW / 2 + subT + 0.006;
  const sashPivot = new THREE.Group();
  sashPivot.position.set(hingePivotX, sillY + subT + 0.006, 0.028);

  const sashT = 0.064;
  const sashD = 0.056;
  const sashCenterX = sashW / 2;
  const sashCenterY = sashH / 2;

  const sashTop = new THREE.Mesh(createBeveledBar(sashW, sashT, sashD), frameMat);
  sashTop.position.set(sashCenterX, sashH - sashT / 2, 0);
  sashTop.castShadow = true;

  const sashBot = new THREE.Mesh(createBeveledBar(sashW, sashT, sashD), frameMat);
  sashBot.position.set(sashCenterX, sashT / 2, 0);
  sashBot.castShadow = true;

  const sashLeft = new THREE.Mesh(createBeveledBar(sashT, sashH, sashD), frameMat);
  sashLeft.position.set(sashT / 2, sashCenterY, 0);
  sashLeft.castShadow = true;

  const sashRight = new THREE.Mesh(createBeveledBar(sashT, sashH, sashD), frameMat);
  sashRight.position.set(sashW - sashT / 2, sashCenterY, 0);
  sashRight.castShadow = true;

  // EPDM perimeter seal gasket inside sash
  const gasketMesh = new THREE.Mesh(
    new THREE.BoxGeometry(sashW - sashT * 1.85, sashH - sashT * 1.85, 0.012),
    darkHardwareMat
  );
  gasketMesh.position.set(sashCenterX, sashCenterY, -0.012);
  // Make gasket a thin frame via 4 strips instead of solid block
  sashPivot.remove(gasketMesh);

  // Marine-grade SS 316 dark-anodized micro-mesh pane
  const ssMeshMat = new THREE.MeshStandardMaterial({
    color: '#1E2126',
    map: meshTex,
    roughness: 0.34,
    metalness: 0.82,
    transparent: true,
    opacity: 0.86,
    side: THREE.DoubleSide,
  });
  const ssMeshPane = new THREE.Mesh(
    new THREE.PlaneGeometry(sashW - sashT * 1.8, sashH - sashT * 1.8),
    ssMeshMat
  );
  ssMeshPane.position.set(sashCenterX, sashCenterY, 0.002);

  // 4. Three machined cylindrical barrel hinges (LatheGeometry) with brass pins
  const hingeProfile = [
    new THREE.Vector2(0.001, -0.055),
    new THREE.Vector2(0.016, -0.052),
    new THREE.Vector2(0.016, 0.052),
    new THREE.Vector2(0.001, 0.055),
  ];
  const hingeBarrelGeo = new THREE.LatheGeometry(hingeProfile, 16);
  const brassPinMat = new THREE.MeshStandardMaterial({
    color: '#D4AF5A',
    roughness: 0.25,
    metalness: 0.92,
  });
  const hingesGroup = new THREE.Group();
  [0.24, sashCenterY, sashH - 0.24].forEach((hy) => {
    const barrel = new THREE.Mesh(hingeBarrelGeo, steelTrackMat);
    barrel.position.set(0.004, hy, 0.022);
    barrel.castShadow = true;
    const pinCap = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.125, 12), brassPinMat);
    pinCap.position.set(0.004, hy, 0.022);
    hingesGroup.add(barrel, pinCap);
  });

  // 5. Architectural multipoint lever handle on escutcheon backplate
  const handleGroup = new THREE.Group();
  const escutcheon = new THREE.Mesh(
    createBeveledBar(0.036, 0.145, 0.014, 0.004),
    steelTrackMat
  );
  escutcheon.position.set(sashW - sashT / 2, sashCenterY, 0.034);

  const leverSpindle = new THREE.Mesh(
    new THREE.CylinderGeometry(0.01, 0.01, 0.042, 12),
    steelTrackMat
  );
  leverSpindle.rotation.x = Math.PI / 2;
  leverSpindle.position.set(sashW - sashT / 2, sashCenterY + 0.022, 0.052);

  const leverArm = new THREE.Mesh(
    createBeveledBar(0.022, 0.125, 0.016, 0.005),
    steelTrackMat
  );
  leverArm.position.set(sashW - sashT / 2, sashCenterY - 0.032, 0.072);
  leverArm.castShadow = true;

  handleGroup.add(escutcheon, leverSpindle, leverArm);

  sashPivot.add(sashTop, sashBot, sashLeft, sashRight, ssMeshPane, hingesGroup, handleGroup);
  group.add(sashPivot);

  const updateAnimation = (operation: number, explode: number) => {
    // Swing casement sash smoothly from 0° closed to 74° open
    sashPivot.rotation.y = -operation * THREE.MathUtils.degToRad(74);
    // Subtle lever handle turn as sash unlocks
    const unlockTilt = Math.min(1, operation * 4);
    leverArm.rotation.z = unlockTilt * THREE.MathUtils.degToRad(32);

    // Exploded layer view
    surroundGroup.position.z = -explode * 0.36;
    outerSubframe.position.z = explode * 0.02;
    sashPivot.position.z = 0.028 + explode * 0.32;
    ssMeshPane.position.z = 0.002 + explode * 0.22;
    handleGroup.position.z = explode * 0.18;
  };

  updateAnimation(0.32, 0);

  return { group, frameMaterials: [frameMat], updateAnimation };
}

export const Studio3DShowcase: React.FC<Studio3DShowcaseProps> = ({
  activeModel,
  onSelectModel,
  activeFinish,
  onSelectFinish,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [operation, setOperation] = useState<number>(0.32);
  const [explode, setExplode] = useState<number>(0);
  const [cameraPreset, setCameraPreset] = useState<CameraPresetId>('angle');
  const [dockCollapsed, setDockCollapsed] = useState<boolean>(false);
  const [webglError, setWebglError] = useState<boolean>(false);

  // Store live interactive parameters in refs so React UI never tears down WebGLRenderer
  const stateRef = useRef({
    activeModel,
    activeFinish,
    operation,
    explode,
    cameraPreset,
    presetPending: false,
    targetZoomDist: null as number | null,
  });

  const requestRenderRef = useRef<() => void>(() => {});
  const applyModelRef = useRef<(m: StudioModelId) => void>(() => {});
  const applyFinishRef = useRef<(f: FrameFinishId) => void>(() => {});
  const zoomByRef = useRef<(delta: number) => void>(() => {});

  useEffect(() => {
    stateRef.current.activeModel = activeModel;
    applyModelRef.current(activeModel);
    requestRenderRef.current();
  }, [activeModel]);

  useEffect(() => {
    stateRef.current.activeFinish = activeFinish;
    applyFinishRef.current(activeFinish);
    requestRenderRef.current();
  }, [activeFinish]);

  useEffect(() => {
    stateRef.current.operation = operation;
    requestRenderRef.current();
  }, [operation]);

  useEffect(() => {
    stateRef.current.explode = explode;
    requestRenderRef.current();
  }, [explode]);

  useEffect(() => {
    stateRef.current.cameraPreset = cameraPreset;
    stateRef.current.presetPending = true;
    requestRenderRef.current();
  }, [cameraPreset]);

  // Keyboard shortcut 'H' to toggle collapsible control dock (Zen inspection mode)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }
      if (e.key === 'h' || e.key === 'H') {
        setDockCollapsed((prev) => !prev);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  // Stable Three.js WebGL initialization (runs once on mount)
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const isSoftwareGl = detectSoftwareGl();
    let renderer: THREE.WebGLRenderer;

    try {
      renderer = new THREE.WebGLRenderer({
        antialias: !isSoftwareGl,
        powerPreference: 'high-performance',
      });
    } catch {
      setWebglError(true);
      return;
    }

    const width = container.clientWidth || 1024;
    const height = container.clientHeight || 640;

    renderer.setSize(width, height);
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const bgColor = new THREE.Color('#151413');
    scene.background = bgColor;
    scene.fog = new THREE.FogExp2('#151413', 0.055);

    // Mandatory studio environment reflection via RoomEnvironment + PMREMGenerator
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const roomEnv = new RoomEnvironment();
    const envTarget = pmremGenerator.fromScene(roomEnv, 0.04);
    scene.environment = envTarget.texture;
    roomEnv.dispose();
    pmremGenerator.dispose();

    const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 60);
    const initialPreset = CAMERA_PRESETS.angle;
    camera.position.set(...initialPreset.pos);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(...initialPreset.target);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.07;
    // Disable default wheel zoom & pan so scrolling the webpage over the 3D viewport always works naturally
    controls.enableZoom = false;
    controls.enablePan = false;
    controls.minDistance = 1.8;
    controls.maxDistance = 8.2;
    controls.maxPolarAngle = Math.PI / 2 - 0.04;
    controls.minPolarAngle = 0.25;
    controls.update();

    // Allow natural vertical touch scrolling on mobile while keeping horizontal orbit smooth
    renderer.domElement.style.touchAction = 'pan-y';

    // Cancel any scripted camera transition immediately when user drags
    controls.addEventListener('start', () => {
      stateRef.current.presetPending = false;
      stateRef.current.targetZoomDist = null;
    });

    const zoomBy = (deltaDistance: number) => {
      stateRef.current.presetPending = false;
      const currentDist =
        stateRef.current.targetZoomDist ?? camera.position.distanceTo(controls.target);
      stateRef.current.targetZoomDist = THREE.MathUtils.clamp(
        currentDist + deltaDistance,
        controls.minDistance,
        controls.maxDistance
      );
      requestRender();
    };
    zoomByRef.current = zoomBy;

    // Optional Ctrl/Cmd + Wheel zoom for power users without ever blocking normal page scroll
    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        zoomBy(e.deltaY > 0 ? 0.55 : -0.55);
      }
    };
    renderer.domElement.addEventListener('wheel', onWheel, { passive: false });

    // Studio 3-point warm/cool lighting rig
    const keyLight = new THREE.DirectionalLight('#FFF3E0', 2.45);
    keyLight.position.set(4.5, 6.2, 4.8);
    keyLight.castShadow = !isSoftwareGl;
    keyLight.shadow.mapSize.set(1024, 1024);
    keyLight.shadow.camera.near = 1;
    keyLight.shadow.camera.far = 18;
    keyLight.shadow.camera.left = -4.2;
    keyLight.shadow.camera.right = 4.2;
    keyLight.shadow.camera.top = 4.2;
    keyLight.shadow.camera.bottom = -4.2;
    keyLight.shadow.bias = -0.0005;
    keyLight.shadow.normalBias = 0.02;
    scene.add(keyLight);

    const hemiFill = new THREE.HemisphereLight('#C8DCF2', '#26231F', 0.85);
    scene.add(hemiFill);

    const rimLight = new THREE.DirectionalLight('#E6C47E', 1.15);
    rimLight.position.set(-4.2, 3.8, -4.4);
    scene.add(rimLight);

    if (!isSoftwareGl) {
      RectAreaLightUniformsLib.init();
      const softbox = new THREE.RectAreaLight('#FFF8EC', 2.4, 3.2, 1.8);
      softbox.position.set(2.4, 3.2, 3.1);
      softbox.lookAt(0, 1.35, 0);
      scene.add(softbox);
    }

    const maxAniso = renderer.capabilities.getMaxAnisotropy();

    // Procedural studio textures (zero external 404 dependencies)
    const pleatedMeshTex = createMeshWeaveTexture(maxAniso, 'rgba(34, 38, 44, 0.92)', 10, 1.5);
    const ss316MeshTex = createMeshWeaveTexture(maxAniso, 'rgba(72, 78, 86, 0.96)', 8, 1.8);
    const zebraTextures = createZebraFabricTexture(maxAniso);
    const teakWoodTex = createTeakWoodTexture(maxAniso);
    const plinthTex = createPlinthTexture(maxAniso);
    const contactShadowTex = createContactShadowTexture();

    // Studio floor & circular travertine plinth (y = 0 top surface for bottom-center pivots)
    const studioFloor = new THREE.Mesh(
      new THREE.PlaneGeometry(36, 36),
      new THREE.MeshStandardMaterial({
        color: '#171614',
        roughness: 0.92,
        metalness: 0.04,
      })
    );
    studioFloor.rotation.x = -Math.PI / 2;
    studioFloor.position.y = -0.14;
    studioFloor.receiveShadow = true;
    scene.add(studioFloor);

    const plinthMat = new THREE.MeshStandardMaterial({
      color: '#2A2825',
      map: plinthTex,
      roughness: 0.72,
      metalness: 0.08,
    });
    const plinth = new THREE.Mesh(new THREE.CylinderGeometry(2.15, 2.26, 0.14, 48), plinthMat);
    plinth.position.y = -0.07;
    plinth.receiveShadow = true;
    scene.add(plinth);

    const brassPlinthRing = new THREE.Mesh(
      new THREE.TorusGeometry(2.16, 0.012, 12, 64),
      new THREE.MeshStandardMaterial({
        color: '#C4A259',
        roughness: 0.25,
        metalness: 0.9,
      })
    );
    brassPlinthRing.rotation.x = Math.PI / 2;
    brassPlinthRing.position.y = -0.004;
    scene.add(brassPlinthRing);

    // Soft radial contact shadow plane directly beneath the architectural model
    const contactShadow = new THREE.Mesh(
      new THREE.PlaneGeometry(3.2, 1.5),
      new THREE.MeshBasicMaterial({
        map: contactShadowTex,
        transparent: true,
        depthWrite: false,
        opacity: 0.52,
      })
    );
    contactShadow.rotation.x = -Math.PI / 2;
    contactShadow.position.y = 0.002;
    scene.add(contactShadow);

    // Shared PBR architectural material library
    const frameMat = new THREE.MeshPhysicalMaterial({
      color: '#C4A259',
      roughness: 0.24,
      metalness: 0.88,
      clearcoat: 0.35,
      clearcoatRoughness: 0.22,
    });

    const darkHardwareMat = new THREE.MeshStandardMaterial({
      color: '#1E2023',
      roughness: 0.48,
      metalness: 0.52,
    });

    const steelTrackMat = new THREE.MeshStandardMaterial({
      color: '#A7ADB6',
      roughness: 0.28,
      metalness: 0.88,
    });

    const architecturalWallMat = new THREE.MeshStandardMaterial({
      color: '#DDD6CA',
      roughness: 0.86,
      metalness: 0.02,
    });

    // Assemble all 3 composite procedural models
    const models: Record<StudioModelId, ModelHandles> = {
      pleated: buildPleatedDoorModel(
        frameMat,
        darkHardwareMat,
        steelTrackMat,
        architecturalWallMat,
        pleatedMeshTex
      ),
      zebra: buildZebraBlindModel(
        frameMat,
        darkHardwareMat,
        steelTrackMat,
        architecturalWallMat,
        zebraTextures,
        isSoftwareGl
      ),
      ss316: buildSS316WindowModel(
        frameMat,
        darkHardwareMat,
        steelTrackMat,
        architecturalWallMat,
        ss316MeshTex
      ),
    };

    const stageRoot = new THREE.Group();
    Object.entries(models).forEach(([id, handle]) => {
      handle.group.visible = id === stateRef.current.activeModel;
      stageRoot.add(handle.group);
    });
    scene.add(stageRoot);

    const applyModel = (modelId: StudioModelId) => {
      (Object.keys(models) as StudioModelId[]).forEach((id) => {
        models[id].group.visible = id === modelId;
      });
    };

    const applyFinish = (finishId: FrameFinishId) => {
      const spec = FRAME_FINISHES.find((f) => f.id === finishId) ?? FRAME_FINISHES[0];
      frameMat.color.set(spec.hex);
      frameMat.roughness = spec.roughness;
      frameMat.metalness = spec.metalness;
      frameMat.map = finishId === 'teak' ? teakWoodTex : null;
      frameMat.needsUpdate = true;
    };

    applyModelRef.current = applyModel;
    applyFinishRef.current = applyFinish;
    applyFinish(stateRef.current.activeFinish);

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    // Damped state for smooth physical gliding
    let currentOp = stateRef.current.operation;
    let currentExplode = stateRef.current.explode;
    let frameId = 0;
    let renderBusy = false;
    let renderDirty = false;
    let lastTime = performance.now();
    let disposed = false;

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync?.(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        if (disposed) return;
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    }

    function requestRender() {
      if (disposed) return;
      if (renderBusy) {
        renderDirty = true;
        return;
      }
      renderBusy = true;
      frameId = requestAnimationFrame((now) => {
        if (disposed) return;
        renderDirty = false;
        const dt = Math.min(0.05, Math.max(0.001, (now - lastTime) / 1000));
        lastTime = now;

        const targetOp = stateRef.current.operation;
        const targetExplode = stateRef.current.explode;
        const opDelta = Math.abs(targetOp - currentOp);
        const expDelta = Math.abs(targetExplode - currentExplode);

        if (isSoftwareGl) {
          currentOp = targetOp;
          currentExplode = targetExplode;
        } else {
          currentOp = THREE.MathUtils.damp(currentOp, targetOp, 9.5, dt);
          currentExplode = THREE.MathUtils.damp(currentExplode, targetExplode, 8.5, dt);
        }

        models[stateRef.current.activeModel].updateAnimation(currentOp, currentExplode);

        let keepAnimating = !isSoftwareGl && (opDelta > 0.001 || expDelta > 0.001);

        if (stateRef.current.presetPending) {
          const p = CAMERA_PRESETS[stateRef.current.cameraPreset];
          _camTargetPos.set(...p.pos);
          _camLookTarget.set(...p.target);
          if (isSoftwareGl) {
            camera.position.copy(_camTargetPos);
            controls.target.copy(_camLookTarget);
            stateRef.current.presetPending = false;
          } else {
            const alpha = 1 - Math.exp(-7 * dt);
            camera.position.lerp(_camTargetPos, alpha);
            controls.target.lerp(_camLookTarget, alpha);
            if (
              camera.position.distanceTo(_camTargetPos) < 0.015 &&
              controls.target.distanceTo(_camLookTarget) < 0.015
            ) {
              camera.position.copy(_camTargetPos);
              controls.target.copy(_camLookTarget);
              stateRef.current.presetPending = false;
            } else {
              keepAnimating = true;
            }
          }
        } else if (stateRef.current.targetZoomDist !== null) {
          _zoomOffset.copy(camera.position).sub(controls.target);
          const curDist = _zoomOffset.length();
          const targetDist = stateRef.current.targetZoomDist;
          if (isSoftwareGl || Math.abs(targetDist - curDist) < 0.01) {
            _zoomOffset.setLength(targetDist);
            camera.position.copy(controls.target).add(_zoomOffset);
            stateRef.current.targetZoomDist = null;
          } else {
            const nextDist = THREE.MathUtils.damp(curDist, targetDist, 9, dt);
            _zoomOffset.setLength(nextDist);
            camera.position.copy(controls.target).add(_zoomOffset);
            keepAnimating = true;
          }
        }

        const controlsChanged = controls.update();
        if (controlsChanged && !isSoftwareGl) {
          keepAnimating = true;
        }

        renderer.render(scene, camera);

        const done = () => {
          renderBusy = false;
          if (renderDirty || keepAnimating) {
            requestRender();
          }
        };

        if (isSoftwareGl) {
          afterDraw(done);
        } else {
          done();
        }
      });
    }

    requestRenderRef.current = requestRender;
    controls.addEventListener('change', requestRender);

    const onContextLost = (e: Event) => {
      e.preventDefault();
      setWebglError(true);
    };
    renderer.domElement.addEventListener('webglcontextlost', onContextLost);

    const resizeObserver = new ResizeObserver(() => {
      if (!container || disposed) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      if (w <= 0 || h <= 0) return;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      requestRender();
    });
    resizeObserver.observe(container);

    // Draw initial frame
    requestRender();

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      resizeObserver.disconnect();
      controls.removeEventListener('change', requestRender);
      controls.dispose();
      renderer.domElement.removeEventListener('wheel', onWheel);
      renderer.domElement.removeEventListener('webglcontextlost', onContextLost);

      scene.traverse((obj) => {
        if ((obj as THREE.Mesh).isMesh) {
          const mesh = obj as THREE.Mesh;
          mesh.geometry?.dispose();
          if (Array.isArray(mesh.material)) {
            mesh.material.forEach((m) => m.dispose());
          } else {
            mesh.material?.dispose();
          }
        }
      });

      pleatedMeshTex.dispose();
      ss316MeshTex.dispose();
      zebraTextures.map.dispose();
      zebraTextures.alphaMap.dispose();
      teakWoodTex.dispose();
      plinthTex.dispose();
      contactShadowTex.dispose();
      envTarget.dispose();
      renderer.dispose();
    };
  }, []);

  const meta = MODEL_META[activeModel];
  const displayOpValue =
    activeModel === 'ss316'
      ? `${Math.round(operation * 74)}°`
      : `${Math.round(operation * 100)}%`;

  const handleResetView = () => {
    setOperation(activeModel === 'zebra' ? 0.68 : 0.3);
    setExplode(0);
    setCameraPreset('angle');
    stateRef.current.targetZoomDist = null;
    stateRef.current.presetPending = true;
    requestRenderRef.current();
  };

  return (
    <section
      id="studio-3d"
      aria-label="Interactive 3D Architectural Product Studio"
      className="relative w-full bg-[#151413] text-[#F5F3EE] overflow-hidden border-y border-white/10"
    >
      {/* Full-bleed 3D Viewport Container */}
      <div className="relative w-full h-[640px] lg:h-[780px]">
        {/* Isolated WebGL canvas host outside React HUD overlays */}
        <div
          ref={mountRef}
          className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing"
          aria-label={`Interactive 3D view of ${meta.title}`}
        />

        {/* Graceful fallback if WebGL context is unavailable */}
        {webglError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#181715] px-6 text-center z-20">
            <p className="font-display text-2xl text-[#F5F3EE] mb-2">{meta.title}</p>
            <p className="text-sm text-neutral-400 max-w-md mb-6">
              Interactive 3D inspection requires WebGL support. You can still browse our real installation
              gallery and custom quote calculator below.
            </p>
            <a
              href="#solutions"
              className="px-5 py-2.5 text-sm font-medium bg-[#D4AF5A] text-[#141413] rounded-md"
            >
              View Product Specifications
            </a>
          </div>
        )}

        {/* Minimal Top-Left Architectural Title & Model Selector (zero clutter, zero pills) */}
        <div className="pointer-events-none absolute top-5 left-5 right-5 z-10 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="pointer-events-auto max-w-md bg-[#161513]/92 border border-white/12 rounded-lg px-4 py-3">
            <p className="text-xs font-mono tracking-wide text-[#D4AF5A] mb-1">
              Interactive 3D Studio · Drag to Orbit · Use + / − to Zoom
            </p>
            <h2 className="font-display text-xl sm:text-2xl font-medium text-[#FAFAF8] leading-snug">
              {meta.title}
            </h2>
            <p className="text-xs text-neutral-300 mt-1">{meta.subtitle}</p>
          </div>

          {/* Model Switcher Segmented Control */}
          <div
            className="pointer-events-auto inline-flex items-center gap-1 p-1 bg-[#161513]/92 border border-white/12 rounded-lg self-start"
            role="tablist"
            aria-label="Select 3D product system"
          >
            {(
              [
                { id: 'pleated', label: 'Pleated Door' },
                { id: 'zebra', label: 'Zebra Blind' },
                { id: 'ss316', label: 'SS 316 Screen' },
              ] as { id: StudioModelId; label: string }[]
            ).map((tab) => {
              const active = activeModel === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => {
                    onSelectModel(tab.id);
                    setOperation(tab.id === 'zebra' ? 0.68 : 0.32);
                  }}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    active
                      ? 'bg-[#D4AF5A] text-[#141413]'
                      : 'text-neutral-300 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Unified Collapsible Bottom Control Dock (flexbox centered, zero double-translate clipping, no backdrop-filter over WebGL) */}
        <div className="pointer-events-none absolute inset-x-0 bottom-5 z-10 flex justify-center px-4">
          <div
            className="pointer-events-auto w-full max-w-[1040px] flex flex-col items-center transition-transform duration-200"
            style={{
              transform: dockCollapsed ? 'translateY(calc(100% - 34px))' : 'translateY(0)',
            }}
          >
            {/* Collapse / Expand Handle */}
            <button
              type="button"
              onClick={() => setDockCollapsed((c) => !c)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-neutral-200 bg-[#181715]/96 border border-b-0 border-white/15 rounded-t-lg hover:text-white cursor-pointer whitespace-nowrap shrink-0"
              aria-expanded={!dockCollapsed}
            >
              {dockCollapsed ? (
                <>
                  <ChevronUp className="w-3.5 h-3.5 text-[#D4AF5A]" />
                  <span>Show Studio Controls</span>
                </>
              ) : (
                <>
                  <ChevronDown className="w-3.5 h-3.5 text-[#D4AF5A]" />
                  <span>Hide Controls</span>
                </>
              )}
            </button>

            {/* Compact Horizontal Dock Body */}
            <div className="w-full bg-[#181715]/96 border border-white/15 rounded-xl px-4 py-3.5 shadow-2xl">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:flex lg:items-center lg:justify-between gap-4 lg:gap-5">
                {/* Operation Slider */}
                <div className="lg:w-[180px] flex flex-col gap-1.5 shrink-0">
                  <div className="flex items-center justify-between text-xs gap-2">
                    <span className="inline-flex items-center gap-1.5 text-neutral-300 font-medium whitespace-nowrap">
                      <SlidersHorizontal className="w-3.5 h-3.5 text-[#D4AF5A] shrink-0" />
                      {meta.operationLabel}
                    </span>
                    <span className="font-mono tabular-nums text-[#D4AF5A] shrink-0">
                      {displayOpValue}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.01}
                    value={operation}
                    onChange={(e) => setOperation(parseFloat(e.target.value))}
                    aria-label={meta.operationLabel}
                    className="studio-slider w-full"
                  />
                </div>

                {/* Exploded Assembly Slider */}
                <div className="lg:w-[140px] flex flex-col gap-1.5 shrink-0">
                  <div className="flex items-center justify-between text-xs gap-2">
                    <span className="inline-flex items-center gap-1.5 text-neutral-300 font-medium whitespace-nowrap">
                      <Layers className="w-3.5 h-3.5 text-[#D4AF5A] shrink-0" />
                      Assembly
                    </span>
                    <span className="font-mono tabular-nums text-neutral-300 shrink-0">
                      {Math.round(explode * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.01}
                    value={explode}
                    onChange={(e) => setExplode(parseFloat(e.target.value))}
                    aria-label="Exploded assembly inspection"
                    className="studio-slider w-full"
                  />
                </div>

                {/* Frame Finish Swatches */}
                <div className="lg:w-[195px] flex flex-col gap-1.5 shrink-0">
                  <div className="flex items-center justify-between text-xs gap-2">
                    <span className="text-neutral-400 whitespace-nowrap">Finish</span>
                    <span className="text-neutral-200 font-medium truncate max-w-[130px]">
                      {FRAME_FINISHES.find((f) => f.id === activeFinish)?.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {FRAME_FINISHES.map((finish) => {
                      const selected = activeFinish === finish.id;
                      return (
                        <button
                          key={finish.id}
                          type="button"
                          onClick={() => onSelectFinish(finish.id)}
                          title={finish.name}
                          aria-label={`Select ${finish.name} finish`}
                          aria-pressed={selected}
                          className={`w-6 h-6 rounded-full border-2 transition-transform cursor-pointer shrink-0 ${
                            selected
                              ? 'border-[#D4AF5A] scale-110'
                              : 'border-white/25 hover:border-white/60'
                          }`}
                          style={{ backgroundColor: finish.swatchHex }}
                        />
                      );
                    })}
                  </div>
                </div>

                {/* Camera Presets + Zoom +/- + Reset (Single Unwrapped Row) */}
                <div className="md:col-span-2 lg:col-span-1 flex items-center justify-start lg:justify-end gap-1 flex-wrap lg:flex-nowrap shrink-0">
                  {(Object.keys(CAMERA_PRESETS) as CameraPresetId[]).map((presetKey) => {
                    const active = cameraPreset === presetKey;
                    return (
                      <button
                        key={presetKey}
                        type="button"
                        onClick={() => {
                          setCameraPreset(presetKey);
                          stateRef.current.targetZoomDist = null;
                          stateRef.current.presetPending = true;
                          requestRenderRef.current();
                        }}
                        className={`px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                          active
                            ? 'bg-white/15 text-white border border-white/25'
                            : 'text-neutral-300 hover:text-white hover:bg-white/8 border border-transparent'
                        }`}
                      >
                        {CAMERA_PRESETS[presetKey].label}
                      </button>
                    );
                  })}

                  <span
                    className="hidden sm:inline-block w-px h-4 bg-white/15 mx-1 shrink-0"
                    aria-hidden="true"
                  />

                  <button
                    type="button"
                    onClick={() => zoomByRef.current(-0.7)}
                    title="Zoom in"
                    aria-label="Zoom in 3D view"
                    className="p-1.5 text-neutral-300 hover:text-white hover:bg-white/10 rounded-md transition-colors cursor-pointer shrink-0"
                  >
                    <ZoomIn className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => zoomByRef.current(0.7)}
                    title="Zoom out"
                    aria-label="Zoom out 3D view"
                    className="p-1.5 text-neutral-300 hover:text-white hover:bg-white/10 rounded-md transition-colors cursor-pointer shrink-0"
                  >
                    <ZoomOut className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={handleResetView}
                    title="Reset 3D Studio view"
                    aria-label="Reset 3D Studio view"
                    className="p-1.5 text-neutral-300 hover:text-white hover:bg-white/10 rounded-md transition-colors cursor-pointer shrink-0"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
