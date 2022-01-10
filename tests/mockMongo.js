class Cursor {
  fetch() {
    return [];
  }
  observe(callbacks) {
    if (this.callbacks != null) {
      throw new Error("simultaneous observe calls");
    }
    this.callbacks = callbacks;

    let cursor = this;
    return {
      stop() {
        cursor.callbacks = null;
        cursor = null;
      }
    }
  }
}

export const Mongo = {
  Cursor
};
