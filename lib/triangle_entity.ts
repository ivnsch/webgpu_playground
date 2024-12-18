import { mat4, vec3 } from "gl-matrix";
import { setObjPitch, setObjRoll, setObjYaw, trans } from "./matrix_3x3";
import { Entity } from "./entity";

// for now inheritance, may change
// these functions should be generic for all drawables anyway
export class TriangleEntity extends Entity {
  private static z = -2;

  constructor(device: GPUDevice) {
    // x y z
    // prettier-ignore
    super(device, [
          0.0, 0.5, TriangleEntity.z, 
          -0.5, -0.5, TriangleEntity.z, 
          0.5, -0.5, TriangleEntity.z,
      ])
  }

  center = (): vec3 => {
    return vec3.fromValues(
      (this.vertices[0] + this.vertices[3] + this.vertices[6]) / 3,
      (this.vertices[1] + this.vertices[4] + this.vertices[7]) / 3,
      TriangleEntity.z
    );
  };

  translationToOrigin = (): vec3 => {
    const c = this.center();
    const v = vec3.create();
    vec3.scale(v, c, -1);
    return v;
  };

  setEulers = (pitch: number, yaw: number, roll: number) => {
    // translate to origin
    const transVec = this.translationToOrigin();
    // const transVec = this.cubeMesh.translationToOrigin();
    const transMatrix = trans(transVec);

    // rotate
    const pitchMatrix = setObjPitch(pitch);
    const yawMatrix = setObjYaw(yaw);
    const rollMatrix = setObjRoll(roll);

    // translate back to original position
    const negatedTransVec = vec3.create();
    vec3.negate(negatedTransVec, transVec);
    const transBackMatrix = trans(negatedTransVec);

    const rotations = mat4.create();

    // note inverse order
    mat4.multiply(rotations, yawMatrix, transBackMatrix);
    mat4.multiply(rotations, pitchMatrix, rotations);
    mat4.multiply(rotations, rollMatrix, rotations);
    mat4.multiply(rotations, transMatrix, rotations);

    // // debug - apply the transform to some point (and compare with manual calculation)
    // const testPoint = vec4.fromValues(0, 0, -2, 1);
    // const transformed = vec4.create();
    // vec4.transformMat4(transformed, testPoint, rotations);

    const transposed = mat4.create();
    mat4.transpose(transposed, rotations);

    // not sure why it's needed to transpose,
    // gl-matrix and webgpu are both supposed to use column-major?
    // added it because noticed transposing fixes rotation (not rotating around center)
    // this.rotMatrix = rotations;
    this.eulersMatrix = transposed;
    // this.cubeEulersMatrix = transposed;
  };
}
