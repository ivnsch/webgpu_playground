import { WebGpu } from "./web_gpu";

export class App {
  canvas: HTMLCanvasElement;
  navigator: Navigator;

  renderer: WebGpu;

  keyLabel: HTMLElement;
  mouseXLabel: HTMLElement;
  mouseYLabel: HTMLElement;
  setKeyText: (value: string) => void;
  setMouseXLabel: (value: string) => void;
  setMouseYLabel: (value: string) => void;

  constructor(canvas: HTMLCanvasElement, navigator: Navigator) {
    this.canvas = canvas;
    this.navigator = navigator;

    this.renderer = new WebGpu();
  }

  async init() {
    await this.renderer.init(this.canvas, this.navigator);
  }

  run = () => {
    this.renderer.render();

    requestAnimationFrame(this.run);
  };

  handle_keypress(event: any) {
    this.setKeyText(event.code);
  }

  handle_keyrelease(event: any) {
    this.setKeyText(event.code);
  }

  handle_mouse_move(event: MouseEvent) {
    this.setMouseXLabel(event.clientX.toString());
    this.setMouseYLabel(event.clientY.toString());
  }
}
