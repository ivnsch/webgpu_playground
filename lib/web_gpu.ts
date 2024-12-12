import { Mesh } from "./mesh";
import my_shader from "./shaders/screen_shader.wgsl";

export class WebGpu {
  adapter: GPUAdapter | null;
  device: GPUDevice | null;
  context: GPUCanvasContext;

  initialized: boolean = false;

  presentationFormat: GPUTextureFormat;
  pipeline: GPURenderPipeline | null;

  renderPassDescriptor: GPURenderPassDescriptor | null;

  mesh: Mesh;
  meshBuffer: GPUBuffer;
  meshBindGroup: GPUBindGroup;

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

  private initInternal = async (
    adapter: GPUAdapter,
    device: GPUDevice,
    context: GPUCanvasContext
  ) => {
    context.configure({
      device: device,
      format: this.presentationFormat,
    });

    this.adapter = adapter;
    this.device = device;
    this.context = context;

    this.mesh = new Mesh(this.device);
    this.meshBuffer = await createMeshBuffer(this.device);
    this.meshBindGroup = createMeshBindGroup(this.device, this.meshBuffer);

    this.pipeline = createPipeline(
      my_shader,
      device,
      this.presentationFormat,
      this.mesh
    );

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

    render(
      this.device,
      this.renderPassDescriptor,
      this.pipeline,
      this.mesh,
      this.meshBindGroup
    );
  };
}

const render = (
  device: GPUDevice,
  renderPassDescriptor: GPURenderPassDescriptor,
  pipeline: GPURenderPipeline,
  // it should be possible to make this more generic, for now like this
  mesh: Mesh,
  meshBindGroup: GPUBindGroup
) => {
  const encoder = device.createCommandEncoder({ label: "our encoder" });

  const pass = encoder.beginRenderPass(renderPassDescriptor);
  pass.setPipeline(pipeline);

  pass.setVertexBuffer(0, mesh.buffer);
  pass.setBindGroup(0, meshBindGroup);

  pass.draw(3); // call our vertex shader 3 times
  pass.end();

  const commandBuffer = encoder.finish();
  device.queue.submit([commandBuffer]);
};

const createPipeline = (
  shader: string,
  device: GPUDevice,
  presentationFormat: GPUTextureFormat,
  mesh: Mesh
): GPURenderPipeline => {
  return device.createRenderPipeline({
    label: "foo",
    layout: "auto",
    vertex: {
      module: device.createShaderModule({
        code: shader,
      }),
      entryPoint: "vs_main",
      buffers: [mesh.bufferLayout],
    },
    fragment: {
      module: device.createShaderModule({
        code: shader,
      }),
      entryPoint: "fs_main",
      targets: [
        {
          format: presentationFormat,
        },
      ],
    },
    primitive: {
      topology: "triangle-list",
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

const createMeshBuffer = async (device: GPUDevice): Promise<GPUBuffer> => {
  const modelBufferDescriptor: GPUBufferDescriptor = {
    size: 64 * 1024,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
  };
  return device.createBuffer(modelBufferDescriptor);
};

const createMeshBindGroup = (
  device: GPUDevice,
  meshBuffer: GPUBuffer
): GPUBindGroup => {
  const bindGroupLayout = device.createBindGroupLayout({
    entries: [
      {
        binding: 0,
        visibility: GPUShaderStage.VERTEX,
        buffer: {
          type: "read-only-storage",
          hasDynamicOffset: false,
        },
      },
    ],
  });
  return device.createBindGroup({
    layout: bindGroupLayout,
    entries: [
      {
        binding: 0,
        resource: {
          buffer: meshBuffer,
        },
      },
    ],
  });
};
