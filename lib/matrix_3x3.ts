import { mat4 } from "gl-matrix";

export class Matrix3x3 {
  private values: number[];

  constructor(values: number[]) {
    if (values.length !== 9) {
      throw new Error("Matrix must have 9 elements.");
    }
    this.values = values;
  }

  static rotY(angle: number): Matrix3x3 {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    return new Matrix3x3([cos, 0, sin, 0, 1, 0, -sin, 0, cos]);
  }

  toGlMatrix = (): mat4 => {
    let gl = mat4.create();
    gl[0] = this.values[0];
    gl[1] = this.values[1];
    gl[2] = this.values[2];
    gl[3] = 0;

    gl[4] = this.values[3];
    gl[5] = this.values[4];
    gl[6] = this.values[5];
    gl[7] = 0;

    gl[8] = this.values[6];
    gl[9] = this.values[7];
    gl[10] = this.values[8];
    gl[11] = 0;

    gl[12] = 0;
    gl[13] = 0;
    gl[14] = 0;
    gl[15] = 1;

    return gl;
  };
}
