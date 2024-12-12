struct OurVertexShaderOutput {
    @builtin(position) position: vec4f,
    @location(0) color: vec3<f32>
};

@binding(0) @group(0) var<uniform> rotationY: mat4x4<f32>;
@binding(1) @group(0) var<uniform> projection: mat4x4<f32>;

@vertex
fn vs_main(@builtin(vertex_index) vertexIndex: u32, @location(0) vertex: vec3<f32>) -> OurVertexShaderOutput {
    let vertex_4 = vec4<f32>(vertex, 1.0);

    let transformed = projection * rotationY * vertex_4;

    var output: OurVertexShaderOutput;
    output.position = transformed;
    output.color = vec3<f32>(1.0, 0.0, 0.0);
    return output;
}

@fragment
fn fs_main(@location(0) color: vec3<f32>) -> @location(0) vec4<f32> {
    return vec4<f32>(1.0, 0.0, 0.0, 1.0);
}
