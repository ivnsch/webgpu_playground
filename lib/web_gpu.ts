import { Matrix3x3 } from "./matrix_3x3";
import { Mesh } from "./mesh";
import my_shader from "./shaders/screen_shader.wgsl";

export class WebGpu {
  adapter: GPUAdapter | null;
  device: GPUDevice | null;
  context: GPUCanvasContext;

  presentationFormat: GPUTextureFormat;
  pipeline: GPURenderPipeline | null;

  renderPassDescriptor: GPURenderPassDescriptor | null;

  mesh: Mesh | null;

  bindGroup: GPUBindGroup | null;

  rotYBuffer: GPUBuffer | null;
  rotYMatrix: Matrix3x3;

  constructor(canvas: HTMLCanvasElement) {
    this.adapter = null;
    this.device = null;
    this.renderPassDescriptor = null;
    this.pipeline = null;
    this.rotYBuffer = null;
    this.mesh = null;
    this.bindGroup = null;

    this.rotYMatrix = Matrix3x3.rotY(0);
    console.log(this.rotYMatrix);

    this.presentationFormat = "bgra8unorm";
    this.context = <GPUCanvasContext>canvas.getContext("webgpu");
  }

  init = async (navigator: Navigator) => {
    const adapter = <GPUAdapter>await navigator.gpu?.requestAdapter();
    if (adapter) {
      const device = <GPUDevice>await adapter.requestDevice();
      this.initInternal(adapter, device);
    } else {
      console.log("error: no adapter");
    }
  };

  private initInternal = async (adapter: GPUAdapter, device: GPUDevice) => {
    this.adapter = adapter;
    this.device = device;

    this.context.configure({
      device: device,
      format: this.presentationFormat,
    });

    this.rotYBuffer = this.device.createBuffer({
      size: 64 * 2,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    this.mesh = new Mesh(this.device);

    const bindGroupResult = createBindGroup(
      this.device,
      this.mesh.buffer,
      this.rotYBuffer
    );
    this.bindGroup = bindGroupResult.bindGroup;
    this.pipeline = createPipeline(
      my_shader,
      device,
      this.presentationFormat,
      this.mesh,
      bindGroupResult.bindGroupLayout
    );
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
    // TODO does this really have to be inialized in render?
    this.initRenderPassDescriptor();

    if (
      !(
        this.device &&
        this.renderPassDescriptor &&
        this.pipeline &&
        this.mesh &&
        this.bindGroup &&
        this.rotYBuffer
      )
    ) {
      return;
    }

    render(
      this.device,
      this.renderPassDescriptor,
      this.pipeline,
      this.mesh,
      this.bindGroup,
      this.rotYBuffer,
      this.rotYMatrix
    );
  };
}

const render = (
  device: GPUDevice,
  renderPassDescriptor: GPURenderPassDescriptor,
  pipeline: GPURenderPipeline,
  // it should be possible to make this more generic, for now like this
  mesh: Mesh,

  bindGroup: GPUBindGroup,

  rotYBuffer: GPUBuffer,
  rotYMatrix: Matrix3x3
) => {
  const encoder = device.createCommandEncoder({ label: "our encoder" });

  const pass = encoder.beginRenderPass(renderPassDescriptor);
  pass.setPipeline(pipeline);

  pass.setVertexBuffer(0, mesh.buffer);
  pass.setBindGroup(0, bindGroup);

  pass.draw(3); // call our vertex shader 3 times
  pass.end();

  const commandBuffer = encoder.finish();
  device.queue.submit([commandBuffer]);

  device.queue.writeBuffer(rotYBuffer, 0, <ArrayBuffer>rotYMatrix.toGlMatrix());

  console.log("!! " + rotYMatrix.toGlMatrix());
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

const createBindGroup = (
  device: GPUDevice,
  meshBuffer: GPUBuffer,
  rotYBuffer: GPUBuffer
): BindGroupCreationResult => {
  const bindGroupLayout = device.createBindGroupLayout({
    label: "my bind group layout",
    entries: [
      {
        binding: 0,
        visibility: GPUShaderStage.VERTEX,
        buffer: {},
      },
    ],
  });
  const bindGroup = device.createBindGroup({
    label: "my bind group",
    layout: bindGroupLayout,
    entries: [
      {
        binding: 0,
        resource: {
          buffer: rotYBuffer,
        },
      },
    ],
  });

  return new BindGroupCreationResult(bindGroupLayout, bindGroup);
};

const createPipeline = (
  shader: string,
  device: GPUDevice,
  presentationFormat: GPUTextureFormat,
  mesh: Mesh,
  bindGroupLayout: GPUBindGroupLayout
): GPURenderPipeline => {
  const layout = device.createPipelineLayout({
    bindGroupLayouts: [bindGroupLayout],
  });

  return device.createRenderPipeline({
    label: "my pipeline",
    layout: layout,
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

class BindGroupCreationResult {
  bindGroupLayout: GPUBindGroupLayout;
  bindGroup: GPUBindGroup;

  constructor(bindGroupLayout: GPUBindGroupLayout, bindGroup: GPUBindGroup) {
    this.bindGroupLayout = bindGroupLayout;
    this.bindGroup = bindGroup;
  }
}
