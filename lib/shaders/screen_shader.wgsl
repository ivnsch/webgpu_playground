struct OurVertexShaderOutput {
    @builtin(position) position: vec4f,
    @location(0) color: vec3<f32>
};

@vertex
fn vs_main(@builtin(vertex_index) vertexIndex: u32, @location(0) vertex: vec3<f32>) -> OurVertexShaderOutput {
    var output: OurVertexShaderOutput;
    output.position = vec4<f32>(vertex, 1.0);
    output.color = vec3<f32>(1.0, 0.0, 0.0);
    return output;
}

@fragment
fn fs_main(@location(0) color: vec3<f32>) -> @location(0) vec4<f32> {
    return vec4<f32>(1.0, 0.0, 0.0, 1.0);
}
