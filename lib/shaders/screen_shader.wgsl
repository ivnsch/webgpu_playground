struct OurVertexShaderOutput {
    @builtin(position) position: vec4f,
    @location(0) color: vec3<f32>
};

@binding(0) @group(0) var<uniform> projection: mat4x4<f32>;
@binding(1) @group(0) var<uniform> camera: mat4x4<f32>;
@binding(2) @group(0) var<uniform> rotation: mat4x4<f32>;
@binding(3) @group(0) var<uniform> meshType: u32;


@vertex
fn vs_main(
    @builtin(vertex_index) vertexIndex: u32,     
    @location(0) vertex: vec3<f32>
) -> OurVertexShaderOutput {
    let vertex_4 = vec4<f32>(vertex, 1.0);

    var transformed = vertex_4;

    var output: OurVertexShaderOutput;

    if (meshType == 0) { // axis
        output.color = vec3<f32>(0.0, 0.0, 0.0); // black
        // don't transform axis
    } else if (meshType == 1) { // triangle
        output.color = vec3<f32>(1.0, 0.0, 0.0); // red
        transformed = rotation * vertex_4;
    } else { // unexpected
        output.color = vec3<f32>(1.0, 1.0, 0.0); // yellow
    }

    transformed = projection * camera * transformed;

    output.position = transformed;
    return output;
}

@fragment
fn fs_main(@location(0) color: vec3<f32>) -> @location(0) vec4<f32> {
    return vec4<f32>(color, 1.0);
}
