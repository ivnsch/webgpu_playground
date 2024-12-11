import my_shader from "./shaders/screen_shader.wgsl";

export class WebGpu {
  adapter: GPUAdapter | null;
  device: GPUDevice | null;
  context: GPUCanvasContext;

  initialized: boolean = false;

  presentationFormat: GPUTextureFormat;
  pipeline: GPURenderPipeline | null;

  renderPassDescriptor: GPURenderPassDescriptor | null;

  constructor() {
    this.adapter = null;
    this.device = null;
    this.renderPassDescriptor = null;
    this.pipeline = null;

    this.presentationFormat = "bgra8unorm";
  }

  init = async (canvas: HTMLCanvasElement, navigator: Navigator) => {
    const adapter = <GPUAdapter>await navigator.gpu?.requestAdapter();
    if (adapter) {
      const device = <GPUDevice>await adapter.requestDevice();
      const context = <GPUCanvasContext>canvas.getContext("webgpu");
      if (context) {
        this.initInternal(adapter, device, context);
      } else {
        console.log("error: no context");
      }
    } else {
      console.log("error: no adapter");
    }
  };

  private initInternal = (
    adapter: GPUAdapter,
    device: GPUDevice,
    context: GPUCanvasContext
  ) => {
    context.configure({
      device: device,
      format: this.presentationFormat,
    });
    this.pipeline = createPipeline(my_shader, device, this.presentationFormat);

    this.adapter = adapter;
    this.device = device;
    this.context = context;

    this.initialized = true;
  };

  private createCurrentTextureView = (): GPUTextureView => {
    return this.context.getCurrentTexture().createView();
  };

  private initRenderPassDescriptor = (): any => {
    const descriptor = createRenderPassDescriptor(
      this.createCurrentTextureView()
    );
    this.renderPassDescriptor = descriptor;
  };

  render = () => {
    if (!this.initialized) {
      console.log("Error: not initialized");
      return;
    }
    // TODO does this really have to be inialized in render?
    this.initRenderPassDescriptor();

    render(this.device, this.renderPassDescriptor, this.pipeline);
  };
}

const render = (
  device: GPUDevice,
  renderPassDescriptor: GPURenderPassDescriptor,
  pipeline: GPURenderPipeline
) => {
  const encoder = device.createCommandEncoder({ label: "our encoder" });

  const pass = encoder.beginRenderPass(renderPassDescriptor);
  pass.setPipeline(pipeline);
  pass.draw(3); // call our vertex shader 3 times
  pass.end();

  const commandBuffer = encoder.finish();
  device.queue.submit([commandBuffer]);
};

const createPipeline = (
  shader: string,
  device: GPUDevice,
  presentationFormat: GPUTextureFormat
): GPURenderPipeline => {
  return device.createRenderPipeline({
    label: "foo",
    layout: "auto",
    vertex: {
      module: device.createShaderModule({
        code: shader,
      }),
    },
    fragment: {
      module: device.createShaderModule({
        code: shader,
      }),
      targets: [
        {
          format: presentationFormat,
        },
      ],
    },
  });
};

const createRenderPassDescriptor = (view: GPUTextureView): any => {
  return {
    label: "our basic canvas renderPass",
    colorAttachments: [
      {
        view: view,
        clearValue: [0.3, 0.3, 0.3, 1],
        loadOp: "clear",
        storeOp: "store",
      },
    ],
  };
};
