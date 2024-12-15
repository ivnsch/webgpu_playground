import { vec3 } from "gl-matrix";
import {
  createDefaultBuffer,
  createDefaultBufferLayout,
  setDefaultVerticesInBuffer,
} from "./mesh";

export class TriangleMesh {
  buffer: GPUBuffer;
  bufferLayout: GPUVertexBufferLayout;

  private static z = -2;
  private vertices: Float32Array = TriangleMesh.initVertices();

  constructor(device: GPUDevice) {
    this.buffer = createDefaultBuffer("triangle mesh", device, this.vertices);
    setDefaultVerticesInBuffer(this.buffer, this.vertices);

    this.bufferLayout = createDefaultBufferLayout();
  }

  center = (): vec3 => {
    return vec3.fromValues(
      (this.vertices[0] + this.vertices[3] + this.vertices[6]) / 3,
      (this.vertices[1] + this.vertices[4] + this.vertices[7]) / 3,
      TriangleMesh.z
    );
  };

  translationToOrigin = (): vec3 => {
    const c = this.center();
    const v = vec3.create();
    vec3.scale(v, c, -1);
    return v;
  };

  static initVertices = (): Float32Array => {
    // x y z
    // prettier-ignore
    return new Float32Array([
        0.0, 0.5, this.z, 
        -0.5, -0.5, this.z, 
        0.5, -0.5, this.z,
    ]);
  };
}
