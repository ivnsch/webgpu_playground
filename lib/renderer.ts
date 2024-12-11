import screen_shader from "./shaders/screen_shader.wgsl";

export class Renderer {
  canvas: HTMLCanvasElement;

  adapter: GPUAdapter;
  device: GPUDevice;
  context: GPUCanvasContext;
  presentationFormat: GPUTextureFormat;
  renderPassDescriptor: GPURenderPassDescriptor;
  resizeObserver: ResizeObserver;

  pipeline: GPURenderPipeline;

  color_buffer: GPUTexture;
  color_buffer_view: GPUTextureView;
  sampler: GPUSampler;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
  }

  async Initialize() {
    await this.setupDevice();
    await this.setupResizeObserver();
    await this.makePipeline();
  }

  async setupDevice() {
    this.adapter = <GPUAdapter>await navigator.gpu?.requestAdapter();
    this.device = <GPUDevice>await this.adapter?.requestDevice();
    this.context = <GPUCanvasContext>this.canvas.getContext("webgpu");
    this.presentationFormat = "bgra8unorm";

    const commandEncoder: GPUCommandEncoder =
      this.device.createCommandEncoder();

    this.renderPassDescriptor = {
      label: "our basic canvas renderPass",
      colorAttachments: [
        {
          view: undefined, // <- to be filled out when we render
          clearValue: [0.3, 0.3, 0.3, 1],
          loadOp: "clear",
          storeOp: "store",
        },
      ],
    };

    this.context.configure({
      device: this.device,
      format: this.presentationFormat,
    });
  }

  async makePipeline() {
    this.pipeline = this.device.createRenderPipeline({
      label: "hardcoded checkerboard triangle pipeline",
      layout: "auto",
      vertex: {
        module: this.device.createShaderModule({
          code: screen_shader,
        }),
      },
      fragment: {
        module: this.device.createShaderModule({
          code: screen_shader,
        }),
        targets: [
          {
            format: this.presentationFormat,
          },
        ],
      },
    });
  }

  // not being called for some reason..
  async setupResizeObserver() {
    this.resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const canvas: HTMLCanvasElement = entry.target as HTMLCanvasElement;
        const width = entry.contentBoxSize[0].inlineSize;
        const height = entry.contentBoxSize[0].blockSize;
        canvas.width = Math.max(
          1,
          Math.min(width, this.device.limits.maxTextureDimension2D)
        );
        canvas.height = Math.max(
          1,
          Math.min(height, this.device.limits.maxTextureDimension2D)
        );
        // re-render
        this.render();
      }
    });
    this.resizeObserver.observe(this.canvas);
  }

  render = () => {
    this.renderPassDescriptor.colorAttachments[0].view = this.context
      .getCurrentTexture()
      .createView();

    const encoder = this.device.createCommandEncoder({ label: "our encoder" });
    const pass = encoder.beginRenderPass(this.renderPassDescriptor);
    pass.setPipeline(this.pipeline);
    pass.draw(3); // call our vertex shader 3 times
    pass.end();

    const commandBuffer = encoder.finish();
    this.device.queue.submit([commandBuffer]);
  };
}
