struct OurVertexShaderOutput {
    @builtin(position) position: vec4f,
    @location(0) color: vec3<f32>
};

@binding(0) @group(0) var<uniform> projection: mat4x4<f32>;
@binding(1) @group(0) var<uniform> camera: mat4x4<f32>;
@binding(2) @group(0) var<uniform> rotation: mat4x4<f32>;
@binding(3) @group(0) var<uniform> meshType: u32;
@binding(4) @group(0) var<uniform> axes_transforms: array<mat4x4f, 2>;
@binding(5) @group(0) var<uniform> identity: mat4x4f;
@binding(6) @group(0) var<uniform> instance1Buffer: mat4x4f;

@vertex
fn vs_main(
    @builtin(vertex_index) vertexIndex: u32,     
    @location(0) vertex: vec3<f32>,
    @builtin(instance_index) instance_idx : u32,
) -> OurVertexShaderOutput {
    let vertex_4 = vec4<f32>(vertex, 1.0);

    var transformed = vertex_4;

    var output: OurVertexShaderOutput;

    if (meshType == 0) { // x axis
        // position instance
        // transformed = axes_transforms[instance_idx] * vertex_4;
        // transformed = identity * vertex_4;
        if instance_idx == 0 {
            transformed = instance1Buffer * vertex_4;
            output.color = vec3<f32>(1.0, 0.0, 1.0); // magenta
        } else {
            transformed = vertex_4;
            output.color = vec3<f32>(0.0, 0.0, 1.0); // blue
        }
        // don't transform axis
    } else if (meshType == 1) { // y axis
        transformed = vertex_4;
        output.color = vec3<f32>(0.0, 1.0, 0.0); // green
        // don't transform axis
    }  else if (meshType == 2) { // z axis
        transformed = vertex_4;
        output.color = vec3<f32>(0.0, 1.0, 1.0); // cyan
        // don't transform axis
    } else if (meshType == 3) { // triangle
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
