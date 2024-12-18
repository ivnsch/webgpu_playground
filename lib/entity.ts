import { mat4 } from "gl-matrix";
import {
  createDefaultBuffer,
  createDefaultBufferLayout,
  setDefaultVerticesInBuffer,
} from "./mesh";
import {
  createIdentityMatrix,
  createMatrixUniformBuffer,
  createMeshTypeUniformBuffer,
} from "./web_gpu";

export class Entity {
  vertices: Float32Array;

  buffer: GPUBuffer;
  bufferLayout: GPUVertexBufferLayout;

  bindGroup: GPUBindGroup | null = null;

  eulersBuffer: GPUBuffer;
  eulersMatrix: mat4 | null = createIdentityMatrix();

  meshTypeBuffer: GPUBuffer | null = null;

  constructor(device: GPUDevice, vertices: number[]) {
    this.vertices = new Float32Array(vertices);

    this.buffer = createDefaultBuffer("triangle mesh", device, this.vertices);
    setDefaultVerticesInBuffer(this.buffer, this.vertices);
    this.bufferLayout = createDefaultBufferLayout();

    this.eulersBuffer = createMatrixUniformBuffer(device);
  }

  initialize = () => {};

  initMeshType = (device: GPUDevice, id: number) => {
    this.meshTypeBuffer = createMeshTypeUniformBuffer(device);
    new Uint32Array(this.meshTypeBuffer.getMappedRange()).set([id]);
    this.meshTypeBuffer.unmap();
  };

  render = (device: GPUDevice, pass: GPURenderPassEncoder) => {
    pass.setBindGroup(0, this.bindGroup);
    pass.setVertexBuffer(0, this.buffer);
    pass.draw(3, 1);

    device.queue.writeBuffer(
      this.eulersBuffer,
      0,
      <ArrayBuffer>this.eulersMatrix
    );
  };
}
