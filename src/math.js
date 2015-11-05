'use strict';
export function nil() {
  return { x: 0, y: 0 };
}

export function vec(a, b) {
  return { x: b.x - a.x, y: b.y - a.y };
}

export function dist1(a, b) {
  return norm2(vec(a, b));
}

export function distp(a, b, dir) {
  return norm1(proj(vec(a, b), dir));
}

export function norm1(a) {
  return Math.sqrt(a.x * a.x + a.y * a.y);
}

export function norm2(a) {
  return Math.abs(a.x) + Math.abs(a.y);
}

export function opp(a) {
  return { x: -a.x, y: -a.y };
}

export function dot(a, b) {
  return a.x * b.x + a.y * b.y;
}

export function pointReflect(a, c) {
  return { x: 2 * c.x - a.x, y: 2 * c.y - a.y };
}

export function axisReflect(box, dir, center) {
  switch (dir) {
  case 'up':
    box._r.top = box._r.top + 2 * center.y;
    break;
  case 'down':
    box._r.top = box._r.top - 2 * center.y;
    break;
  case 'left':
    box._r.left = box._r.left + 2 * center.x;
    break;
  case 'right':
    box._r.left = box._r.left - 2 * center.x;
    break;
  default:
    break;
  }
  return box;
}

// project a over b where b has norm 1
export function proj(a, b) {
  var d = dot(a, b);
  return { x: d * b.x, y: d * b.y };
}
