import { Renderer } from "./renderer";

export class App {
  canvas: HTMLCanvasElement;
  renderer: Renderer;

  keyLabel: HTMLElement;
  mouseXLabel: HTMLElement;
  mouseYLabel: HTMLElement;
  setKeyText: (value: string) => void;
  setMouseXLabel: (value: string) => void;
  setMouseYLabel: (value: string) => void;

  constructor(canvas: HTMLCanvasElement, document: Document) {
    this.canvas = canvas;

    this.renderer = new Renderer(canvas);
  }

  async Initialize() {
    await this.renderer.Initialize();
  }

  run = () => {
    var running: boolean = true;

    this.renderer.render();

    if (running) {
      requestAnimationFrame(this.run);
    }
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
