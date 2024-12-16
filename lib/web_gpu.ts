import { mat4, vec3 } from "gl-matrix";
import { setObjPitch, setObjYaw, setObjRoll, trans } from "./matrix_3x3";
import { TriangleMesh } from "./triangle_mesh";
import my_shader from "./shaders/screen_shader.wgsl";
import { Camera } from "./camera";
import { Mesh } from "./mesh";
import { xAxisVertices, yAxisVertices, zAxisVertices } from "./axis_mesh";

export class WebGpu {
  adapter: GPUAdapter | null = null;
  device: GPUDevice | null = null;
  context: GPUCanvasContext;

  presentationFormat: GPUTextureFormat;
  pipeline: GPURenderPipeline | null = null;

  renderPassDescriptor: GPURenderPassDescriptor | null = null;

  triangleMesh: TriangleMesh | null = null;
  xAxisMesh: Mesh | null = null;
  yAxisMesh: Mesh | null = null;
  zAxisMesh: Mesh | null = null;

  triangleBindGroup: GPUBindGroup | null = null;
  xAxisBindGroup: GPUBindGroup | null = null;
  yAxisBindGroup: GPUBindGroup | null = null;
  zAxisBindGroup: GPUBindGroup | null = null;

  rotBuffer: GPUBuffer | null = null;
  eulersMatrix: mat4 | null = createIdentityMatrix();

  projectionBuffer: GPUBuffer | null = null;
  projection: mat4;

  cameraBuffer: GPUBuffer | null = null;
  camera: Camera;

  xAxisMeshTypeBuffer: GPUBuffer | null = null;
  yAxisMeshTypeBuffer: GPUBuffer | null = null;
  zAxisMeshTypeBuffer: GPUBuffer | null = null;
  triangleMeshTypeBuffer: GPUBuffer | null = null;

  xAxesInstancesBuffer: GPUBuffer | null = null;
  xAxesNumInstances = 20; // remember to set this in x_axes_transforms in the shader too
  xAxesMatrixFloatCount = 16; // 4x4 matrix
  xAxesMatrixSize = 4 * this.xAxesMatrixFloatCount;
  xAxesInstancesMatrices = new Float32Array(
    this.xAxesMatrixFloatCount * this.xAxesNumInstances
  );

  zAxesInstancesBuffer: GPUBuffer | null = null;
  zAxesNumInstances = 20; // remember to set this in z_axes_transforms in the shader too
  zAxesMatrixFloatCount = 16; // 4x4 matrix
  zAxesMatrixSize = 4 * this.zAxesMatrixFloatCount;
  zAxesInstancesMatrices = new Float32Array(
    this.zAxesMatrixFloatCount * this.zAxesNumInstances
  );

  identityBuffer: GPUBuffer | null = null;
  identity: mat4;

  constructor(canvas: HTMLCanvasElement, cameraPos: vec3) {
    console.log(this.eulersMatrix);

    this.presentationFormat = "bgra8unorm";
    this.context = <GPUCanvasContext>canvas.getContext("webgpu");

    this.projection = createProjectionMatrix();
    this.camera = new Camera(cameraPos);

    const xGridSpacing = 0.2;
    for (let i = 0; i < this.xAxesNumInstances; i++) {
      const z = (i - this.xAxesNumInstances / 2) * xGridSpacing;
      this.xAxesInstancesMatrices.set(
        createY0PlaneHorizontalLinesTranslationMatrix(z),
        this.xAxesMatrixFloatCount * i
      );
    }

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

    this.context.configure({
      device: device,
      format: this.presentationFormat,
    });

    this.rotBuffer = createMatrixUniformBuffer(device);
    this.projectionBuffer = createMatrixUniformBuffer(device);
    this.cameraBuffer = createMatrixUniformBuffer(device);

    // types
    this.xAxisMeshTypeBuffer = createMeshTypeUniformBuffer(device);
    new Uint32Array(this.xAxisMeshTypeBuffer.getMappedRange()).set([0]);
    this.xAxisMeshTypeBuffer.unmap();
    this.yAxisMeshTypeBuffer = createMeshTypeUniformBuffer(device);
    new Uint32Array(this.yAxisMeshTypeBuffer.getMappedRange()).set([1]);
    this.yAxisMeshTypeBuffer.unmap();
    this.zAxisMeshTypeBuffer = createMeshTypeUniformBuffer(device);
    new Uint32Array(this.zAxisMeshTypeBuffer.getMappedRange()).set([2]);
    this.zAxisMeshTypeBuffer.unmap();
    this.triangleMeshTypeBuffer = createMeshTypeUniformBuffer(device);
    new Uint32Array(this.triangleMeshTypeBuffer.getMappedRange()).set([3]);
    this.triangleMeshTypeBuffer.unmap();

    const xAxesInstancesBufferSize =
      this.xAxesNumInstances * this.xAxesMatrixSize;
    this.xAxesInstancesBuffer = device.createBuffer({
      label: "x axes instances buffer",
      size: xAxesInstancesBufferSize,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
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

    this.triangleMesh = new TriangleMesh(this.device);
    this.xAxisMesh = new Mesh("x axis mesh", this.device, xAxisVertices());
    this.yAxisMesh = new Mesh("y axis mesh", this.device, yAxisVertices());
    this.zAxisMesh = new Mesh("z axis mesh", this.device, zAxisVertices());

    const bindGroupLayout = createBindGroupLayout(this.device);

    this.triangleBindGroup = createBindGroup(
      "triangle bind group",
      this.device,
      bindGroupLayout,
      this.rotBuffer,
      this.projectionBuffer,
      this.cameraBuffer,
      this.triangleMeshTypeBuffer,
      this.xAxesInstancesBuffer,
      this.zAxesInstancesBuffer,
      this.identityBuffer
    );

    this.xAxisBindGroup = createBindGroup(
      "x axis bind group",
      this.device,
      bindGroupLayout,
      this.rotBuffer,
      this.projectionBuffer,
      this.cameraBuffer,
      this.xAxisMeshTypeBuffer,
      this.xAxesInstancesBuffer,
      this.zAxesInstancesBuffer,
      this.identityBuffer
    );

    this.yAxisBindGroup = createBindGroup(
      "y axis bind group",
      this.device,
      bindGroupLayout,
      this.rotBuffer,
      this.projectionBuffer,
      this.cameraBuffer,
      this.yAxisMeshTypeBuffer,
      this.xAxesInstancesBuffer,
      this.zAxesInstancesBuffer,
      this.identityBuffer
    );

    this.zAxisBindGroup = createBindGroup(
      "z axis bind group",
      this.device,
      bindGroupLayout,
      this.rotBuffer,
      this.projectionBuffer,
      this.cameraBuffer,
      this.zAxisMeshTypeBuffer,
      this.xAxesInstancesBuffer,
      this.zAxesInstancesBuffer,
      this.identityBuffer
    );

    this.pipeline = createPipeline(
      my_shader,
      device,
      this.presentationFormat,
      this.triangleMesh,
      bindGroupLayout
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
        this.xAxisMesh &&
        this.yAxisMesh &&
        this.zAxisMesh &&
        this.triangleMesh &&
        this.triangleBindGroup &&
        this.xAxisBindGroup &&
        this.yAxisBindGroup &&
        this.zAxisBindGroup &&
        this.rotBuffer &&
        this.eulersMatrix &&
        this.projectionBuffer &&
        this.cameraBuffer &&
        this.xAxesInstancesBuffer &&
        this.zAxesInstancesBuffer &&
        this.identityBuffer
      )
    ) {
      return;
    }

    render(
      this.device,
      this.renderPassDescriptor,
      this.pipeline,
      this.xAxisMesh,
      this.yAxisMesh,
      this.zAxisMesh,
      this.triangleMesh,
      this.triangleBindGroup,
      this.xAxisBindGroup,
      this.yAxisBindGroup,
      this.zAxisBindGroup,
      this.rotBuffer,
      this.eulersMatrix,
      this.projectionBuffer,
      this.projection,
      this.cameraBuffer,
      this.camera,
      this.xAxesInstancesBuffer,
      this.xAxesInstancesMatrices,
      this.zAxesInstancesBuffer,
      this.zAxesInstancesMatrices,
      this.xAxesNumInstances,
      this.zAxesNumInstances,
      this.identityBuffer,
      this.identity
    );
  };

  setObjEulers = (pitch: number, yaw: number, roll: number) => {
    if (!this.triangleMesh) return;

    // translate to origin
    const transVec = this.triangleMesh.translationToOrigin();
    const transMatrix = trans(transVec);

    // rotate
    const pitchMatrix = setObjPitch(pitch);
    const yawMatrix = setObjYaw(yaw);
    const rollMatrix = setObjRoll(roll);

    // translate back to original position
    const negatedTransVec = vec3.create();
    vec3.negate(negatedTransVec, transVec);
    const transBackMatrix = trans(negatedTransVec);

    const rotations = mat4.create();

    // note inverse order
    mat4.multiply(rotations, yawMatrix, transBackMatrix);
    mat4.multiply(rotations, pitchMatrix, rotations);
    mat4.multiply(rotations, rollMatrix, rotations);
    mat4.multiply(rotations, transMatrix, rotations);

    // // debug - apply the transform to some point (and compare with manual calculation)
    // const testPoint = vec4.fromValues(0, 0, -2, 1);
    // const transformed = vec4.create();
    // vec4.transformMat4(transformed, testPoint, rotations);

    const transposed = mat4.create();
    mat4.transpose(transposed, rotations);

    // not sure why it's needed to transpose,
    // gl-matrix and webgpu are both supposed to use column-major?
    // added it because noticed transposing fixes rotation (not rotating around center)
    // this.rotMatrix = rotations;
    this.eulersMatrix = transposed;
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
  // it should be possible to make this more generic, for now like this
  xAxisMesh: Mesh,
  yAxisMesh: Mesh,
  zAxisMesh: Mesh,
  triangleMesh: TriangleMesh,

  triangleBindGroup: GPUBindGroup,
  xAxisbindGroup: GPUBindGroup,
  yAxisbindGroup: GPUBindGroup,
  zAxisbindGroup: GPUBindGroup,

  rotBuffer: GPUBuffer,
  rotMatrix: mat4,

  projectionBuffer: GPUBuffer,
  projection: mat4,
  cameraBuffer: GPUBuffer,
  camera: Camera,

  xAxesInstancesBuffer: GPUBuffer,
  xAxesInstancesMatrices: Float32Array,
  zAxesInstancesBuffer: GPUBuffer,
  zAxesInstancesMatrices: Float32Array,
  xAxisNumInstances: number,
  zAxisNumInstances: number,
  identityBuffer: GPUBuffer,
  identityMatrix: mat4
) => {
  camera.update();

  const encoder = device.createCommandEncoder({ label: "our encoder" });

  const pass = encoder.beginRenderPass(renderPassDescriptor);
  pass.setPipeline(pipeline);

  // triangle
  pass.setBindGroup(0, triangleBindGroup);
  pass.setVertexBuffer(0, triangleMesh.buffer);
  pass.draw(3, 1);

  // axes
  pass.setBindGroup(0, xAxisbindGroup);
  pass.setVertexBuffer(0, xAxisMesh.buffer);
  pass.draw(6, xAxisNumInstances);
  pass.setBindGroup(0, yAxisbindGroup);
  pass.setVertexBuffer(0, yAxisMesh.buffer);
  pass.draw(6, 1);
  pass.setBindGroup(0, zAxisbindGroup);
  pass.setVertexBuffer(0, zAxisMesh.buffer);
  pass.draw(6, zAxisNumInstances);

  pass.end();

  const commandBuffer = encoder.finish();
  device.queue.submit([commandBuffer]);

  device.queue.writeBuffer(rotBuffer, 0, <ArrayBuffer>rotMatrix);
  device.queue.writeBuffer(projectionBuffer, 0, <ArrayBuffer>projection);
  device.queue.writeBuffer(cameraBuffer, 0, <ArrayBuffer>camera.matrix());
  device.queue.writeBuffer(identityBuffer, 0, <ArrayBuffer>identityMatrix);
  device.queue.writeBuffer(
    xAxesInstancesBuffer,
    0,
    xAxesInstancesMatrices.buffer,
    xAxesInstancesMatrices.byteOffset,
    xAxesInstancesMatrices.byteLength
  );
  device.queue.writeBuffer(
    zAxesInstancesBuffer,
    0,
    zAxesInstancesMatrices.buffer,
    zAxesInstancesMatrices.byteOffset,
    zAxesInstancesMatrices.byteLength
  );
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
    ],
  });
};

const createBindGroup = (
  label: string,
  device: GPUDevice,
  bindGroupLayout: GPUBindGroupLayout,
  rotBuffer: GPUBuffer,
  projectionBuffer: GPUBuffer,
  cameraBuffer: GPUBuffer,
  meshTypeBuffer: GPUBuffer,
  xAxisInstancesBuffer: GPUBuffer,
  zAxisInstancesBuffer: GPUBuffer,
  identityBuffer: GPUBuffer
): GPUBindGroup => {
  return device.createBindGroup({
    label: label,
    layout: bindGroupLayout,
    entries: [
      { binding: 0, resource: { buffer: projectionBuffer } },
      { binding: 1, resource: { buffer: cameraBuffer } },
      { binding: 2, resource: { buffer: rotBuffer } },
      { binding: 3, resource: { buffer: meshTypeBuffer } },
      { binding: 4, resource: { buffer: xAxisInstancesBuffer } },
      { binding: 5, resource: { buffer: zAxisInstancesBuffer } },
      { binding: 6, resource: { buffer: identityBuffer } },
    ],
  });
};

const createPipeline = (
  shader: string,
  device: GPUDevice,
  presentationFormat: GPUTextureFormat,
  mesh: TriangleMesh,
  bindGroupLayout: GPUBindGroupLayout
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
      buffers: [mesh.bufferLayout],
    },
    fragment: {
      module: device.createShaderModule({ code: shader }),
      entryPoint: "fs_main",
      targets: [{ format: presentationFormat }],
    },
    primitive: {
      topology: "triangle-list",
    },
  });
};

const createProjectionMatrix = () => {
  const m = mat4.create();
  mat4.perspective(m, Math.PI / 4, 800 / 600, 0.1, 10);
  return m;
};

const createIdentityMatrix = () => {
  const m = mat4.create();
  mat4.identity(m);
  return m;
};

export const origin = () => {
  const m = vec3.create();
  vec3.zero(m);
  return m;
};

const createMatrixUniformBuffer = (device: GPUDevice): GPUBuffer => {
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

const createZ0PlaneHorizontalLinesTranslationMatrix = (y: number): mat4 => {
  const m = mat4.create();
  mat4.fromTranslation(m, vec3.fromValues(0, y, 0));
  return m;
};

const createY0PlaneHorizontalLinesTranslationMatrix = (z: number): mat4 => {
  const m = mat4.create();
  mat4.fromTranslation(m, vec3.fromValues(0, 0, z));
  return m;
};

const createY0PlaneVerticalLinesTranslationMatrix = (x: number): mat4 => {
  const m = mat4.create();
  mat4.fromTranslation(m, vec3.fromValues(x, 0, 0));
  return m;
};
