'use strict';
import { vec, dot } from './math.js';

export function createBox(el, overlap) {
  if (!el || !el.getBoundingClientRect) return;
  var BoundingRect = el.getBoundingClientRect(),
      r = {
        top: BoundingRect.top,
        bottom: BoundingRect.bottom,
        height: BoundingRect.height,
        width: BoundingRect.width,
        left: BoundingRect.left,
        right: BoundingRect.right,
      };
  if (r.height > 0 || r.width > 0) {
    if (overlap) {
      r.height = r.height - 2 * overlap;
      r.width = r.width - 2 * overlap;
      r.top = r.top + overlap;
      r.left = r.left + overlap;
      r.right = r.right - overlap;
      r.bottom = r.bottom - overlap;
    }

    return new Box(el, r);
  }
}

export class Box {
  constructor(el, r) {
    this.el = el;
    this._r = r;
  }

  contains(pos, base) {
    var c = this.center();
    var v = vec(c, this.bound(base.down));
    var h = vec(c, this.bound(base.right));
    var x = vec(c, pos);
    return (
      2 * Math.abs(dot(v, x)) <= this._r.height &&
      2 * Math.abs(dot(h, x)) <= this._r.width
    );
  }

  center() {
    return {
      x: this._r.left + this._r.width  / 2,
      y: this._r.top  + this._r.height / 2,
    };
  }

  bound(d) {
    return {
      x: this._r.left + this._r.width  * (1 + d.x) / 2,
      y: this._r.top  + this._r.height * (1 + d.y) / 2,
    };
  }
}
