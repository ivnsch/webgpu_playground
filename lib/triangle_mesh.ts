import { vec3 } from "gl-matrix";

export class TriangleMesh {
  buffer: GPUBuffer;
  bufferLayout: GPUVertexBufferLayout;

  private static z = -2;
  private vertices: Float32Array = TriangleMesh.initVertices();

  constructor(device: GPUDevice) {
    this.buffer = createBuffer(device, this.vertices);
    setVerticesInBuffer(this.buffer, this.vertices);

    this.bufferLayout = createBufferLayout();
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

const createBuffer = (device: GPUDevice, vertices: Float32Array): GPUBuffer => {
  return device.createBuffer({
    label: "my mesh buffer",
    size: vertices.byteLength,
    usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    mappedAtCreation: true,
  });
};

const setVerticesInBuffer = (buffer: GPUBuffer, vertices: Float32Array) => {
  new Float32Array(buffer.getMappedRange()).set(vertices);
  buffer.unmap();
};

const createBufferLayout = (): GPUVertexBufferLayout => {
  return {
    arrayStride: 12, // 3 floats per vertex * 4 bytes per float
    attributes: [
      {
        // 3 floats, with 0 offset
        shaderLocation: 0,
        format: "float32x3",
        offset: 0,
      },
    ],
  };
};
