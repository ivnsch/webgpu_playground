import { WebGpu } from "./web_gpu";

export class App {
  renderer: WebGpu;

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new WebGpu(canvas);
  }

  async init(navigator: Navigator) {
    await this.renderer.init(navigator);
  }

  run = () => {
    this.renderer.render();

    requestAnimationFrame(this.run);
  };
}
