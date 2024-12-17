import { vec3 } from "gl-matrix";
import {
  createDefaultBuffer,
  createDefaultBufferLayout,
  setDefaultVerticesInBuffer,
} from "./mesh";

export class CubeMesh {
  buffer: GPUBuffer;
  bufferLayout: GPUVertexBufferLayout;

  private static z = -4;
  private vertices: Float32Array = CubeMesh.initVertices();

  constructor(device: GPUDevice) {
    this.buffer = createDefaultBuffer("cube mesh", device, this.vertices);
    setDefaultVerticesInBuffer(this.buffer, this.vertices);

    this.bufferLayout = createDefaultBufferLayout();
  }

  translationToOrigin = (): vec3 => {
    return vec3.fromValues(0, 0, -CubeMesh.z);
  };

  static initVertices = (): Float32Array => {
    const cubeSide = 2;
    // x y z
    // prettier-ignore
    return new Float32Array([
        // front
        -cubeSide / 2, -cubeSide / 2, this.z ,
        -cubeSide / 2, cubeSide / 2, this.z ,
        cubeSide / 2, -cubeSide / 2, this.z ,
        -cubeSide / 2, cubeSide / 2, this.z ,
        cubeSide / 2, cubeSide / 2, this.z ,
        cubeSide / 2, -cubeSide / 2, this.z ,
        // back
        -cubeSide / 2, -cubeSide / 2, -cubeSide + this.z ,
        -cubeSide / 2, cubeSide / 2, -cubeSide + this.z ,
        cubeSide / 2, -cubeSide / 2, -cubeSide + this.z ,
        -cubeSide / 2, cubeSide / 2, -cubeSide + this.z ,
        cubeSide / 2, cubeSide / 2, -cubeSide + this.z ,
        cubeSide / 2, -cubeSide / 2, -cubeSide + this.z ,
        // top
        -cubeSide / 2, cubeSide / 2, -cubeSide + this.z ,
        -cubeSide / 2, cubeSide / 2, this.z ,
        cubeSide / 2, cubeSide / 2, this.z ,
        -cubeSide / 2, cubeSide / 2, -cubeSide + this.z ,
        cubeSide / 2, cubeSide / 2, -cubeSide + this.z ,
        cubeSide / 2, cubeSide / 2, this.z ,
        // right
        cubeSide / 2, cubeSide / 2, this.z ,
        cubeSide / 2, cubeSide / 2, -cubeSide + this.z ,
        cubeSide / 2, -cubeSide / 2, this.z ,
        cubeSide / 2, -cubeSide / 2, -cubeSide + this.z ,
        cubeSide / 2, cubeSide / 2, -cubeSide + this.z ,
        cubeSide / 2, -cubeSide / 2, this.z ,
        // bottom
        -cubeSide / 2, -cubeSide / 2, -cubeSide + this.z ,
        -cubeSide / 2, -cubeSide / 2, this.z ,
        cubeSide / 2, -cubeSide / 2, this.z ,
        -cubeSide / 2, -cubeSide / 2, -cubeSide + this.z ,
        cubeSide / 2, -cubeSide / 2, -cubeSide + this.z ,
        cubeSide / 2, -cubeSide / 2, this.z ,
        // left
        -cubeSide / 2, cubeSide / 2, this.z ,
        -cubeSide / 2, cubeSide / 2, -cubeSide + this.z ,
        -cubeSide / 2, -cubeSide / 2, this.z ,
        -cubeSide / 2, -cubeSide / 2, -cubeSide + this.z ,
        -cubeSide / 2, cubeSide / 2, -cubeSide + this.z ,
        -cubeSide / 2, -cubeSide / 2, this.z ,
        // 0.0, 0.5, this.z, 
        // -0.5, -0.5, this.z, 
        // 0.5, -0.5, this.z,
    ]);
  };
}
