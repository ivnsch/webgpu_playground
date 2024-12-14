import { WebGpu } from "./web_gpu";

export class App {
  renderer: WebGpu;

  rotX: number = 0;
  rotY: number = 0;
  rotZ: number = 0;

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
    console.log("handling key press: " + event);

    const delta = 0.05;
    if (event.code == "KeyX") {
      this.rotX += delta;
    }
    if (event.code == "KeyY") {
      this.rotY += delta;
    }
    if (event.code == "KeyZ") {
      this.rotZ += delta;
    }

    this.renderer.setRot(this.rotX, this.rotY, this.rotZ);
  }

  run = () => {
    this.renderer.render();

    requestAnimationFrame(this.run);
  };
}
