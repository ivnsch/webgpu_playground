export class AxisMesh {
  buffer: GPUBuffer;
  bufferLayout: GPUVertexBufferLayout;

  private vertices: Float32Array = AxisMesh.initVertices();

  constructor(device: GPUDevice) {
    this.buffer = createBuffer(device, this.vertices);
    setVerticesInBuffer(this.buffer, this.vertices);

    this.bufferLayout = createBufferLayout();
  }

  static initVertices = (): Float32Array => {
    const len = 10;
    const width = 0.01;
    const hw = width / 2;
    // x y z
    // prettier-ignore
    return new Float32Array([
        -len, hw, 0, 
        len, hw, 0, 
        -len, -hw, 0, 

        -len, -hw, 0, 
        len, hw, 0, 
        len, -hw, 0, 
    ]);
  };
}

const createBuffer = (device: GPUDevice, vertices: Float32Array): GPUBuffer => {
  const usage: GPUBufferUsageFlags =
    GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST;

  const descriptor: GPUBufferDescriptor = {
    label: "my mesh buffer",
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
