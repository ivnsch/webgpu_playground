export class Mesh {
  buffer: GPUBuffer;
  bufferLayout: GPUVertexBufferLayout;

  private vertices: Float32Array;

  constructor(device: GPUDevice, vertices: Float32Array) {
    this.vertices = vertices;

    this.buffer = createBuffer(device, this.vertices);
    setVerticesInBuffer(this.buffer, this.vertices);

    this.bufferLayout = createBufferLayout();
  }
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
