export class Mesh {
  buffer: GPUBuffer;
  bufferLayout: GPUVertexBufferLayout;

  constructor(device: GPUDevice) {
    // x y z
    // prettier-ignore
    const vertices: Float32Array = new Float32Array([
      0.0, 0.5, 0.0, 
      -0.5, -0.5, 0.0, 
      0.5, -0.5, 0.0,
    ]);

    this.buffer = createBuffer(device, vertices);
    setVerticesInBuffer(this.buffer, vertices);

    this.bufferLayout = createBufferLayout();
  }
}

const createBuffer = (device: GPUDevice, vertices: Float32Array): GPUBuffer => {
  const usage: GPUBufferUsageFlags =
    GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST;

  const descriptor: GPUBufferDescriptor = {
    size: vertices.byteLength,
    usage: usage,
    mappedAtCreation: true,
  };

  return device.createBuffer(descriptor);
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
