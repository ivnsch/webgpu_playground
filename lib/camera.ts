import { vec3, mat4 } from "gl-matrix";

export class Camera {
  position: vec3;

  forwards: vec3;
  right: vec3;
  up: vec3;

  view: mat4 | null;

  rotX: number;
  rotY: number;
  rotZ: number;

  constructor(position: vec3) {
    this.position = position;
    this.forwards = vec3.create();
    this.right = vec3.create();
    this.up = vec3.create();

    this.view = null;

    this.rotX = 0;
    this.rotY = 0;
    this.rotZ = 0;
  }

  update = () => {
    this.forwards = [0, 0, -1];
    this.right = [1, 0, 0];
    this.up = [0, 1, 0];

    this.view = mat4.create();
    mat4.lookAt(this.view, this.position, this.forwards, this.up);
  };

  matrix = (): mat4 => {
    return createMatrix(this.position, this.forwards, this.up);
  };
}

const createMatrix = (position: vec3, target: vec3, up: vec3) => {
  const m = mat4.create();
  mat4.lookAt(m, position, target, up);
  return m;
};
