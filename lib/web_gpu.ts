import { mat4, vec3 } from "gl-matrix";
import { AxisLines } from "./axis_lines";
import {
  xAxisVertices,
  xAxisVerticesNew,
  yAxisVertices,
  zAxisVertices,
} from "./axis_mesh";
import { Camera } from "./camera";
import { CANVAS_HEIGHT, CANVAS_WIDTH } from "./constants";
import { CubeMesh } from "./cube_mesh";
import { TriangleEntity } from "./entity";
import { Mesh } from "./mesh";
import my_shader from "./shaders/screen_shader.wgsl";

export class WebGpu {
  adapter: GPUAdapter | null = null;
  device: GPUDevice | null = null;
  context: GPUCanvasContext;

  presentationFormat: GPUTextureFormat;
  pipeline: GPURenderPipeline | null = null;

  renderPassDescriptor: GPURenderPassDescriptor | null = null;

  triangle: TriangleEntity | null = null;

  cubeMesh: CubeMesh | null = null;
  yAxisMesh: Mesh | null = null;
  zAxisMesh: Mesh | null = null;

  yAxisBindGroup: GPUBindGroup | null = null;
  zAxisBindGroup: GPUBindGroup | null = null;
  cubeBindGroup: GPUBindGroup | null = null;

  cubeRotBuffer: GPUBuffer | null = null;
  cubeEulersMatrix: mat4 | null = createIdentityMatrix();

  projectionBuffer: GPUBuffer | null = null;
  projection: mat4;

  cameraBuffer: GPUBuffer | null = null;
  camera: Camera;

  xAxisLines: AxisLines | null = null;

  yAxisMeshTypeBuffer: GPUBuffer | null = null;
  zAxisMeshTypeBuffer: GPUBuffer | null = null;
  cubeMeshTypeBuffer: GPUBuffer | null = null;

  zAxesInstancesBuffer: GPUBuffer | null = null;
  zAxesNumInstances = 20; // remember to set this in z_axes_transforms in the shader too
  zAxesMatrixFloatCount = 16; // 4x4 matrix
  zAxesMatrixSize = 4 * this.zAxesMatrixFloatCount;
  zAxesInstancesMatrices = new Float32Array(
    this.zAxesMatrixFloatCount * this.zAxesNumInstances
  );

  identityBuffer: GPUBuffer | null = null;
  identity: mat4;

  depthStencilResources: DepthBufferResources | null = null;

  constructor(canvas: HTMLCanvasElement, cameraPos: vec3) {
    this.presentationFormat = "bgra8unorm";
    this.context = <GPUCanvasContext>canvas.getContext("webgpu");

    this.projection = createProjectionMatrix();
    this.camera = new Camera(cameraPos);

    const zGridSpacing = 0.2;
    for (let i = 0; i < this.zAxesNumInstances; i++) {
      const x = (i - this.zAxesNumInstances / 2) * zGridSpacing;
      this.zAxesInstancesMatrices.set(
        createY0PlaneVerticalLinesTranslationMatrix(x),
        this.zAxesMatrixFloatCount * i
      );
    }

    this.identity = mat4.create();
    mat4.identity(this.identity);
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

    const triangle = new TriangleEntity(this.device);
    this.triangle = triangle;
    this.cubeMesh = new CubeMesh(this.device);
    const xAxisLines = new AxisLines(
      device,
      "x axes instances buffer (new)",
      xAxisVerticesNew()
    );
    this.xAxisLines = xAxisLines;

    this.context.configure({
      device: device,
      format: this.presentationFormat,
    });

    this.cubeRotBuffer = createMatrixUniformBuffer(device);
    this.projectionBuffer = createMatrixUniformBuffer(device);
    this.cameraBuffer = createMatrixUniformBuffer(device);

    // types
    xAxisLines.meshTypeBuffer = createMeshTypeUniformBuffer(device);
    new Uint32Array(xAxisLines.meshTypeBuffer.getMappedRange()).set([0]);
    xAxisLines.meshTypeBuffer.unmap();
    this.yAxisMeshTypeBuffer = createMeshTypeUniformBuffer(device);
    new Uint32Array(this.yAxisMeshTypeBuffer.getMappedRange()).set([1]);
    this.yAxisMeshTypeBuffer.unmap();
    this.zAxisMeshTypeBuffer = createMeshTypeUniformBuffer(device);
    new Uint32Array(this.zAxisMeshTypeBuffer.getMappedRange()).set([2]);
    this.zAxisMeshTypeBuffer.unmap();
    triangle.meshTypeBuffer = createMeshTypeUniformBuffer(device);
    new Uint32Array(triangle.meshTypeBuffer.getMappedRange()).set([4]);
    triangle.meshTypeBuffer.unmap();
    this.cubeMeshTypeBuffer = createMeshTypeUniformBuffer(device);
    new Uint32Array(this.cubeMeshTypeBuffer.getMappedRange()).set([5]);
    this.cubeMeshTypeBuffer.unmap();

    const zAxesInstancesBufferSize =
      this.zAxesNumInstances * this.zAxesMatrixSize;
    this.zAxesInstancesBuffer = device.createBuffer({
      label: "z axes instances buffer",
      size: zAxesInstancesBufferSize,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    this.identityBuffer = device.createBuffer({
      label: "identity buffer",
      size: 64, // 4 x 4 matrix x 4 bytes per float
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    this.yAxisMesh = new Mesh("y axis mesh", this.device, yAxisVertices());
    this.zAxisMesh = new Mesh("z axis mesh", this.device, zAxisVertices());

    const bindGroupLayout = createBindGroupLayout(this.device);

    triangle.bindGroup = createBindGroup(
      "triangle (new) bind group",
      this.device,
      bindGroupLayout,
      this.triangle.eulersBuffer,
      this.cubeRotBuffer,
      this.projectionBuffer,
      this.cameraBuffer,
      triangle.meshTypeBuffer,
      this.zAxesInstancesBuffer,
      xAxisLines,
      this.identityBuffer
    );

    this.cubeBindGroup = createBindGroup(
      "cube bind group",
      this.device,
      bindGroupLayout,
      this.triangle.eulersBuffer,
      this.cubeRotBuffer,
      this.projectionBuffer,
      this.cameraBuffer,
      this.cubeMeshTypeBuffer,
      this.zAxesInstancesBuffer,
      xAxisLines,
      this.identityBuffer
    );

    this.xAxisLines.bindGroup = createBindGroup(
      "x axis bind group (new)",
      this.device,
      bindGroupLayout,
      this.triangle.eulersBuffer,
      this.cubeRotBuffer,
      this.projectionBuffer,
      this.cameraBuffer,
      xAxisLines.meshTypeBuffer,
      this.zAxesInstancesBuffer,
      xAxisLines,
      this.identityBuffer
    );

    this.yAxisBindGroup = createBindGroup(
      "y axis bind group",
      this.device,
      bindGroupLayout,
      this.triangle.eulersBuffer,
      this.cubeRotBuffer,
      this.projectionBuffer,
      this.cameraBuffer,
      this.yAxisMeshTypeBuffer,
      this.zAxesInstancesBuffer,
      xAxisLines,
      this.identityBuffer
    );

    this.zAxisBindGroup = createBindGroup(
      "z axis bind group",
      this.device,
      bindGroupLayout,
      this.triangle.eulersBuffer,
      this.cubeRotBuffer,
      this.projectionBuffer,
      this.cameraBuffer,
      this.zAxisMeshTypeBuffer,
      this.zAxesInstancesBuffer,
      xAxisLines,
      this.identityBuffer
    );

    this.depthStencilResources = makeDepthBufferResources(device);

    this.pipeline = createPipeline(
      my_shader,
      device,
      this.presentationFormat,
      this.triangle.bufferLayout,
      bindGroupLayout,
      this.depthStencilResources.depthStencilState
    );
  };

  private createCurrentTextureView = (): GPUTextureView => {
    return this.context.getCurrentTexture().createView();
  };

  private initRenderPassDescriptor = (
    depthStencilAttachment: GPURenderPassDepthStencilAttachment
  ) => {
    const descriptor = createRenderPassDescriptor(
      this.createCurrentTextureView(),
      depthStencilAttachment
    );
    this.renderPassDescriptor = descriptor;
  };

  render = () => {
    if (!this.depthStencilResources) {
      return;
    }
    // TODO does this really have to be inialized in render?
    this.initRenderPassDescriptor(
      this.depthStencilResources.depthStencilAttachment
    );

    if (
      !(
        this.device &&
        this.renderPassDescriptor &&
        this.pipeline &&
        this.yAxisMesh &&
        this.zAxisMesh &&
        this.triangle &&
        this.cubeMesh &&
        this.triangle.bindGroup &&
        this.triangle.eulersMatrix &&
        this.cubeBindGroup &&
        this.xAxisLines &&
        this.yAxisBindGroup &&
        this.zAxisBindGroup &&
        this.cubeRotBuffer &&
        this.cubeEulersMatrix &&
        this.projectionBuffer &&
        this.cameraBuffer &&
        this.zAxesInstancesBuffer &&
        this.identityBuffer
      )
    ) {
      console.log("missing deps, can't render");
      console.log("this triangle" + this.triangle?.bindGroup);
      return;
    }

    render(
      this.device,
      this.renderPassDescriptor,
      this.pipeline,
      this.xAxisLines,
      this.yAxisMesh,
      this.zAxisMesh,
      this.triangle,
      this.cubeMesh,
      this.triangle.bindGroup,
      this.cubeBindGroup,
      this.yAxisBindGroup,
      this.zAxisBindGroup,
      this.triangle.eulersBuffer,
      this.triangle.eulersMatrix,
      this.cubeRotBuffer,
      this.cubeEulersMatrix,
      this.projectionBuffer,
      this.projection,
      this.cameraBuffer,
      this.camera,
      this.zAxesInstancesBuffer,
      this.zAxesInstancesMatrices,
      this.zAxesNumInstances,
      this.identityBuffer,
      this.identity
    );
  };

  setTriangleEulers = (pitch: number, yaw: number, roll: number) => {
    this.triangle?.setEulers(pitch, yaw, roll);
  };

  setCameraEulers = (pitch: number, yaw: number, roll: number) => {
    this.camera.pitch = pitch;
    this.camera.yaw = yaw;
    this.camera.roll = roll;
  };

  setCameraTranslation = (translation: vec3) => {
    this.camera.position = translation;
  };
}

const render = (
  device: GPUDevice,
  renderPassDescriptor: GPURenderPassDescriptor,
  pipeline: GPURenderPipeline,
  xAxisLines: AxisLines,

  // it should be possible to make this more generic, for now like this
  yAxisMesh: Mesh,
  zAxisMesh: Mesh,
  triangle: TriangleEntity,
  cubeMesh: CubeMesh,

  triangleNewBindGroup: GPUBindGroup,
  cubeBindGroup: GPUBindGroup,
  yAxisbindGroup: GPUBindGroup,
  zAxisbindGroup: GPUBindGroup,

  triangleNewEulersBuffer: GPUBuffer,
  triangleNewEulersMatrix: mat4,
  cubeRotBuffer: GPUBuffer,
  cubeRotMatrix: mat4,

  projectionBuffer: GPUBuffer,
  projection: mat4,
  cameraBuffer: GPUBuffer,
  camera: Camera,

  zAxesInstancesBuffer: GPUBuffer,
  zAxesInstancesMatrices: Float32Array,
  zAxisNumInstances: number,
  identityBuffer: GPUBuffer,
  identityMatrix: mat4
) => {
  camera.update();

  const encoder = device.createCommandEncoder({ label: "our encoder" });

  const pass = encoder.beginRenderPass(renderPassDescriptor);
  pass.setPipeline(pipeline);

  //   triangle (new)
  pass.setBindGroup(0, triangleNewBindGroup);
  pass.setVertexBuffer(0, triangle.buffer);
  pass.draw(3, 1);

  // cube
  pass.setBindGroup(0, cubeBindGroup);
  pass.setVertexBuffer(0, cubeMesh.buffer);
  pass.draw(36, 1);

  // axes
  xAxisLines.render(device, pass);
  pass.setBindGroup(0, yAxisbindGroup);
  pass.setVertexBuffer(0, yAxisMesh.buffer);
  pass.draw(6, 1);
  pass.setBindGroup(0, zAxisbindGroup);
  pass.setVertexBuffer(0, zAxisMesh.buffer);
  pass.draw(6, zAxisNumInstances);

  pass.end();

  const commandBuffer = encoder.finish();
  device.queue.submit([commandBuffer]);

  device.queue.writeBuffer(
    triangleNewEulersBuffer,
    0,
    <ArrayBuffer>triangleNewEulersMatrix
  );
  device.queue.writeBuffer(cubeRotBuffer, 0, <ArrayBuffer>cubeRotMatrix);
  device.queue.writeBuffer(projectionBuffer, 0, <ArrayBuffer>projection);
  device.queue.writeBuffer(cameraBuffer, 0, <ArrayBuffer>camera.matrix());
  device.queue.writeBuffer(identityBuffer, 0, <ArrayBuffer>identityMatrix);
  device.queue.writeBuffer(
    xAxisLines.instancesBuffer,
    0,
    xAxisLines.instancesMatrices.buffer,
    xAxisLines.instancesMatrices.byteOffset,
    xAxisLines.instancesMatrices.byteLength
  );
  device.queue.writeBuffer(
    zAxesInstancesBuffer,
    0,
    zAxesInstancesMatrices.buffer,
    zAxesInstancesMatrices.byteOffset,
    zAxesInstancesMatrices.byteLength
  );
};

const createRenderPassDescriptor = (
  view: GPUTextureView,
  depthStencilAttachment: GPURenderPassDepthStencilAttachment
): GPURenderPassDescriptor => {
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
    depthStencilAttachment: depthStencilAttachment,
  };
};

const createBindGroupLayout = (device: GPUDevice): GPUBindGroupLayout => {
  return device.createBindGroupLayout({
    label: "my bind group layout",
    entries: [
      { binding: 0, visibility: GPUShaderStage.VERTEX, buffer: {} },
      { binding: 1, visibility: GPUShaderStage.VERTEX, buffer: {} },
      { binding: 2, visibility: GPUShaderStage.VERTEX, buffer: {} },
      { binding: 3, visibility: GPUShaderStage.VERTEX, buffer: {} },
      { binding: 4, visibility: GPUShaderStage.VERTEX, buffer: {} },
      { binding: 5, visibility: GPUShaderStage.VERTEX, buffer: {} },
      { binding: 6, visibility: GPUShaderStage.VERTEX, buffer: {} },
      { binding: 7, visibility: GPUShaderStage.VERTEX, buffer: {} },
    ],
  });
};

const createBindGroup = (
  label: string,
  device: GPUDevice,
  bindGroupLayout: GPUBindGroupLayout,
  triangleRotBuffer: GPUBuffer,
  cubeRotBuffer: GPUBuffer,
  projectionBuffer: GPUBuffer,
  cameraBuffer: GPUBuffer,
  meshTypeBuffer: GPUBuffer,
  zAxisInstancesBuffer: GPUBuffer,
  xAxisLines: AxisLines,
  identityBuffer: GPUBuffer
): GPUBindGroup => {
  return device.createBindGroup({
    label: label,
    layout: bindGroupLayout,
    entries: [
      { binding: 0, resource: { buffer: projectionBuffer } },
      { binding: 1, resource: { buffer: cameraBuffer } },
      { binding: 2, resource: { buffer: triangleRotBuffer } },
      { binding: 3, resource: { buffer: cubeRotBuffer } },
      { binding: 4, resource: { buffer: meshTypeBuffer } },
      { binding: 5, resource: { buffer: zAxisInstancesBuffer } },
      { binding: 6, resource: { buffer: xAxisLines.instancesBuffer } },
      { binding: 7, resource: { buffer: identityBuffer } },
    ],
  });
};

const createPipeline = (
  shader: string,
  device: GPUDevice,
  presentationFormat: GPUTextureFormat,
  triangleBuffer: GPUVertexBufferLayout,
  bindGroupLayout: GPUBindGroupLayout,
  depthStencilState: GPUDepthStencilState
): GPURenderPipeline => {
  const layout = device.createPipelineLayout({
    bindGroupLayouts: [bindGroupLayout],
  });

  return device.createRenderPipeline({
    label: "my pipeline",
    layout: layout,
    vertex: {
      module: device.createShaderModule({ code: shader }),
      entryPoint: "vs_main",
      buffers: [triangleBuffer],
    },
    fragment: {
      module: device.createShaderModule({ code: shader }),
      entryPoint: "fs_main",
      targets: [{ format: presentationFormat }],
    },
    primitive: {
      topology: "triangle-list",
    },
    depthStencil: depthStencilState,
  });
};

const makeDepthBufferResources = (device: GPUDevice): DepthBufferResources => {
  const depthStencilState = {
    format: "depth24plus-stencil8",
    depthWriteEnabled: true,
    depthCompare: "less-equal",
  };

  const size: GPUExtent3D = {
    width: CANVAS_WIDTH,
    height: CANVAS_HEIGHT,
    depthOrArrayLayers: 1,
  };

  const depthBufferDescriptor: GPUTextureDescriptor = {
    size: size,
    format: "depth24plus-stencil8",
    usage: GPUTextureUsage.RENDER_ATTACHMENT,
  };

  const depthStencilBuffer = device.createTexture(depthBufferDescriptor);

  const viewDescriptor: GPUTextureViewDescriptor = {
    format: "depth24plus-stencil8",
    dimension: "2d",
    aspect: "all",
  };
  const depthStencilView = depthStencilBuffer.createView();

  const depthStencilAttachment = {
    view: depthStencilView,
    depthClearValue: 1.0,
    depthLoadOp: "clear",
    depthStoreOp: "store",
    stencilLoadOp: "clear",
    stencilStoreOp: "discard",
  };

  return {
    depthStencilState,
    depthStencilBuffer,
    depthStencilView,
    depthStencilAttachment,
  };
};

type DepthBufferResources = {
  depthStencilState: GPUDepthStencilState;
  depthStencilBuffer: GPUTexture;
  depthStencilView: GPUTextureView;
  depthStencilAttachment: GPURenderPassDepthStencilAttachment;
};

const createProjectionMatrix = () => {
  const m = mat4.create();
  mat4.perspective(m, Math.PI / 4, 800 / 600, 0.1, 10);
  return m;
};

export const createIdentityMatrix = () => {
  const m = mat4.create();
  mat4.identity(m);
  return m;
};

export const origin = () => {
  const m = vec3.create();
  vec3.zero(m);
  return m;
};

export const createMatrixUniformBuffer = (device: GPUDevice): GPUBuffer => {
  return device.createBuffer({
    size: 64,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });
};

const createMeshTypeUniformBuffer = (device: GPUDevice): GPUBuffer => {
  return device.createBuffer({
    size: 16,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    mappedAtCreation: true,
  });
};

export const createZ0PlaneHorizontalLinesTranslationMatrix = (
  y: number
): mat4 => {
  const m = mat4.create();
  mat4.fromTranslation(m, vec3.fromValues(0, y, 0));
  return m;
};

export const createY0PlaneHorizontalLinesTranslationMatrix = (
  z: number
): mat4 => {
  const m = mat4.create();
  mat4.fromTranslation(m, vec3.fromValues(0, 0, z));
  return m;
};

export const createY0PlaneVerticalLinesTranslationMatrix = (
  x: number
): mat4 => {
  const m = mat4.create();
  mat4.fromTranslation(m, vec3.fromValues(x, 0, 0));
  return m;
};
