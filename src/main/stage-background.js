export class StageBackground {
  constructor(element, { urlApi = globalThis.URL } = {}) {
    if (!element?.style) throw new TypeError("stage element is required");
    if (typeof urlApi?.createObjectURL !== "function" || typeof urlApi?.revokeObjectURL !== "function")
      throw new TypeError("object URL API is required");
    this.element = element;
    this.urlApi = urlApi;
    this.imageUrl = null;
  }

  setColor(color) {
    if (typeof color !== "string" || !/^#[0-9a-f]{6}$/i.test(color))
      throw new Error("background color must be #RRGGBB");
    this.#releaseImage();
    this.element.style.backgroundColor = color;
    this.element.style.backgroundImage = "none";
  }

  setImage(file) {
    if (!(file instanceof Blob) || !file.type.startsWith("image/") || file.size === 0)
      throw new Error("a non-empty local image is required");
    this.#releaseImage();
    this.imageUrl = this.urlApi.createObjectURL(file);
    this.element.style.backgroundImage = `url("${this.imageUrl}")`;
    return this.imageUrl;
  }

  dispose() {
    this.#releaseImage();
  }

  #releaseImage() {
    if (this.imageUrl) this.urlApi.revokeObjectURL(this.imageUrl);
    this.imageUrl = null;
  }
}
