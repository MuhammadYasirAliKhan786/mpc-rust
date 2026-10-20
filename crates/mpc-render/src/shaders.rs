//! MPC-HC High-Performance Custom Pixel Shaders rewritten in WGSL/HLSL
//! Preserves the legendary algorithms of MPC-HC's EVR Custom Presenter.

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum MpcShader {
    PassThrough,
    SharpenComplex2,
    Levels16To235,
    EdgeDetect,
    HdrAcesTonemap,
    NightVision,
}

/// The legendary MPC-HC "Sharpen Complex 2" pixel shader
pub const SHARPEN_COMPLEX_2_WGSL: &str = r#"
struct VertexOutput {
    @builtin(position) position: vec4<f32>,
    @location(0) uv: vec2<f32>,
};

@vertex
fn vs_main(@builtin(vertex_index) in_vertex_index: u32) -> VertexOutput {
    var out: VertexOutput;
    let x = f32((in_vertex_index << 1u) & 2u);
    let y = f32(in_vertex_index & 2u);
    out.uv = vec2<f32>(x, y);
    out.position = vec4<f32>(x * 2.0 - 1.0, 1.0 - y * 2.0, 0.0, 1.0);
    return out;
}

@group(0) @binding(0) var video_tex: texture_2d<f32>;
@group(0) @binding(1) var video_sampler: sampler;

// MPC-HC Sharpen Complex 2 weights
const SHARPEN_AMOUNT: f32 = 0.85;

@fragment
fn fs_main(in: VertexOutput) -> @location(0) vec4<f32> {
    let dims = vec2<f32>(textureDimensions(video_tex));
    let step = vec2<f32>(1.0 / dims.x, 1.0 / dims.y);

    let center = textureSample(video_tex, video_sampler, in.uv);
    
    // 9-point Laplacian unsharp convolution
    let t  = textureSample(video_tex, video_sampler, in.uv + vec2<f32>(0.0, -step.y));
    let b  = textureSample(video_tex, video_sampler, in.uv + vec2<f32>(0.0, step.y));
    let l  = textureSample(video_tex, video_sampler, in.uv + vec2<f32>(-step.x, 0.0));
    let r  = textureSample(video_tex, video_sampler, in.uv + vec2<f32>(step.x, 0.0));

    let tl = textureSample(video_tex, video_sampler, in.uv + vec2<f32>(-step.x, -step.y));
    let tr = textureSample(video_tex, video_sampler, in.uv + vec2<f32>(step.x, -step.y));
    let bl = textureSample(video_tex, video_sampler, in.uv + vec2<f32>(-step.x, step.y));
    let br = textureSample(video_tex, video_sampler, in.uv + vec2<f32>(step.x, step.y));

    let edge = (center * 8.0) - (t + b + l + r + tl + tr + bl + br);
    let sharpened = center + edge * (SHARPEN_AMOUNT * 0.125);

    // Expand TV levels (16..235) to Full PC levels (0..255)
    let full_range = clamp((sharpened.rgb - 16.0 / 255.0) * (255.0 / (235.0 - 16.0)), vec3<f32>(0.0), vec3<f32>(1.0));

    return vec4<f32>(full_range, center.a);
}
"#;
