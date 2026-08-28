import * as THREE from "three";
import { LENS } from "./config";

const vertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

// Mobile uses the same refraction, chromatic split, rim-wave and blue-ring
// language as the desktop pass, with fewer samples and one active lens.
const fragmentShader = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  uniform sampler2D uPoster;
  uniform vec4 uPosterRect;
  uniform vec2 uCenter;
  uniform vec2 uLensSize;
  uniform float uAspect;
  uniform float uTime;
  uniform float uOpacity;
  uniform float uSwipe;
  uniform vec3 uBlueColor;

  vec4 posterAt(vec2 uv) {
    vec2 local = (uv - uPosterRect.xy) / uPosterRect.zw;
    if (local.x < 0.0 || local.x > 1.0 || local.y < 0.0 || local.y > 1.0) return vec4(0.0);
    return texture2D(uPoster, vec2(local.x, 1.0 - local.y));
  }

  void main() {
    vec2 p = vUv - uCenter;
    p.x *= uAspect;
    float rotation = radians(${LENS.rotation.toFixed(1)}) + uSwipe * 0.12;
    float ca = cos(rotation);
    float sa = sin(rotation);
    p = mat2(ca, -sa, sa, ca) * p;
    float distanceToLens = length(p / uLensSize);
    if (distanceToLens > 1.0) discard;

    float nd = clamp(distanceToLens, 0.0, 1.0);
    vec2 offset = vUv - uCenter;
    vec2 radial = normalize(offset + 0.00001);
    vec2 tangent = vec2(-radial.y, radial.x);
    float angle = atan(p.y, p.x);
    float rim = smoothstep(${LENS.rimStart.toFixed(3)}, 1.0, nd);
    float wave = sin(angle * ${LENS.rimFreq1.toFixed(1)} + uTime * 0.42) * 0.55
      + sin(angle * ${LENS.rimFreq2.toFixed(1)} - uTime * 0.28) * 0.25;
    vec2 fluid = tangent * wave * rim * 0.055 + radial * uSwipe * rim * 0.018;
    vec2 baseUv = vUv + fluid;
    vec2 split = offset * ${Math.min(LENS.dispersion, 8).toFixed(1)} * 0.0015 * smoothstep(0.5, 1.0, nd);

    vec4 centerSample = posterAt(baseUv);
    vec4 redSample = posterAt(baseUv - split);
    vec4 blueSample = posterAt(baseUv + split);
    vec3 colour = vec3(redSample.r, centerSample.g, blueSample.b);

    float ringDistance = nd * 0.5;
    float ring = exp(-pow((ringDistance - ${LENS.ringRadius.toFixed(3)}) / max(${Math.max(LENS.ringWidth, 0.008).toFixed(3)}, 0.008), 2.0));
    float shimmer = sin(angle * ${LENS.shimmerFreq.toFixed(1)} + uTime * ${Math.min(LENS.shimmerSpeed, 2.4).toFixed(1)}) * ${LENS.shimmerDepth.toFixed(2)} + ${
      (1 - LENS.shimmerDepth).toFixed(2)
    };
    float aura = exp(-pow((ringDistance - ${LENS.ringRadius.toFixed(3)}) / 0.052, 2.0));
    colour += uBlueColor * ring * shimmer * 0.82;
    colour += uBlueColor * aura * 0.2;
    colour += vec3(exp(-pow((ringDistance - ${LENS.rimLinePos.toFixed(3)}) / 0.010, 2.0)) * 0.34);

    float edgeAlpha = smoothstep(1.0, 0.91, nd);
    float sourceAlpha = max(max(centerSample.a, redSample.a), blueSample.a);
    float glassAlpha = max(sourceAlpha, clamp(ring * 0.9 + aura * 0.22, 0.0, 1.0));
    gl_FragColor = vec4(colour, edgeAlpha * glassAlpha * uOpacity);
  }
`;

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function createMobileLiquidLens(mount, imageElement) {
  if (!mount || !imageElement) return null;

  let width = Math.max(1, mount.clientWidth);
  let height = Math.max(1, mount.clientHeight);
  let currentImage = imageElement;
  let running = true;
  let inView = true;
  let destroyed = false;
  let swipeTarget = 0;
  let swipeCurrent = 0;
  let frame = 0;

  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: false, powerPreference: "low-power" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.setSize(width, height, false);
  renderer.setClearColor(0x000000, 0);
  renderer.domElement.className = "mobile-liquid-canvas";
  renderer.domElement.style.opacity = "0";
  mount.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.Camera();
  const loader = new THREE.TextureLoader();
  loader.setCrossOrigin("anonymous");
  const emptyTexture = new THREE.Texture();
  const uniforms = {
    uPoster: { value: emptyTexture },
    uPosterRect: { value: new THREE.Vector4(0, 0, 1, 1) },
    uCenter: { value: new THREE.Vector2(0.78, 0.42) },
    uLensSize: { value: new THREE.Vector2(0.29, 0.43) },
    uAspect: { value: width / height },
    uTime: { value: 0 },
    uOpacity: { value: 1 },
    uSwipe: { value: 0 },
    uBlueColor: { value: new THREE.Color(LENS.blueColor) },
  };
  const material = new THREE.ShaderMaterial({
    uniforms,
    vertexShader,
    fragmentShader,
    transparent: true,
    depthTest: false,
    depthWrite: false,
  });
  const geometry = new THREE.PlaneGeometry(2, 2);
  const quad = new THREE.Mesh(geometry, material);
  scene.add(quad);

  let texture = null;
  let textureToken = 0;

  function updateTexture(image) {
    if (!image?.src) return;
    currentImage = image;
    const token = ++textureToken;
    loader.load(image.currentSrc || image.src, (nextTexture) => {
      if (destroyed || token !== textureToken) {
        nextTexture.dispose();
        return;
      }
      nextTexture.colorSpace = THREE.SRGBColorSpace;
      nextTexture.minFilter = THREE.LinearFilter;
      nextTexture.magFilter = THREE.LinearFilter;
      texture?.dispose();
      texture = nextTexture;
      uniforms.uPoster.value = nextTexture;
      refreshLayout();
    });
  }

  function refreshLayout() {
    if (destroyed || !mount.clientWidth || !mount.clientHeight) return;
    width = mount.clientWidth;
    height = mount.clientHeight;
    renderer.setSize(width, height, false);
    uniforms.uAspect.value = width / height;

    const mountRect = mount.getBoundingClientRect();
    const imageRect = currentImage?.getBoundingClientRect();
    if (!imageRect?.width || !imageRect?.height) return;
    let renderedLeft = imageRect.left;
    let renderedTop = imageRect.top;
    let renderedWidth = imageRect.width;
    let renderedHeight = imageRect.height;
    const sourceAspect = currentImage.naturalWidth / Math.max(currentImage.naturalHeight, 1);
    const boxAspect = imageRect.width / imageRect.height;
    if (getComputedStyle(currentImage).objectFit === "contain" && sourceAspect > 0) {
      if (sourceAspect > boxAspect) {
        renderedHeight = imageRect.width / sourceAspect;
        renderedTop += (imageRect.height - renderedHeight) / 2;
      } else {
        renderedWidth = imageRect.height * sourceAspect;
        renderedLeft += (imageRect.width - renderedWidth) / 2;
      }
    }
    const left = (renderedLeft - mountRect.left) / width;
    const bottom = 1 - (renderedTop + renderedHeight - mountRect.top) / height;
    const posterWidth = renderedWidth / width;
    const posterHeight = renderedHeight / height;
    uniforms.uPosterRect.value.set(left, bottom, posterWidth, posterHeight);

    const lensX = clamp(left + posterWidth * 0.84, 0.12, 1.02);
    const lensY = clamp(bottom + posterHeight * 0.3, 0.12, 0.86);
    uniforms.uCenter.value.set(lensX, lensY);
    const lensRadiusPixels = clamp(renderedWidth * 0.3, 82, 180);
    const lensRadius = lensRadiusPixels / height;
    uniforms.uLensSize.value.set(lensRadius * 0.86, lensRadius);
  }

  function tick(time) {
    if (destroyed) return;
    if (running && inView && document.visibilityState !== "hidden") {
      swipeCurrent += (swipeTarget - swipeCurrent) * 0.09;
      uniforms.uSwipe.value = swipeCurrent;
      uniforms.uTime.value = time * 0.001;
      renderer.render(scene, camera);
    }
    frame = requestAnimationFrame(tick);
  }

  const resizeObserver = new ResizeObserver(refreshLayout);
  resizeObserver.observe(mount);
  const intersectionObserver = new IntersectionObserver(([entry]) => { inView = entry.isIntersecting; }, { rootMargin: "80px" });
  intersectionObserver.observe(mount);
  const onOrientationChange = () => requestAnimationFrame(refreshLayout);
  window.addEventListener("orientationchange", onOrientationChange);

  updateTexture(imageElement);
  refreshLayout();
  frame = requestAnimationFrame(tick);

  return {
    canvas: renderer.domElement,
    setImage(image) { updateTexture(image); },
    setSwipe(value) { swipeTarget = clamp(value, -1, 1); },
    setPaused(value) { running = !value; },
    refreshLayout,
    destroy() {
      destroyed = true;
      cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      window.removeEventListener("orientationchange", onOrientationChange);
      texture?.dispose();
      emptyTexture.dispose();
      geometry.dispose();
      material.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
    },
  };
}
