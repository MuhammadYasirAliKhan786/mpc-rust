//! MPC-Rust Render Engine & Hardware Acceleration Pipeline
//! Implements hardware video decoders:
//! - Windows: Direct3D 11 Video Acceleration (D3D11VA) & DXVA2
//! - macOS: Apple VideoToolbox zero-copy CVPixelBuffer to Metal texture
//! - Linux: VA-API (libva) and VDPAU to Vulkan VkImage
//! - All Platforms: Real-time custom pixel shaders (Sharpen Complex 2, Levels 16-235->0-255, ACES HDR)

pub mod decoders;
pub mod shaders;

use std::sync::Arc;
use raw_window_handle::{HasDisplayHandle, HasWindowHandle};
use wgpu::*;

pub enum TargetOS {
    Windows,
    MacOS,
    Linux,
}

pub struct RenderStats {
    pub display_fps: f32,
    pub render_time_ms: f32,
    pub dropped_frames: u64,
    pub jitter_ms: f32,
    pub sync_offset_ms: f32,
    pub decoder_name: &'static str,
    pub colorspace: &'static str,
}

/// Unified Hardware Render Pipeline running on WGPU / Native Compositor
pub struct HardwareVideoRenderer {
    device: Device,
    queue: Queue,
    surface: Surface<'static>,
    surface_config: SurfaceConfiguration,
    post_process_pipeline: RenderPipeline,
    bind_group_layout: BindGroupLayout,
    current_shader: shaders::MpcShader,
}

impl HardwareVideoRenderer {
    pub async fn new<W>(window: Arc<W>, width: u32, height: u32) -> anyhow::Result<Self>
    where
        W: HasWindowHandle + HasDisplayHandle + Send + Sync + 'static,
    {
        let instance = Instance::new(InstanceDescriptor {
            backends: Backends::PRIMARY, // D3D12/D3D11 on Windows, Metal on macOS, Vulkan on Linux
            ..Default::default()
        });

        let surface = instance.create_surface(window)?;
        let adapter = instance
            .request_adapter(&RequestAdapterOptions {
                power_preference: PowerPreference::HighPerformance,
                compatible_surface: Some(&surface),
                force_fallback_adapter: false,
            })
            .await
            .ok_or_else(|| anyhow::anyhow!("No hardware acceleration adapter found"))?;

        let (device, queue) = adapter
            .request_device(
                &DeviceDescriptor {
                    label: Some("MPC Hardware Decoder Device"),
                    required_features: Features::empty(),
                    required_limits: Limits::default(),
                    memory_hints: MemoryHints::Performance,
                },
                None,
            )
            .await?;

        let surface_caps = surface.get_capabilities(&adapter);
        let surface_format = surface_caps
            .formats
            .iter()
            .copied()
            .find(|f| f.is_srgb())
            .unwrap_or(surface_caps.formats[0]);

        let surface_config = SurfaceConfiguration {
            usage: TextureUsages::RENDER_ATTACHMENT,
            format: surface_format,
            width,
            height,
            present_mode: PresentMode::Fifo, // VSync synchronized, matching EVR-CP
            alpha_mode: surface_caps.alpha_modes[0],
            view_formats: vec![],
            desired_maximum_frame_latency: 2,
        };
        surface.configure(&device, &surface_config);

        // Compile MPC-HC pixel shader (Sharpen Complex 2 / BT.709 Levels)
        let shader_module = device.create_shader_module(ShaderModuleDescriptor {
            label: Some("MPC-HC Post-Process Shader"),
            source: ShaderSource::Wgsl(shaders::SHARPEN_COMPLEX_2_WGSL.into()),
        });

        let bind_group_layout = device.create_bind_group_layout(&BindGroupLayoutDescriptor {
            label: Some("Video Texture Bind Group Layout"),
            entries: &[
                BindGroupLayoutEntry {
                    binding: 0,
                    visibility: ShaderStages::FRAGMENT,
                    ty: BindingType::Texture {
                        sample_type: TextureSampleType::Float { filterable: true },
                        view_dimension: TextureViewDimension::D2,
                        multisampled: false,
                    },
                    count: None,
                },
                BindGroupLayoutEntry {
                    binding: 1,
                    visibility: ShaderStages::FRAGMENT,
                    ty: BindingType::Sampler(SamplerBindingType::Filtering),
                    count: None,
                },
            ],
        });

        let pipeline_layout = device.create_pipeline_layout(&PipelineLayoutDescriptor {
            label: Some("MPC Render Pipeline Layout"),
            bind_group_layouts: &[&bind_group_layout],
            push_constant_ranges: &[],
        });

        let post_process_pipeline = device.create_render_pipeline(&RenderPipelineDescriptor {
            label: Some("MPC Post-Processing Pipeline"),
            layout: Some(&pipeline_layout),
            vertex: VertexState {
                module: &shader_module,
                entry_point: Some("vs_main"),
                buffers: &[],
                compilation_options: Default::default(),
            },
            fragment: Some(FragmentState {
                module: &shader_module,
                entry_point: Some("fs_main"),
                targets: &[Some(ColorTargetState {
                    format: surface_config.format,
                    blend: Some(BlendState::REPLACE),
                    write_mask: ColorWrites::ALL,
                })],
                compilation_options: Default::default(),
            }),
            primitive: PrimitiveState::default(),
            depth_stencil: None,
            multisample: MultisampleState::default(),
            multiview: None,
            cache: None,
        });

        Ok(Self {
            device,
            queue,
            surface,
            surface_config,
            post_process_pipeline,
            bind_group_layout,
            current_shader: shaders::MpcShader::SharpenComplex2,
        })
    }

    pub fn resize(&mut self, width: u32, height: u32) {
        if width > 0 && height > 0 {
            self.surface_config.width = width;
            self.surface_config.height = height;
            self.surface.configure(&self.device, &self.surface_config);
        }
    }
}
