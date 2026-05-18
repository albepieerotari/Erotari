'use client';

import { useEffect, useRef, useCallback } from 'react';

const VERT = `
precision highp float;
attribute vec2 a_pos;
varying vec2 v_uv;
void main(){
  v_uv = a_pos * 0.5 + 0.5;
  gl_Position = vec4(a_pos, 0.0, 1.0);
}`;

const FRAG = `
precision highp float;
varying vec2 v_uv;

uniform sampler2D u_video;
uniform float u_time;
uniform vec2  u_res;
uniform vec2  u_mouse;
uniform float u_gravity;
uniform float u_dropX;
uniform float u_dropY;
uniform float u_dropR;
uniform float u_showDrop;
uniform float u_neutral;

float noise3(vec3 p){
  vec3 i=floor(p), f=fract(p);
  f=f*f*(3.0-2.0*f);
  float n=i.x+i.y*57.0+113.0*i.z;
  return mix(
    mix(mix(fract(sin(n)*4375.5453),fract(sin(n+1.0)*4375.5453),f.x),
        mix(fract(sin(n+57.0)*4375.5453),fract(sin(n+58.0)*4375.5453),f.x),f.y),
    mix(mix(fract(sin(n+113.0)*4375.5453),fract(sin(n+114.0)*4375.5453),f.x),
        mix(fract(sin(n+170.0)*4375.5453),fract(sin(n+171.0)*4375.5453),f.x),f.y),f.z);
}

float dropSDF(vec3 p, float grav, float mouseX, float mouseY){
  vec3 q = p;
  float ySign = sign(q.y);
  q.y *= (ySign > 0.0) ? (1.0 + grav * 0.08) : (1.0 - grav * 0.28);
  float neckZone = exp(-pow((q.y + 0.28) * 2.5, 1.0));
  q.x *= 1.0 + neckZone * grav * 0.2;
  q.z *= 1.0 + neckZone * grav * 0.2;
  q.x -= mouseX * 0.05;
  q.y -= mouseY * 0.035;
  float baseDist = length(q) - 0.68;
  float interiorMask = smoothstep(0.08, 0.0, abs(baseDist));
  float n1 = noise3(q * 2.8 + vec3(u_time*0.06, u_time*0.04, u_time*0.06)) - 0.5;
  float n2 = noise3(q * 5.5 - vec3(u_time*0.04, u_time*0.04, u_time*0.04)) - 0.5;
  return baseDist + (n1*0.055 + n2*0.028) * interiorMask;
}

vec3 calcNormal(vec3 p, float grav, float mx, float my){
  float e = 0.003;
  return normalize(vec3(
    dropSDF(p+vec3(e,0,0),grav,mx,my) - dropSDF(p-vec3(e,0,0),grav,mx,my),
    dropSDF(p+vec3(0,e,0),grav,mx,my) - dropSDF(p-vec3(0,e,0),grav,mx,my),
    dropSDF(p+vec3(0,0,e),grav,mx,my) - dropSDF(p-vec3(0,0,e),grav,mx,my)
  ));
}

vec2 coverUV(vec2 uv){
  float videoAspect  = 16.0 / 9.0;
  float screenAspect = u_res.x / u_res.y;
  vec2 c = uv - 0.5;
  if(screenAspect > videoAspect){
    c.y *= videoAspect / screenAspect;
  } else {
    c.x *= screenAspect / videoAspect;
  }
  return clamp(c + 0.5, 0.001, 0.999);
}

// lens flare — stella di luce con raggi
float lensFlare(vec2 uv, vec2 pos, float size){
  vec2 d = uv - pos;
  float dist = length(d);
  // alone circolare
  float halo = smoothstep(size * 2.0, 0.0, dist) * 0.5;
  // raggi — 6 spike
  float angle = atan(d.y, d.x);
  float rays = pow(abs(sin(angle * 3.0)), 8.0) * smoothstep(size * 3.0, 0.0, dist) * 0.8;
  // spike lungo diagonale
  float spike1 = pow(abs(sin(angle + 0.785)), 18.0) * smoothstep(size * 4.0, 0.0, dist);
  float spike2 = pow(abs(sin(angle - 0.785)), 18.0) * smoothstep(size * 4.0, 0.0, dist);
  return halo + rays + spike1 + spike2;
}

void main(){
  vec2 uv         = vec2(v_uv.x, 1.0 - v_uv.y);
  float aspect    = u_res.x / u_res.y;
  vec2 dropCenter = vec2(u_dropX, u_dropY);
  vec3 neutralCol = vec3(0.11, 0.10, 0.14);

  // distanza aspect-corrected
  vec2  toCenter = (uv - dropCenter) * vec2(aspect, 1.0);
  float dropDist = length(toCenter) / u_dropR;

  // blur radiale — picco sul bordo della goccia
  float blurPeak   = exp(-pow((dropDist - 1.0) * 3.5, 2.0));
  float blurAmount = blurPeak * 0.025 * u_showDrop;

  vec3 bgCol;
  if(blurAmount < 0.0005){
    bgCol = texture2D(u_video, coverUV(uv)).rgb;
  } else {
    vec3  acc    = vec3(0.0);
    float totalW = 0.0;
    vec2  dir    = dropCenter - uv;
    for(int i = 0; i < 12; i++){
      float fi      = float(i) / 11.0;
      vec2 sampleUV = coverUV(uv + dir * fi * blurAmount);
      float w       = 1.0 - fi * 0.4;
      acc          += texture2D(u_video, sampleUV).rgb * w;
      totalW       += w;
    }
    bgCol = acc / totalW;
  }
  bgCol = mix(bgCol, neutralCol, u_neutral);

  // ombra
  float shadowD = length((uv - (dropCenter + vec2(0.0, 0.055))) * vec2(aspect * 0.85, 1.2));
  float shadow  = smoothstep(u_dropR * 1.3, 0.0, shadowD) * 0.4 * u_showDrop;
  vec3  col     = mix(bgCol, bgCol * 0.55, shadow);

  // raymarching
  float scale = 0.68 / u_dropR;
  vec3  ro    = vec3(0.0, 0.0, 2.4);
  vec3  rd    = normalize(vec3(toCenter * scale, -1.0));

  float t   = 0.0;
  bool  hit = false;
  for(int i = 0; i < 90; i++){
    vec3  p = ro + rd * t;
    float d = dropSDF(p, u_gravity, u_mouse.x, u_mouse.y);
    if(d < 0.0006){ hit = true; break; }
    if(t > 5.0) break;
    t += d * 0.78;
  }

  if(!hit){
    gl_FragColor = vec4(col, 1.0);
    return;
  }

  vec3 pos = ro + rd * t;
  vec3 nor  = calcNormal(pos, u_gravity, u_mouse.x, u_mouse.y);
  float NdotV  = max(dot(nor, -rd), 0.0);

  // --- RIFRAZIONE INVERTITA ---
  // il raggio rifratto punta verso il lato opposto — immagine capovolta
  // usiamo refract() con IOR acqua
  float ior    = 1.45;
  vec3  refDir = refract(rd, nor, 1.0 / ior);

  // proietta il raggio rifratto sullo "schermo" virtuale del video
  // l'immagine risulta capovolta e ingrandita come una vera lente
  float screenZ  = -1.5;
  float tRef     = (screenZ - pos.z) / refDir.z;
  vec2  refHit   = pos.xy + refDir.xy * tRef;

  // mappa refHit in UV — centrato sulla goccia, scalato
  vec2 refUV = dropCenter + refHit * u_dropR * 0.9 / vec2(aspect, 1.0);
  refUV      = coverUV(clamp(refUV, 0.001, 0.999));
  vec3 refractedCol = mix(texture2D(u_video, refUV).rgb, neutralCol, u_neutral);

  // --- FRESNEL & RIFLESSIONE TOTALE INTERNA ---
  float fresnel = pow(1.0 - NdotV, 3.0);

  // riflessione — campiona il video nella direzione riflessa
  vec3  refVecR  = reflect(rd, nor);
  float tRefl    = (screenZ - pos.z) / refVecR.z;
  vec2  reflHit  = pos.xy + refVecR.xy * tRefl;
  vec2  reflUV   = dropCenter + reflHit * u_dropR * 0.6 / vec2(aspect, 1.0);
  reflUV         = coverUV(clamp(reflUV, 0.001, 0.999));
  vec3  reflCol  = texture2D(u_video, reflUV).rgb * 1.2;

  // bordo riflettente argentato — striscia interna perimetrale
  float rimRefl  = pow(1.0 - NdotV, 5.5);

  // lighting
  vec3 ld1   = normalize(vec3(1.3, 1.6, 1.0));
  vec3 ld2   = normalize(vec3(-0.4, 0.5, 0.8));
  vec3 refV  = reflect(rd, nor);
  float spec1 = pow(max(dot(refV, ld1), 0.0), 200.0) * 5.0;
  float spec2 = pow(max(dot(refV, ld2), 0.0),  40.0) * 0.8;

  // compositing goccia
  vec3 dropCol = refractedCol;

  // mix rifrazione + riflessione ai bordi (fresnel)
  dropCol = mix(dropCol, reflCol, fresnel * 0.55);

  // bordo argentato brillante
  dropCol = mix(dropCol, vec3(0.95, 0.97, 1.0) * 1.4, rimRefl * 0.6);

  // vignetta interna scura — profondità
  float edgeDark = pow(1.0 - NdotV, 3.5);
  dropCol = mix(dropCol, dropCol * 0.1, edgeDark * 0.5);

  // speculare principale — highlight bianco brillante
  dropCol += vec3(1.0, 0.98, 0.92) * spec1;
  dropCol += vec3(0.85, 0.92, 1.0) * spec2;

  // outline esterno sottile
  float outerRim = smoothstep(1.05, 1.0, dropDist) * smoothstep(0.95, 1.0, dropDist);
  col = mix(col, vec3(1.0), outerRim * 0.7 * u_showDrop);

  col = mix(col, dropCol, u_showDrop);

  // --- LENS FLARE ---
  // posizione flare — in alto a destra sulla goccia, come nel riferimento
  vec2 flarePos  = dropCenter + vec2(u_dropR * 0.35 / aspect, -u_dropR * 0.38);
  float flareSize = u_dropR * 0.04;
  float flare    = lensFlare(uv * vec2(aspect, 1.0),
                             flarePos * vec2(aspect, 1.0),
                             flareSize * aspect);
  flare *= u_showDrop;

  // colore flare — bianco caldo con alone azzurrino
  vec3 flareCol = mix(vec3(0.7, 0.85, 1.0), vec3(1.0, 0.98, 0.90), smoothstep(0.0, 0.1, flare));
  col += flareCol * flare * 0.9;

  // alone secondario flare — cerchio più grande semitrasparente
  float halo2 = smoothstep(u_dropR * 0.8, 0.0,
                  length((uv - flarePos) * vec2(aspect, 1.0))) * 0.08 * u_showDrop;
  col += vec3(0.8, 0.9, 1.0) * halo2;

  gl_FragColor = vec4(col, 1.0);
}`;

interface Props {
  gravity:        number;
  mouseX:         number;
  mouseY:         number;
  dropShift:      number;
  showDrop:       boolean;
  neutralOpacity: number;
}

export default function UnifiedCanvas({
  gravity,
  mouseX,
  mouseY,
  dropShift,
  showDrop,
  neutralOpacity,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef  = useRef<HTMLVideoElement>(null);
  const rafRef    = useRef<number>(0);
  const startRef  = useRef<number>(0);

  const propsRef = useRef({ gravity, mouseX, mouseY, dropShift, showDrop, neutralOpacity });
  useEffect(() => {
    propsRef.current = { gravity, mouseX, mouseY, dropShift, showDrop, neutralOpacity };
  });

  const smoothRef = useRef({ mx: 0, my: 0, grav: 0, show: 0, neutral: 0 });
  const glDataRef = useRef<{
    gl:   WebGLRenderingContext;
    prog: WebGLProgram;
    tex:  WebGLTexture;
    u:    Record<string, WebGLUniformLocation | null>;
  } | null>(null);

  const makeShader = useCallback(
    (gl: WebGLRenderingContext, type: number, src: string) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      return s;
    }, []
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext('webgl', { alpha: false });
    if (!gl) return;

    const prog = gl.createProgram()!;
    gl.attachShader(prog, makeShader(gl, gl.VERTEX_SHADER,   VERT));
    gl.attachShader(prog, makeShader(gl, gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    gl.useProgram(prog);

    const quad = new Float32Array([-1,-1, 1,-1, -1,1, -1,1, 1,-1, 1,1]);
    const buf  = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, quad, gl.STATIC_DRAW);
    const aPos = gl.getAttribLocation(prog, 'a_pos');
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    const tex = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S,     gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T,     gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    // initialize with neutral color so the canvas never shows garbage before the video loads
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE,
      new Uint8Array([28, 26, 36, 255]));

    const names = ['u_video','u_time','u_res','u_mouse','u_gravity',
                   'u_dropX','u_dropY','u_dropR','u_showDrop','u_neutral'];
    const u: Record<string, WebGLUniformLocation | null> = {};
    names.forEach(n => { u[n] = gl.getUniformLocation(prog, n); });
    gl.uniform1i(u['u_video']!, 0);

    glDataRef.current = { gl, prog, tex, u };

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio, 2);
      canvas.width  = window.innerWidth  * dpr;
      canvas.height = window.innerHeight * dpr;
      gl.viewport(0, 0, canvas.width, canvas.height);
    };
    resize();
    window.addEventListener('resize', resize);

    const video = videoRef.current;
    if (video) {
      video.play().catch(() => {
        const resume = () => { video.play(); document.removeEventListener('click', resume); };
        document.addEventListener('click', resume);
      });
    }

    startRef.current = performance.now();
    const loop = (ts: number) => {
      const data = glDataRef.current;
      const vid  = videoRef.current;
      const cvs  = canvasRef.current;
      if (!data || !vid || !cvs) { rafRef.current = requestAnimationFrame(loop); return; }

      const { gl, tex, u } = data;
      const p = propsRef.current;
      const s = smoothRef.current;
      const t = (ts - startRef.current) * 0.001;

      s.mx      += (p.mouseX         - s.mx)      * 0.06;
      s.my      += (p.mouseY         - s.my)      * 0.06;
      s.grav    += (p.gravity        - s.grav)    * 0.08;
      s.show    += ((p.showDrop?1:0) - s.show)    * 0.03;
      s.neutral += (p.neutralOpacity - s.neutral) * 0.04;

      if (vid.readyState >= 2) {
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, vid);
      }

      const dropX = 0.5 - p.dropShift * 0.18;
      const dropR = Math.min(window.innerWidth * 0.096, 144) / window.innerHeight;

      gl.uniform1f(u['u_time']!,     t);
      gl.uniform2f(u['u_res']!,      cvs.width, cvs.height);
      gl.uniform2f(u['u_mouse']!,    s.mx, s.my);
      gl.uniform1f(u['u_gravity']!,  s.grav);
      gl.uniform1f(u['u_dropX']!,    dropX);
      gl.uniform1f(u['u_dropY']!,    0.5);
      gl.uniform1f(u['u_dropR']!,    dropR);
      gl.uniform1f(u['u_showDrop']!, s.show);
      gl.uniform1f(u['u_neutral']!,  s.neutral);

      gl.drawArrays(gl.TRIANGLES, 0, 6);
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', resize);
      gl.deleteProgram(prog);
      gl.deleteTexture(tex);
    };
  }, [makeShader]);

  return (
    <>
      <video
        ref={videoRef}
        src="/videos/scene_01.mp4"
        muted loop playsInline preload="auto"
        style={{
          position:      'absolute',
          width:         '1px',
          height:        '1px',
          opacity:       0,
          pointerEvents: 'none',
        }}
        crossOrigin="anonymous"
      />
      <canvas
        ref={canvasRef}
        style={{
          position: 'absolute',
          inset:    0,
          width:    '100%',
          height:   '100%',
          display:  'block',
        }}
      />
    </>
  );
}