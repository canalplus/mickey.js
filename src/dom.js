function $first(el, selector) {
  return el.querySelector(selector);
}

function $find(el, selector) {
  var els = el.querySelectorAll(selector);
  var arr = [];
  for (var i = 0; i < els.length; i++) {
    arr.push(els[i]);
  }
  return arr;
}

function $addClass(el, cl, add) {
  if (!el || add === false) { return; }
  el.classList.add(cl);
}

function $rmvClass(el, cl, rem) {
  if (!el || rem === false) { return; }
  el.classList.remove(cl);
}

module.exports = {
  $first,
  $find,
  $addClass,
  $rmvClass,
};
