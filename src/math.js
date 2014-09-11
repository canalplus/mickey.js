function nil() {
  return { x: 0, y: 0 };
}

function vec(a, b) {
  return { x: b.x - a.x, y: b.y - a.y };
}

function dist1(a, b) {
  return norm1(vec(a, b));
}

function distp(a, b, dir) {
  return norm1(proj(vec(a, b), dir));
}

function norm1(a) {
  return Math.abs(a.x) + Math.abs(a.y);
}

function opp(a) {
  return { x: -a.x, y: -a.y };
}

function dot(a, b) {
  return a.x * b.x + a.y * b.y;
}

function pointReflect(a, c) {
  return { x: 2 * c.x - a.x, y: 2 * c.y - a.y };
}

function axisReflect(a, c, dir) {
  return { x: a.x + 2 * (c.x - a.x) * Math.abs(dir.x), y: a.y + 2 * (c.y - a.y) * Math.abs(dir.y) };
}

// project a over b where b has norm 1
function proj(a, b) {
  var d = dot(a, b);
  return { x: d * b.x, y: d * b.y };
}

module.exports = {
  nil,
  vec,
  dist1,
  distp,
  norm1,
  opp,
  dot,
  pointReflect,
  axisReflect,
};
