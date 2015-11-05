'use strict';
export function $first(el, selector) {
  return el.querySelector(selector);
}

export function $find(el, selector) {
  return Array.from(el.querySelectorAll(selector));
}

export function $addClass(el, cl, add) {
  if (!el || add === false) { return; }

  el.classList.add(cl);
}

export function $rmvClass(el, cl, rem) {
  if (!el || rem === false) { return; }

  el.classList.remove(cl);
}
