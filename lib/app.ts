import { WebGpu } from "./web_gpu";

export class App {
  renderer: WebGpu;

  objPitch: number = 0;
  objYaw: number = 0;
  objRoll: number = 0;

  cameraPitch: number = 0;
  cameraYaw: number = 0;
  cameraRoll: number = 0;

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
    const deltaCamera = 1;
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
      this.cameraPitch += deltaCamera;
    }
    if (event.code == "KeyO") {
      this.cameraYaw += deltaCamera;
    }
    if (event.code == "KeyP") {
      this.cameraRoll += deltaCamera;
    }

    this.renderer.setObjEulers(this.objPitch, this.objYaw, this.objRoll);
    this.renderer.setCameraEulers(
      this.cameraPitch,
      this.cameraYaw,
      this.cameraRoll
    );
  }

  run = () => {
    this.renderer.render();

    requestAnimationFrame(this.run);
  };
}
