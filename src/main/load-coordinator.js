export class LoadCoordinator {
  constructor() {
    this.generation = 0;
    this.controller = null;
  }

  begin() {
    this.controller?.abort();
    this.controller = new AbortController();
    return { generation: ++this.generation, signal: this.controller.signal };
  }

  isCurrent(generation) {
    return generation === this.generation;
  }

  cancel() {
    this.generation += 1;
    this.controller?.abort();
    this.controller = null;
  }
}
