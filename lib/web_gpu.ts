import { mat4, vec3 } from "gl-matrix";
import { setObjPitch, setObjYaw, setObjRoll, trans } from "./matrix_3x3";
import { TriangleMesh } from "./triangle_mesh";
import my_shader from "./shaders/screen_shader.wgsl";
import { Camera } from "./camera";
import { Mesh } from "./mesh";
import { xAxisVertices, yAxisVertices } from "./axis_mesh";

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

  triangleBindGroup: GPUBindGroup | null = null;
  xAxisBindGroup: GPUBindGroup | null = null;

  rotBuffer: GPUBuffer | null = null;
  eulersMatrix: mat4 | null = createIdentityMatrix();

  projectionBuffer: GPUBuffer | null = null;
  projection: mat4;

  cameraBuffer: GPUBuffer | null = null;
  camera: Camera;

  axisMeshTypeBuffer: GPUBuffer | null = null;
  triangleMeshTypeBuffer: GPUBuffer | null = null;

  constructor(canvas: HTMLCanvasElement, cameraPos: vec3) {
    console.log(this.eulersMatrix);

    this.presentationFormat = "bgra8unorm";
    this.context = <GPUCanvasContext>canvas.getContext("webgpu");

    this.projection = createProjectionMatrix();
    this.camera = new Camera(cameraPos);
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

    this.rotBuffer = this.device.createBuffer({
      size: 64,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    this.projectionBuffer = this.device.createBuffer({
      size: 64,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    this.cameraBuffer = this.device.createBuffer({
      size: 64,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    this.axisMeshTypeBuffer = this.device.createBuffer({
      size: 16,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
      mappedAtCreation: true,
    });
    new Uint32Array(this.axisMeshTypeBuffer.getMappedRange()).set([0]);
    this.axisMeshTypeBuffer.unmap();
    this.triangleMeshTypeBuffer = this.device.createBuffer({
      size: 16,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
      mappedAtCreation: true,
    });
    new Uint32Array(this.triangleMeshTypeBuffer.getMappedRange()).set([1]);
    this.triangleMeshTypeBuffer.unmap();

    this.triangleMesh = new TriangleMesh(this.device);
    this.xAxisMesh = new Mesh("x axis mesh", this.device, xAxisVertices());
    this.yAxisMesh = new Mesh("y axis mesh", this.device, yAxisVertices());

    const bindGroupLayout = createBindGroupLayout(this.device);

    this.triangleBindGroup = createBindGroup(
      "triangle bind group",
      this.device,
      bindGroupLayout,
      this.rotBuffer,
      this.projectionBuffer,
      this.cameraBuffer,
      this.triangleMeshTypeBuffer
    );

    this.xAxisBindGroup = createBindGroup(
      "x axis bind group",
      this.device,
      bindGroupLayout,
      this.rotBuffer,
      this.projectionBuffer,
      this.cameraBuffer,
      this.axisMeshTypeBuffer
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
        this.triangleMesh &&
        this.triangleBindGroup &&
        this.xAxisBindGroup &&
        this.rotBuffer &&
        this.eulersMatrix &&
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
      this.xAxisMesh,
      this.yAxisMesh,
      this.triangleMesh,
      this.triangleBindGroup,
      this.xAxisBindGroup,
      this.rotBuffer,
      this.eulersMatrix,
      this.projectionBuffer,
      this.projection,
      this.cameraBuffer,
      this.camera
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
  triangleMesh: TriangleMesh,

  triangleBindGroup: GPUBindGroup,
  axesbindGroup: GPUBindGroup,

  rotBuffer: GPUBuffer,
  rotMatrix: mat4,

  projectionBuffer: GPUBuffer,
  projection: mat4,
  cameraBuffer: GPUBuffer,
  camera: Camera
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
  pass.setBindGroup(0, axesbindGroup);
  pass.setVertexBuffer(0, xAxisMesh.buffer);
  pass.draw(6, 1);
  pass.setVertexBuffer(0, yAxisMesh.buffer);
  pass.draw(6, 1);

  pass.end();

  const commandBuffer = encoder.finish();
  device.queue.submit([commandBuffer]);

  device.queue.writeBuffer(rotBuffer, 0, <ArrayBuffer>rotMatrix);
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

const createBindGroupLayout = (device: GPUDevice): GPUBindGroupLayout => {
  return device.createBindGroupLayout({
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
  meshTypeBuffer: GPUBuffer
): GPUBindGroup => {
  return device.createBindGroup({
    label: label,
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
          buffer: rotBuffer,
        },
      },
      {
        binding: 3,
        resource: {
          buffer: meshTypeBuffer,
        },
      },
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
