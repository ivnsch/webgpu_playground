import { WebGpu } from "./web_gpu";

export class App {
  renderer: WebGpu;

  rotX: number = 0;
  rotY: number = 0;
  rotZ: number = 0;

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
      this.rotX += deltaObj;
    }
    if (event.code == "KeyY") {
      this.rotY += deltaObj;
    }
    if (event.code == "KeyZ") {
      this.rotZ += deltaObj;
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

    this.renderer.setRot(this.rotX, this.rotY, this.rotZ);
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
