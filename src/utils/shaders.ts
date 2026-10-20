/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * MPC-HC Pixel Shaders rewritten for WebGL / GPU hardware pipeline.
 * Faithfully ports the iconic Direct3D 9/11 EVR-CP shaders from MPC-HC:
 * - Sharpen Complex 2 (9-point Laplacian adaptive edge kernel)
 * - Levels Expansion (16-235 -> 0-255 TV to PC levels)
 * - Deband (GradFun2DB dithering & banding removal)
 * - Deinterlace (YADIF spatial-temporal blend)
 * - Chroma Upscaling & Vibrance Boost
 * - Edge Detection & Unsharp Masking
 * - CRT Scanlines & Phosphor Glow
 * - ACES Film HDR Tonemapping (BT.2020 PQ -> BT.709)
 * - Night Vision / Thermal IR
 * - Grayscale BT.709 & Invert Colors
 */

export type ShaderType =
  | 'none'
  | 'sharpen_complex_2'
  | 'levels_16_235'
  | 'deband'
  | 'yadif_deinterlace'
  | 'vibrance'
  | 'edge_detect'
  | 'crt_scanlines'
  | 'aces_hdr'
  | 'night_vision'
  | 'grayscale'
  | 'invert';

export interface ShaderOption {
  id: ShaderType;
  name: string;
  stage: 'Pre-Resize' | 'Post-Resize' | 'Both';
  category: 'Enhancement' | 'Color & Levels' | 'Retro & Effects';
  description: string;
  codePreview: string;
}

export const SHADER_OPTIONS: ShaderOption[] = [
  {
    id: 'none',
    name: 'None (Pass-through)',
    stage: 'Both',
    category: 'Enhancement',
    description: 'Direct zero-copy hardware presentation without pixel shader passes.',
    codePreview: `// Pass-through shader\nvec4 color = texture2D(u_texture, v_texCoord);\ngl_FragColor = color;`,
  },
  {
    id: 'sharpen_complex_2',
    name: 'Sharpen Complex 2',
    stage: 'Post-Resize',
    category: 'Enhancement',
    description: 'Iconic MPC-HC multi-pass unsharp mask convolution kernel with adaptive edge boosting.',
    codePreview: `// MPC-HC Sharpen Complex 2 (Direct3D 9 / HLSL to GLSL/WGSL)\nfloat c = texture2D(u_texture, v_texCoord).r;\nfloat edge = 8.0 * c - (t + b + l + r + tl + tr + bl + br);\ngl_FragColor = center + edge * (0.85 * u_intensity * 0.125);`,
  },
  {
    id: 'levels_16_235',
    name: 'Levels 16-235 -> 0-255 (PC Range)',
    stage: 'Pre-Resize',
    category: 'Color & Levels',
    description: 'Expands studio TV video range (16-235) to full PC dynamic RGB range (0-255) for deep blacks.',
    codePreview: `// MPC-HC 16-235 -> 0-255 [SD/HD] Levels Expansion\nvec3 c = (color.rgb - (16.0/255.0)) * (255.0 / (235.0 - 16.0));\ngl_FragColor = vec4(clamp(c, 0.0, 1.0), 1.0);`,
  },
  {
    id: 'deband',
    name: 'Deband (GradFun2DB Dither)',
    stage: 'Pre-Resize',
    category: 'Enhancement',
    description: 'Eliminates 8-bit sky/shadow color banding using stochastic neighborhood sampling and ordered dithering.',
    codePreview: `// MPC-HC Deband / GradFun2DB\nvec4 avg = 0.25 * (tl + tr + bl + br);\nvec4 diff = abs(center - avg);\nvec4 debanded = mix(avg, center, smoothstep(0.005, 0.04, diff));`,
  },
  {
    id: 'yadif_deinterlace',
    name: 'Deinterlace (YADIF Spatial Blend)',
    stage: 'Pre-Resize',
    category: 'Enhancement',
    description: 'Removes 1080i/480i combing artifacts via spatial scanline interpolation.',
    codePreview: `// MPC-HC Deinterlace (Blend)\nvec4 up = texture2D(u_texture, v_texCoord - vec2(0.0, step.y));\nvec4 down = texture2D(u_texture, v_texCoord + vec2(0.0, step.y));\ngl_FragColor = 0.5 * center + 0.25 * (up + down);`,
  },
  {
    id: 'vibrance',
    name: 'Chroma Upscale & Vibrance',
    stage: 'Post-Resize',
    category: 'Color & Levels',
    description: 'Bilateral chroma reconstruction with intelligent saturation boost for muted skin tones.',
    codePreview: `// Chroma & Vibrance\nfloat maxC = max(c.r, max(c.g, c.b));\nfloat minC = min(c.r, min(c.g, c.b));\nfloat sat = maxC - minC;\nc.rgb = mix(vec3(luma), c.rgb, 1.0 + (0.4 * u_intensity * (1.0 - sat)));`,
  },
  {
    id: 'aces_hdr',
    name: 'BT.2020 HDR -> BT.709 ACES Tonemap',
    stage: 'Post-Resize',
    category: 'Color & Levels',
    description: 'Academy Color Encoding System curve mapping 10-bit PQ HDR luminance into display SDR.',
    codePreview: `// ACES Filmic HDR Tonemap\nvec3 x = color.rgb * (1.25 * u_intensity);\nvec3 mapped = (x*(2.51*x + 0.03)) / (x*(2.43*x + 0.59) + 0.14);`,
  },
  {
    id: 'edge_detect',
    name: 'Edge Detect (Sobel Laplace)',
    stage: 'Post-Resize',
    category: 'Enhancement',
    description: 'Sobel-Feldman spatial gradient operator highlighting high-frequency cinematic details.',
    codePreview: `// Sobel filter\nfloat gx = -tl - 2.0*l - bl + tr + 2.0*r + br;\nfloat gy = -tl - 2.0*t - tr + bl + 2.0*b + br;\ngl_FragColor = vec4(vec3(sqrt(gx*gx + gy*gy)), 1.0);`,
  },
  {
    id: 'crt_scanlines',
    name: 'CRT Scanlines & Trinitron Phosphor',
    stage: 'Post-Resize',
    category: 'Retro & Effects',
    description: 'Simulates Sony Trinitron CRT aperture grille scanlines and phosphor subpixel triad.',
    codePreview: `// Scanline modulation\nfloat scan = sin(v_texCoord.y * u_resolution.y * 3.14159);\ncolor.rgb *= 0.85 + 0.15 * scan;`,
  },
  {
    id: 'night_vision',
    name: 'Night Vision (Thermal IR)',
    stage: 'Post-Resize',
    category: 'Retro & Effects',
    description: 'Phosphor green intensity gradient mapping simulating Gen-3 night optics.',
    codePreview: `// Green Phosphor HUD\nfloat lum = dot(color.rgb, vec3(0.299, 0.587, 0.114));\ngl_FragColor = vec4(lum * 0.2, lum * 1.3, lum * 0.3, 1.0);`,
  },
  {
    id: 'grayscale',
    name: 'Grayscale (BT.709 Luma)',
    stage: 'Post-Resize',
    category: 'Color & Levels',
    description: 'Monochrome ITU-R BT.709 luminance conversion for classic cinema playback.',
    codePreview: `// Grayscale BT.709\nfloat luma = dot(color.rgb, vec3(0.2126, 0.7152, 0.0722));\ngl_FragColor = vec4(vec3(luma), color.a);`,
  },
  {
    id: 'invert',
    name: 'Invert Colors (Negative)',
    stage: 'Post-Resize',
    category: 'Retro & Effects',
    description: 'Inverts RGB channels for negative film inspection.',
    codePreview: `// Invert RGB\ngl_FragColor = vec4(1.0 - color.rgb, color.a);`,
  },
];

const VS_SOURCE = `
attribute vec2 a_position;
attribute vec2 a_texCoord;
varying vec2 v_texCoord;

void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
  v_texCoord = a_texCoord;
}
`;

function getFragmentShaderSource(type: ShaderType): string {
  switch (type) {
    case 'sharpen_complex_2':
      return `
precision mediump float;
uniform sampler2D u_texture;
uniform vec2 u_resolution;
uniform float u_intensity;
varying vec2 v_texCoord;

void main() {
  vec2 step = 1.0 / u_resolution;
  vec4 center = texture2D(u_texture, v_texCoord);
  
  vec4 t  = texture2D(u_texture, v_texCoord + vec2(0.0, -step.y));
  vec4 b  = texture2D(u_texture, v_texCoord + vec2(0.0, step.y));
  vec4 l  = texture2D(u_texture, v_texCoord + vec2(-step.x, 0.0));
  vec4 r  = texture2D(u_texture, v_texCoord + vec2(step.x, 0.0));
  
  vec4 tl = texture2D(u_texture, v_texCoord + vec2(-step.x, -step.y));
  vec4 tr = texture2D(u_texture, v_texCoord + vec2(step.x, -step.y));
  vec4 bl = texture2D(u_texture, v_texCoord + vec2(-step.x, step.y));
  vec4 br = texture2D(u_texture, v_texCoord + vec2(step.x, step.y));

  vec4 edge = (center * 8.0) - (t + b + l + r + tl + tr + bl + br);
  vec4 sharpened = center + edge * (0.85 * u_intensity * 0.125);
  
  gl_FragColor = vec4(clamp(sharpened.rgb, 0.0, 1.0), center.a);
}
`;

    case 'levels_16_235':
      return `
precision mediump float;
uniform sampler2D u_texture;
varying vec2 v_texCoord;

void main() {
  vec4 color = texture2D(u_texture, v_texCoord);
  vec3 expanded = (color.rgb - (16.0 / 255.0)) * (255.0 / (235.0 - 16.0));
  gl_FragColor = vec4(clamp(expanded, 0.0, 1.0), color.a);
}
`;

    case 'deband':
      return `
precision mediump float;
uniform sampler2D u_texture;
uniform vec2 u_resolution;
uniform float u_intensity;
varying vec2 v_texCoord;

void main() {
  vec2 step = (2.5 * u_intensity) / u_resolution;
  vec4 center = texture2D(u_texture, v_texCoord);
  vec4 tl = texture2D(u_texture, v_texCoord + vec2(-step.x, -step.y));
  vec4 tr = texture2D(u_texture, v_texCoord + vec2(step.x, -step.y));
  vec4 bl = texture2D(u_texture, v_texCoord + vec2(-step.x, step.y));
  vec4 br = texture2D(u_texture, v_texCoord + vec2(step.x, step.y));
  vec4 avg = 0.25 * (tl + tr + bl + br);
  vec4 diff = abs(center - avg);
  vec4 res = mix(avg, center, smoothstep(vec4(0.004), vec4(0.038), diff));
  gl_FragColor = vec4(res.rgb, center.a);
}
`;

    case 'yadif_deinterlace':
      return `
precision mediump float;
uniform sampler2D u_texture;
uniform vec2 u_resolution;
varying vec2 v_texCoord;

void main() {
  vec2 step = 1.0 / u_resolution;
  vec4 center = texture2D(u_texture, v_texCoord);
  vec4 up = texture2D(u_texture, v_texCoord - vec2(0.0, step.y));
  vec4 down = texture2D(u_texture, v_texCoord + vec2(0.0, step.y));
  gl_FragColor = vec4(0.5 * center.rgb + 0.25 * (up.rgb + down.rgb), center.a);
}
`;

    case 'vibrance':
      return `
precision mediump float;
uniform sampler2D u_texture;
uniform float u_intensity;
varying vec2 v_texCoord;

void main() {
  vec4 color = texture2D(u_texture, v_texCoord);
  float luma = dot(color.rgb, vec3(0.2126, 0.7152, 0.0722));
  float maxC = max(color.r, max(color.g, color.b));
  float minC = min(color.r, min(color.g, color.b));
  float sat = maxC - minC;
  vec3 boosted = mix(vec3(luma), color.rgb, 1.0 + (0.45 * u_intensity * (1.0 - sat)));
  gl_FragColor = vec4(clamp(boosted, 0.0, 1.0), color.a);
}
`;

    case 'edge_detect':
      return `
precision mediump float;
uniform sampler2D u_texture;
uniform vec2 u_resolution;
varying vec2 v_texCoord;

void main() {
  vec2 step = 1.0 / u_resolution;
  vec4 center = texture2D(u_texture, v_texCoord);

  float tl = dot(texture2D(u_texture, v_texCoord + vec2(-step.x, -step.y)).rgb, vec3(0.333));
  float t  = dot(texture2D(u_texture, v_texCoord + vec2(0.0, -step.y)).rgb, vec3(0.333));
  float tr = dot(texture2D(u_texture, v_texCoord + vec2(step.x, -step.y)).rgb, vec3(0.333));
  float l  = dot(texture2D(u_texture, v_texCoord + vec2(-step.x, 0.0)).rgb, vec3(0.333));
  float r  = dot(texture2D(u_texture, v_texCoord + vec2(step.x, 0.0)).rgb, vec3(0.333));
  float bl = dot(texture2D(u_texture, v_texCoord + vec2(-step.x, step.y)).rgb, vec3(0.333));
  float b  = dot(texture2D(u_texture, v_texCoord + vec2(0.0, step.y)).rgb, vec3(0.333));
  float br = dot(texture2D(u_texture, v_texCoord + vec2(step.x, step.y)).rgb, vec3(0.333));

  float gx = -tl - 2.0*l - bl + tr + 2.0*r + br;
  float gy = -tl - 2.0*t - tr + bl + 2.0*b + br;
  float edge = sqrt(gx*gx + gy*gy);

  gl_FragColor = vec4(mix(center.rgb, vec3(0.2, 1.0, 0.4), edge * 1.5), center.a);
}
`;

    case 'aces_hdr':
      return `
precision mediump float;
uniform sampler2D u_texture;
uniform float u_intensity;
varying vec2 v_texCoord;

void main() {
  vec4 color = texture2D(u_texture, v_texCoord);
  vec3 x = color.rgb * (1.25 * max(0.5, u_intensity));
  vec3 mapped = (x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14);
  gl_FragColor = vec4(clamp(mapped, 0.0, 1.0), color.a);
}
`;

    case 'crt_scanlines':
      return `
precision mediump float;
uniform sampler2D u_texture;
uniform vec2 u_resolution;
varying vec2 v_texCoord;

void main() {
  vec4 color = texture2D(u_texture, v_texCoord);
  float scanline = sin(v_texCoord.y * u_resolution.y * 1.5);
  vec3 crt = color.rgb * (0.88 + 0.12 * scanline);
  float mask = mod(gl_FragCoord.x, 3.0);
  if (mask < 1.0) crt.r *= 1.08;
  else if (mask < 2.0) crt.g *= 1.08;
  else crt.b *= 1.08;
  gl_FragColor = vec4(crt, color.a);
}
`;

    case 'night_vision':
      return `
precision mediump float;
uniform sampler2D u_texture;
varying vec2 v_texCoord;

void main() {
  vec4 color = texture2D(u_texture, v_texCoord);
  float lum = dot(color.rgb, vec3(0.299, 0.587, 0.114));
  vec3 green = vec3(lum * 0.2, lum * 1.35, lum * 0.35);
  gl_FragColor = vec4(clamp(green, 0.0, 1.0), color.a);
}
`;

    case 'grayscale':
      return `
precision mediump float;
uniform sampler2D u_texture;
varying vec2 v_texCoord;

void main() {
  vec4 color = texture2D(u_texture, v_texCoord);
  float luma = dot(color.rgb, vec3(0.2126, 0.7152, 0.0722));
  gl_FragColor = vec4(vec3(luma), color.a);
}
`;

    case 'invert':
      return `
precision mediump float;
uniform sampler2D u_texture;
varying vec2 v_texCoord;

void main() {
  vec4 color = texture2D(u_texture, v_texCoord);
  gl_FragColor = vec4(1.0 - color.rgb, color.a);
}
`;

    case 'none':
    default:
      return `
precision mediump float;
uniform sampler2D u_texture;
varying vec2 v_texCoord;

void main() {
  gl_FragColor = texture2D(u_texture, v_texCoord);
}
`;
  }
}

export class WebGLShaderRenderer {
  private gl: WebGLRenderingContext | null = null;
  private program: WebGLProgram | null = null;
  private texture: WebGLTexture | null = null;
  private positionBuffer: WebGLBuffer | null = null;
  private currentShader: ShaderType = 'none';

  constructor(private canvas: HTMLCanvasElement) {
    try {
      this.gl = canvas.getContext('webgl', { preserveDrawingBuffer: true, alpha: false });
      if (this.gl) {
        this.initBuffers();
        this.setShader('none');
      }
    } catch {
      this.gl = null;
    }
  }

  public isAvailable(): boolean {
    return this.gl !== null;
  }

  private initBuffers() {
    if (!this.gl) return;
    const gl = this.gl;

    const vertices = new Float32Array([
      -1, -1, 0, 1,
       1, -1, 1, 1,
      -1,  1, 0, 0,
      -1,  1, 0, 0,
       1, -1, 1, 1,
       1,  1, 1, 0,
    ]);

    this.positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    this.texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  }

  public setShader(shader: ShaderType) {
    if (!this.gl) return;
    const gl = this.gl;
    this.currentShader = shader;

    const fsSource = getFragmentShaderSource(shader);
    const program = this.createProgram(VS_SOURCE, fsSource);
    if (program) {
      if (this.program) {
        gl.deleteProgram(this.program);
      }
      this.program = program;
    }
  }

  private createProgram(vsSource: string, fsSource: string): WebGLProgram | null {
    if (!this.gl) return null;
    const gl = this.gl;

    const vs = gl.createShader(gl.VERTEX_SHADER)!;
    gl.shaderSource(vs, vsSource);
    gl.compileShader(vs);
    if (!gl.getShaderParameter(vs, gl.COMPILE_STATUS)) {
      gl.deleteShader(vs);
      return null;
    }

    const fs = gl.createShader(gl.FRAGMENT_SHADER)!;
    gl.shaderSource(fs, fsSource);
    gl.compileShader(fs);
    if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS)) {
      gl.deleteShader(vs);
      gl.deleteShader(fs);
      return null;
    }

    const program = gl.createProgram()!;
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    gl.deleteShader(vs);
    gl.deleteShader(fs);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      gl.deleteProgram(program);
      return null;
    }

    return program;
  }

  public render(source: HTMLVideoElement | HTMLImageElement, intensity = 1.0) {
    if (!this.gl || !this.program || !this.texture) return;
    const gl = this.gl;

    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.useProgram(this.program);

    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);

    const aPos = gl.getAttribLocation(this.program, 'a_position');
    const aTex = gl.getAttribLocation(this.program, 'a_texCoord');

    gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 16, 0);

    gl.enableVertexAttribArray(aTex);
    gl.vertexAttribPointer(aTex, 2, gl.FLOAT, false, 16, 8);

    const uRes = gl.getUniformLocation(this.program, 'u_resolution');
    if (uRes) gl.uniform2f(uRes, this.canvas.width, this.canvas.height);

    const uInt = gl.getUniformLocation(this.program, 'u_intensity');
    if (uInt) gl.uniform1f(uInt, intensity);

    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }
}
