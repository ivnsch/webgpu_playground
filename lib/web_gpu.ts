import { mat4, vec3 } from "gl-matrix";
import { Matrix3x3 } from "./matrix_3x3";
import { Mesh } from "./mesh";
import my_shader from "./shaders/screen_shader.wgsl";
import { Camera } from "./camera";

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
  rotXBuffer: GPUBuffer | null = null;
  rotXMatrix: Matrix3x3 = Matrix3x3.rotZ(0);
  rotZBuffer: GPUBuffer | null = null;
  rotZMatrix: Matrix3x3 = Matrix3x3.rotZ(0);

  projectionBuffer: GPUBuffer | null;
  projection: mat4;

  cameraBuffer: GPUBuffer | null;
  camera: Camera;

  constructor(canvas: HTMLCanvasElement) {
    this.adapter = null;
    this.device = null;
    this.renderPassDescriptor = null;
    this.pipeline = null;
    this.rotYBuffer = null;
    this.mesh = null;
    this.bindGroup = null;
    this.projectionBuffer = null;
    this.cameraBuffer = null;

    this.rotYMatrix = Matrix3x3.rotZ(0);
    console.log(this.rotYMatrix);

    this.presentationFormat = "bgra8unorm";
    this.context = <GPUCanvasContext>canvas.getContext("webgpu");

    this.projection = createProjectionMatrix();
    this.camera = new Camera(origin());
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

    this.rotXBuffer = this.device.createBuffer({
      size: 64 * 2,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    this.rotYBuffer = this.device.createBuffer({
      size: 64 * 2,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    this.rotZBuffer = this.device.createBuffer({
      size: 64 * 2,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    this.projectionBuffer = this.device.createBuffer({
      size: 64 * 2,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    this.cameraBuffer = this.device.createBuffer({
      size: 64 * 2,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    this.mesh = new Mesh(this.device);

    const bindGroupResult = createBindGroup(
      this.device,
      this.mesh.buffer,
      this.rotXBuffer,
      this.rotZBuffer,
      this.rotYBuffer,
      this.projectionBuffer,
      this.cameraBuffer
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
        this.rotXBuffer &&
        this.rotYBuffer &&
        this.rotZBuffer &&
        this.projectionBuffer &&
        this.cameraBuffer
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
      this.rotXBuffer,
      this.rotXMatrix,
      this.rotYBuffer,
      this.rotYMatrix,
      this.rotZBuffer,
      this.rotZMatrix,
      this.projectionBuffer,
      this.projection,
      this.cameraBuffer,
      this.camera
    );
  };

  setRotX = (angle: number) => {
    this.rotXMatrix = Matrix3x3.rotX(angle);
  };

  setRotY = (angle: number) => {
    this.rotYMatrix = Matrix3x3.rotY(angle);
  };

  setRotZ = (angle: number) => {
    this.rotZMatrix = Matrix3x3.rotZ(angle);
  };
}

const render = (
  device: GPUDevice,
  renderPassDescriptor: GPURenderPassDescriptor,
  pipeline: GPURenderPipeline,
  // it should be possible to make this more generic, for now like this
  mesh: Mesh,

  bindGroup: GPUBindGroup,

  rotXBuffer: GPUBuffer,
  rotXMatrix: Matrix3x3,
  rotYBuffer: GPUBuffer,
  rotYMatrix: Matrix3x3,
  rotZBuffer: GPUBuffer,
  rotZMatrix: Matrix3x3,
  projectionBuffer: GPUBuffer,
  projection: mat4,
  cameraBuffer: GPUBuffer,
  camera: Camera
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

  device.queue.writeBuffer(rotXBuffer, 0, <ArrayBuffer>rotXMatrix.toGlMatrix());
  device.queue.writeBuffer(rotYBuffer, 0, <ArrayBuffer>rotYMatrix.toGlMatrix());
  device.queue.writeBuffer(rotZBuffer, 0, <ArrayBuffer>rotZMatrix.toGlMatrix());
  device.queue.writeBuffer(projectionBuffer, 0, <ArrayBuffer>projection);
  device.queue.writeBuffer(cameraBuffer, 0, <ArrayBuffer>camera.matrix());
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
  rotXBuffer: GPUBuffer,
  rotYBuffer: GPUBuffer,
  rotZBuffer: GPUBuffer,
  projectionBuffer: GPUBuffer,
  cameraBuffer: GPUBuffer
): BindGroupCreationResult => {
  const bindGroupLayout = device.createBindGroupLayout({
    label: "my bind group layout",
    entries: [
      {
        binding: 0,
        visibility: GPUShaderStage.VERTEX,
        buffer: {},
      },
      {
        binding: 1,
        visibility: GPUShaderStage.VERTEX,
        buffer: {},
      },
      {
        binding: 2,
        visibility: GPUShaderStage.VERTEX,
        buffer: {},
      },
      {
        binding: 3,
        visibility: GPUShaderStage.VERTEX,
        buffer: {},
      },
      {
        binding: 4,
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
          buffer: projectionBuffer,
        },
      },
      {
        binding: 1,
        resource: {
          buffer: cameraBuffer,
        },
      },
      {
        binding: 2,
        resource: {
          buffer: rotXBuffer,
        },
      },
      {
        binding: 3,
        resource: {
          buffer: rotYBuffer,
        },
      },
      {
        binding: 4,
        resource: {
          buffer: rotZBuffer,
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

const createProjectionMatrix = () => {
  //   return createIdentityMatrix();
  const m = mat4.create();
  mat4.perspective(m, Math.PI / 4, 800 / 600, 0.1, 10);
  return m;
};

const createIdentityMatrix = () => {
  const m = mat4.create();
  mat4.identity(m);
  return m;
};

const origin = () => {
  const m = vec3.create();
  vec3.zero(m);
  return m;
};
