'use client';

import { useEffect, useRef, useCallback } from 'react';

const VERT = `
precision highp float;
attribute vec2 a_pos;
void main(){
  gl_Position = vec4(a_pos, 0.0, 1.0);
}`;

const FRAG = `
precision highp float;
uniform float u_time;
uniform vec2  u_res;
uniform vec2  u_mouse;
uniform float u_gravity;

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

// noise 2D per pennellate
float noise2(vec2 p){
  vec2 i=floor(p), f=fract(p);
  f=f*f*(3.0-2.0*f);
  float n=i.x+i.y*57.0;
  return mix(mix(fract(sin(n)*4375.5453),fract(sin(n+1.0)*4375.5453),f.x),
             mix(fract(sin(n+57.0)*4375.5453),fract(sin(n+58.0)*4375.5453),f.x),f.y);
}

float dropSDF(vec3 p, float grav, float mouseX, float mouseY){
  float t = u_time;
  vec3 q = p;

  float ySign = sign(q.y);
  float topFactor = 1.0 + grav * 0.08;
  float botFactor = 1.0 - grav * 0.28;
  float factor = (ySign > 0.0) ? topFactor : botFactor;
  q.y *= factor;

  float neckZone = exp(-pow((q.y + 0.28) * 2.5, 1.0));
  float pinch    = 1.0 + neckZone * grav * 0.2;
  q.x *= pinch;
  q.z *= pinch;

  q.x -= mouseX * 0.05;
  q.y -= mouseY * 0.035;

  float dist2d = length(q.xy - vec2(mouseX*0.1, mouseY*0.07));
  float ripple = sin(dist2d * 18.0 - t * 4.5) * exp(-dist2d * 5.0) * 0.02;

  float n1 = noise3(q * 2.8 + vec3(t*0.31, t*0.19, t*0.23)) - 0.5;
  float n2 = noise3(q * 5.5 - vec3(t*0.17, t*0.27, t*0.11)) - 0.5;
  float surf = n1 * 0.018 + n2 * 0.006 + ripple;

  return length(q) - 0.68 + surf + ripple;
}

vec3 calcNormal(vec3 p, float grav, float mx, float my){
  float e = 0.003;
  return normalize(vec3(
    dropSDF(p+vec3(e,0,0),grav,mx,my) - dropSDF(p-vec3(e,0,0),grav,mx,my),
    dropSDF(p+vec3(0,e,0),grav,mx,my) - dropSDF(p-vec3(0,e,0),grav,mx,my),
    dropSDF(p+vec3(0,0,e),grav,mx,my) - dropSDF(p-vec3(0,0,e),grav,mx,my)
  ));
}

void main(){
  vec2 uv = (gl_FragCoord.xy - u_res * 0.5) / min(u_res.x, u_res.y);
  uv.y *= -1.0;

  vec3 ro = vec3(0.0, 0.0, 2.4);
  vec3 rd = normalize(vec3(uv, -1.0));

  float grav = u_gravity;
  float mx   = u_mouse.x;
  float my   = u_mouse.y;

  // --- OMBRA SOTTO LA GOCCIA ---
  // ellisse sfocata sotto il centro, simula proiezione su dipinto
  vec2 shadowUV = uv - vec2(0.04, -0.55); // offset giù e leggermente a dx
  float shadowDist = length(shadowUV * vec2(1.0, 0.45)); // ellisse schiacciata
  float shadow = smoothstep(0.38, 0.0, shadowDist) * 0.45;
  // l'ombra si allunga con la gravity
  vec2 shadowUV2 = uv - vec2(0.06, -0.62 - grav * 0.15);
  float shadowDist2 = length(shadowUV2 * vec2(1.1, 0.35));
  float shadow2 = smoothstep(0.42, 0.0, shadowDist2) * 0.25 * grav;
  float totalShadow = clamp(shadow + shadow2, 0.0, 0.55);

  float t = 0.0;
  bool hit = false;
  for(int i = 0; i < 90; i++){
    vec3 p = ro + rd * t;
    float d = dropSDF(p, grav, mx, my);
    if(d < 0.0006){ hit = true; break; }
    if(t > 5.0) break;
    t += d * 0.78;
  }

  if(!hit){
    // pixel di sfondo — applica solo l'ombra
    gl_FragColor = vec4(0.0, 0.0, 0.0, totalShadow);
    return;
  }

  vec3 pos = ro + rd * t;
  vec3 nor  = calcNormal(pos, grav, mx, my);

  // --- LUCE DAL DIPINTO ---
  // sole mediterraneo da destra/alto, coerente col frame
  vec3 ld1 = normalize(vec3(1.2,  1.5, 1.0));  // sole principale
  vec3 ld2 = normalize(vec3(-0.5, 0.6, 0.8));  // cielo riflesso sx
  vec3 ld3 = normalize(vec3(0.2, -0.8, 0.6));  // rimbalzo caldo dal basso

  float diff1 = max(dot(nor, ld1), 0.0);
  float diff2 = max(dot(nor, ld2), 0.0) * 0.4;
  float diff3 = max(dot(nor, ld3), 0.0) * 0.25;

  // fresnel pitttorico — morbido, non plasticoso
  float fresnel = pow(1.0 - max(dot(nor, -rd), 0.0), 1.8);

  // speculare ampio — come vernice lucida su tela
  vec3 ref    = reflect(rd, nor);
  float spec1 = pow(max(dot(ref, ld1), 0.0), 22.0) * 0.7;
  float spec2 = pow(max(dot(ref, ld2), 0.0),  8.0) * 0.2;

  // --- PALETTE DAL DIPINTO ---
  // estratta dal frame: turchese mare, terracotta edifici, bianco vele, oro luce
  vec3 colBase    = vec3(0.18, 0.52, 0.58);  // turchese mare principale
  vec3 colLight   = vec3(0.62, 0.82, 0.78);  // acqua chiara in luce
  vec3 colShadow  = vec3(0.08, 0.28, 0.38);  // profondità in ombra
  vec3 colWarm    = vec3(0.82, 0.62, 0.28);  // caldo dorato sole
  vec3 colSpecSun = vec3(1.00, 0.95, 0.75);  // speculare solare

  // base pittorica — diffusione principale
  vec3 col = mix(colShadow, colBase, diff1 * 0.75 + diff2 * 0.35);
  col = mix(col, colLight, diff3 * 0.2 + fresnel * 0.3);

  // calore solare sui bordi illuminati
  col = mix(col, colWarm, diff1 * diff1 * 0.25);

  // speculare — pennellata di luce
  col += colSpecSun * spec1;
  col += colLight   * spec2;

  // --- PENNELLATE ---
  // layer 1: direzione orizzontale — movimento principale del pennello
  float brush1 = noise2(vec2(pos.x * 8.0 + u_time * 0.04, pos.y * 3.0)) * 0.5 + 0.5;
  // layer 2: direzione diagonale — pennellate secondarie
  float brush2 = noise2(vec2((pos.x + pos.y) * 5.5, (pos.x - pos.y) * 4.0 + u_time * 0.02));
  // layer 3: granulazione fine — texture tela
  float grain  = noise2(vec2(pos.x * 18.0, pos.y * 18.0 + u_time * 0.01)) * 0.5 + 0.5;

  // applica pennellate — variano colore e luminosità localmente
  col += (brush1 - 0.5) * 0.08 * vec3(0.6, 1.0, 1.1);   // turchese chiaro/scuro
  col += (brush2 - 0.5) * 0.06 * vec3(1.1, 0.8, 0.5);   // variazione calda/fredda
  col += (grain  - 0.5) * 0.03 * vec3(1.0, 1.0, 1.0);   // granulazione neutra

  // bordo pitttorico — contorno leggermente più scuro come pennellata di contorno
  float edge = pow(1.0 - max(dot(nor, -rd), 0.0), 4.0);
  col = mix(col, colShadow * 0.6, edge * 0.35);

  // depth — più scuro in basso con la gravity
  float depthFade = smoothstep(0.3, -0.9, pos.y - grav * 0.4);
  col = mix(col, colShadow * 0.5, depthFade * 0.4);

  // --- OPACITÀ ---
  // completamente opaca — come gouache/tempera con texture pittorica
  // solo i bordi estremi leggermente morbidi
  float alpha = 1.0 - edge * 0.08;

  gl_FragColor = vec4(col, alpha);
}`;

interface Props {
  gravity?: number;
  mouseX?:  number;
  mouseY?:  number;
  size?:    number;
}

export default function LiquidDrop({
  gravity = 0,
  mouseX  = 0,
  mouseY  = 0,
  size    = 220,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef    = useRef<number>(0);
  const startRef  = useRef<number>(0);
  const smoothRef = useRef({ mx: 0, my: 0, grav: 0 });

  const uRef = useRef<{
    time:  WebGLUniformLocation | null;
    res:   WebGLUniformLocation | null;
    mouse: WebGLUniformLocation | null;
    grav:  WebGLUniformLocation | null;
  }>({ time: null, res: null, mouse: null, grav: null });

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

    const gl = canvas.getContext('webgl', {
      alpha: true,
      premultipliedAlpha: false,
    });
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

    uRef.current = {
      time:  gl.getUniformLocation(prog, 'u_time'),
      res:   gl.getUniformLocation(prog, 'u_res'),
      mouse: gl.getUniformLocation(prog, 'u_mouse'),
      grav:  gl.getUniformLocation(prog, 'u_gravity'),
    };

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    const dpr = Math.min(window.devicePixelRatio, 2);
    canvas.width  = size * dpr;
    canvas.height = size * dpr;
    gl.viewport(0, 0, canvas.width, canvas.height);

    startRef.current = performance.now();

    const loop = (ts: number) => {
      const t = (ts - startRef.current) * 0.001;
      const s = smoothRef.current;

      gl.uniform1f(uRef.current.time!,  t);
      gl.uniform2f(uRef.current.res!,   canvas.width, canvas.height);
      gl.uniform2f(uRef.current.mouse!, s.mx, s.my);
      gl.uniform1f(uRef.current.grav!,  s.grav);

      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLES, 0, 6);

      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(rafRef.current);
      gl.deleteProgram(prog);
    };
  }, [makeShader, size]);

  useEffect(() => {
    const targets = { mx: mouseX, my: mouseY, grav: gravity };
    const id = setInterval(() => {
      const s = smoothRef.current;
      s.mx   += (targets.mx   - s.mx)   * 0.06;
      s.my   += (targets.my   - s.my)   * 0.06;
      s.grav += (targets.grav - s.grav) * 0.08;
      targets.mx   = mouseX;
      targets.my   = mouseY;
      targets.grav = gravity;
    }, 16);
    return () => clearInterval(id);
  }, [gravity, mouseX, mouseY]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        width:      `${size}px`,
        height:     `${size}px`,
        display:    'block',
        background: 'transparent',
      }}
    />
  );
}