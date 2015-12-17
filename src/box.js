function createBox(el) {
  if (!el)
    return;

  var r = el.getBoundingClientRect();
  var h = r.height;
  var w = r.width;
  if (h === 0 && w === 0)
    return;

  return new Box(el, {
    height: h,
    width:  w,

    top:    r.top,
    right:  r.right,
    bottom: r.bottom,
    left:   r.left,
  });
}

function Box(el, r) {
  this.el = el;
  this._r = r;
}

Box.prototype.contains = function(pos) {
  const { top, right, bottom, left } = this._r;
  return (
    pos.y >= top  && pos.y <= bottom &&
    pos.x >= left && pos.x <= right
  );
};

Box.prototype.center = function() {
  return {
    x: this._r.left + this._r.width  / 2,
    y: this._r.top  + this._r.height / 2,
  };
};

Box.prototype.bound = function(d) {
  return {
    x: this._r.left + this._r.width  * (1 + d.x) / 2,
    y: this._r.top  + this._r.height * (1 + d.y) / 2,
  };
};

module.exports = { Box, createBox };
