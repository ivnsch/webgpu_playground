import { vec3 } from "gl-matrix";
import { WebGpu } from "./web_gpu";

export class App {
  renderer: WebGpu;

  objPitch: number = 0;
  objYaw: number = 0;
  objRoll: number = 0;

  cameraPitch: number = 0;
  cameraYaw: number = 0;
  cameraRoll: number = 0;
  cameraTranslation: vec3 = vec3.create();

  constructor(document: Document, canvas: HTMLCanvasElement) {
    this.renderer = new WebGpu(canvas);

    document.addEventListener("keydown", (e) => {
      this.handleKeypress(e);
    });
  }

  async init(navigator: Navigator) {
    await this.renderer.init(navigator);
  }

  handleKeypress(event: any) {
    const deltaObj = 0.05;
    const deltaCameraRot = 1;
    const deltaCameraTrans = 0.1;
    if (event.code == "KeyX") {
      this.objPitch += deltaObj;
    }
    if (event.code == "KeyY") {
      this.objYaw += deltaObj;
    }
    if (event.code == "KeyZ") {
      this.objRoll += deltaObj;
    }
    if (event.code == "KeyI") {
      this.cameraPitch += deltaCameraRot;
    }
    if (event.code == "KeyO") {
      this.cameraYaw += deltaCameraRot;
    }
    if (event.code == "KeyP") {
      this.cameraRoll += deltaCameraRot;
    }
    if (event.code == "KeyQ") {
      this.cameraTranslation[1] -= deltaCameraTrans;
    }
    if (event.code == "KeyE") {
      this.cameraTranslation[1] += deltaCameraTrans;
    }
    if (event.code == "KeyA") {
      this.cameraTranslation[0] -= deltaCameraTrans;
    }
    if (event.code == "KeyD") {
      this.cameraTranslation[0] += deltaCameraTrans;
    }
    if (event.code == "KeyW") {
      this.cameraTranslation[2] -= deltaCameraTrans;
    }
    if (event.code == "KeyS") {
      this.cameraTranslation[2] += deltaCameraTrans;
    }

    this.renderer.setObjEulers(this.objPitch, this.objYaw, this.objRoll);
    this.renderer.setCameraEulers(
      this.cameraPitch,
      this.cameraYaw,
      this.cameraRoll
    );
    this.renderer.setCameraTranslation(this.cameraTranslation);
  }

  run = () => {
    this.renderer.render();

    requestAnimationFrame(this.run);
  };
}
