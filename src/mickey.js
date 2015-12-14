const { Box, createBox } = require("./box");
const { $first, $find, $rmvClass, $addClass } = require("./dom");
const {
  dot,
  vec,
  opp,
  nil,
  dist1,
  distp,
  axisReflect,
  pointReflect,
} = require("./math");

const find = require("lodash/collection/find");
const defaults = require("lodash/object/defaults");
const sortByAll = require("lodash/collection/sortByAll");
const sortBy = require("lodash/collection/sortBy");
const without = require("lodash/array/without");
const flatten = require("lodash/array/flatten");

function noop() {}

function logWarn() {
  if (__DEV__) {
    console.warn.apply(console, arguments);
  }
}

const BASE = {
  left:  { x: -1, y: 0 },
  up:    { x: 0,  y: -1 },
  right: { x: 1,  y: 0 },
  down:  { x: 0,  y: 1 },
};

const LIMITS = {
  left:  "left",
  up:    "top",
  right: "right",
  down:  "bottom",
};

const DIRS = {
  left:  "horizontal",
  right: "horizontal",
  up:    "vertical",
  down:  "vertical"
};

function dataSorter(name, ord, prefix) {
  return (el) => el.hasAttribute(prefix + name) ? ord : 0;
}

function Mickey(parent, options) {
  if (!parent) {
    throw new Error("mickey: should pass a parent DOM element");
  }

  let locked = false;

  options = defaults(options || {}, {
    changeClass: true,
    hoverClass: "hover",
    areaClass:  "hover",
    trackClass: "tracked",
    onChangeArea: noop,
    onChangeSelected: noop,
    overlap: 0,
    position: null,
    priority: "left,top",
    prefix: "data-nav-",
    $area: "[data-nav-area]",
    $href: null
  });

  const priority = options.priority;
  const __PREFIX__ = options.prefix;
  const __X_PRIORITY__ = priority.indexOf("left") >= 0
    ? 1
    : priority.indexOf("right") >= 0
      ? -1
      : 0;

  const __Y_PRIORITY__ = priority.indexOf("top") >= 0
    ? 1
    : priority.indexOf("bottom") >= 0
      ? -1
      : 0;

  const limitLastSorter = dataSorter("limit", 1, __PREFIX__);
  const selectedFirst = dataSorter("selected", -1, __PREFIX__);

  const mouse = {
    version: "1.0.5",
    pos: options.position || nil(),
    el: null,
    ar: null,
  };

  function dispatchEvent(el, type) {
    if (!el) return;
    const ev = document.createEvent("MouseEvents");
    const x = mouse.pos.x;
    const y = mouse.pos.y;
    ev.initMouseEvent(type, true, true, window, 0, x, y, x, y, false, false, false, false, 0, null);
    el.dispatchEvent(ev);
  }

  function isArea(el) {
    return !!el && (el.hasAttribute(__PREFIX__ + "area"));
  }

  function isLimit(el) {
    return !!el && el.hasAttribute(__PREFIX__ + "limit");
  }

  function isTracked(el) {
    return !!el && el.hasAttribute(__PREFIX__ + "track");
  }

  function isSelected(el) {
    return !!el && el.hasAttribute(__PREFIX__ + "selected");
  }

  function areaHasFocus(el) {
    return !!el && el.hasAttribute(__PREFIX__ + "has-focus") && el.getAttribute(__PREFIX__ + "has-focus") !== "false";
  }

  function isFocused(el) {
    return !!el && el.hasAttribute(__PREFIX__ + "focused") && el.getAttribute(__PREFIX__ + "focused") !== "false";
  }

  function checkCircular(el, dir) {
    if (!el || !el.hasAttribute(__PREFIX__ + "circular")) {
      return false;
    }

    const circular = el.getAttribute(__PREFIX__ + "circular");
    return (circular === "" || DIRS[dir] === circular);
  }

  function checkLimit(el, dir) {
    return !!dir && isLimit(el) && el.getAttribute(__PREFIX__ + "limit") === LIMITS[dir];
  }

  function intersectRect(r1, r2, dir) {
    if (dir.y !== 0) {
      return (
        r2.left < r1.left + r1.width &&
        r2.left > r1.left - r2.width
      );
    }

    if (dir.x !== 0) {
      return (
        r2.top < r1.top + r1.height &&
        r2.top > r1.top - r2.height
      );
    }

    return false;
  }

  // Finds and returns the closest element from a given vector
  // position or Box to a set of DOM elements.
  //
  // If a direction is given as a vector or string "up", "left"
  // "down", "right", the closest element will be searched in the
  // halfspace defined by the direction and the position.
  function findClosest(pos, els, dir) {
    const v  = dir ? BASE[dir] : nil();
    const v_ = opp(v);
    const rect = pos._r;

    if (pos instanceof Box) {
      pos = pos.bound(v);
    }

    // create a box object for each DOM elements containing sizing
    // informations
    const allBoxes = els.map(createBox);

    // filter out elements that are not in the half space described by
    // the direction vector "v"
    const halfSpaceFilteredBoxes = allBoxes.filter((b) => {
      if (!b) {
        return false;
      }

      // reference point on distant box is the center for an area or
      // is calculated using the opposite direction vector "v_"
      const distPos = b.center();
      const distVec = vec(pos, distPos);

      return dot(distVec, v) >= -options.overlap;
    });

    let hasPriority = false;
    let res = sortByAll(halfSpaceFilteredBoxes.map(function(b) {
      const bound = b.bound(v_);

      const item = {
        el: b.el,
        proj: distp(pos, b.bound(v_), v),
        dist: dist1(pos, bound),
        priority: Infinity
      };

      if (!rect || !intersectRect(rect, b._r, v)) {
        return item;
      }

      if (v.y !== 0) {
        item.priority = bound.x * __X_PRIORITY__;
        hasPriority = true;
      }

      if (v.x !== 0) {
        item.priority = bound.y * __Y_PRIORITY__;
        hasPriority = true;
      }

      return item;
    }), ["proj", "priority", "dist"]);

    if (res.length > 1 && hasPriority) {
      res = res.filter((x) => x.priority < Infinity);
    }

    return res[0] && res[0].el;
  }

  // Finds and returns the element that contains the given
  // position from a set of given DOM elements.
  function findHovered(pos, els) {
    const box = createBox(findClosest(pos, els));
    if (box && box.contains(pos, BASE)) {
      return box.el;
    }
  }

  // Find all the areas in the DOM.
  function allAreas() {
    const els = $find(parent, options.$area);
    if (els.length > 0) {
      return els;
    } else {
      return [parent];
    }
  }

  // Find the default area: the one containing prefix-selected
  // attribute or (if none) the first one in the DOM.
  function defaultArea() {
    let els = allAreas();
    if (els.some(isSelected)) {
      els = sortBy(els, selectedFirst);
    }
    if (els.length) {
      return els[0];
    }
    return null;
  }

  // Find all selectable elements inside the given DOM element.
  function allSelectables(el, dir) {
    let els = $find(el, el.getAttribute(__PREFIX__ + "area") || options.$href);
    const lim = els.some(isLimit);
    if (lim) {
      els = sortBy(els, limitLastSorter);
    }

    if (lim && dir) {
      return els.filter(el => !isLimit(el) || checkLimit(el, dir));
    } else {
      return els;
    }
  }

  function fallback(dir) {
    return mouse.focus(mouse.closest() || defaultArea(), dir, true);
  }

  mouse.setParentElement = function(el) {
    parent = el;
  };

  mouse.focus = function(el, dir, fallback) {
    if (parent && typeof el == "string") {
      el = parent.querySelector(el);
    }

    if (!parent || !parent.contains(el)) {
      logWarn("mickey.focus(): no parent or element not in parent");
      return;
    }

    if (isArea(el)) {
      return mouse.focus(mouse.defaults(el));
    }

    const box = createBox(el);
    if (!box) {
      return false;
    }

    const newEl = el;
    const newAr = mouse.area(newEl);
    const memEl = mouse.el;
    const memAr = mouse.ar;

    const newLimit  = isLimit(newEl);
    const shiftArea = newAr !== memAr;

    if (shiftArea) {
      mouse.ar = newAr;
      if (options.changeClass) {
        $rmvClass(memAr, options.areaClass);
        $addClass(newAr, options.areaClass);
      }
    }

    if (newEl !== memEl &&
       (newAr !== memAr || !newLimit || fallback)) {
      mouse.pos = box.center();
      mouse.el = newEl;
      if (options.changeClass) {
        $rmvClass(memEl, options.hoverClass);
      }
      dispatchEvent(memEl, "mouseout");
      dispatchEvent(newEl, "mouseover");
    }

    if (options.changeClass) {
      $rmvClass(newEl, options.trackClass);
      $addClass(newEl, options.hoverClass, !newLimit);
    }

    if (newLimit && checkLimit(newEl, dir)) {
      mouse.click(el);
    }

    if (mouse.ar !== memAr) {
      options.onChangeArea(memAr, mouse.ar);
    }

    if (mouse.el !== memEl) {
      options.onChangeSelected(memEl, mouse.el, mouse.ar);
    }

    return true;
  };

  mouse.position = function() {
    return {
      x: mouse.pos.x,
      y: mouse.pos.y
    };
  };

  mouse.move = function(dir) {
    if (locked) {
      logWarn("mickey: locked");
      return;
    }

    const curEl = mouse.el;
    const boxEl = createBox(curEl);
    if (!boxEl) {
      if (!fallback(dir)) {
        logWarn("mickey: cannot move");
      }
      return;
    }

    // find the closest element in the same area as the current focused
    // element
    const curAr = mouse.area();
    if (!curAr) {
      if (!fallback(dir)) {
        logWarn("mickey: cannot move");
      }
      return;
    }

    const selectables = without(allSelectables(curAr, dir), curEl);

    let newEl = findClosest(boxEl, selectables, dir);
    if (newEl) {
      return mouse.focus(newEl, dir);
    }

    const zidx = +curAr.getAttribute(__PREFIX__ + "z-index");
    if (zidx > 0) {
      return;
    }

    if (checkCircular(curAr, dir))
      return mouse.focus(mouse.circular(dir));

    // if no close element has been found, we may have to search for the
    // closest area, or check for a limit element
    const boxAr = createBox(curAr);
    const areas = without(allAreas(), curAr);
    const newAr = findClosest(boxAr, areas, dir, true);
    if (!newAr) {
      if (checkLimit(mouse.el, dir)) {
        return mouse.click();
      } else {
        return false;
      }
    }

    // for a area containing only one limit element
    const els = allSelectables(newAr);
    if (els.length === 1 && checkLimit(els[0], dir)) {
      return mouse.click(els[0]);
    }

    const boxesEl = els.map(createBox)
      .filter(b => !!b)
      .map(({el}) => el);

    if (areaHasFocus(newAr)) {
      newEl = find(boxesEl, isFocused);
    } else {
      newEl = boxesEl[0];
    }

    return mouse.focus(newEl, dir);
  };

  mouse.click = function(el) {
    if (locked) {
      logWarn("mickey: locked");
      return;
    }

    el = el || mouse.el;
    if (!parent || !parent.contains(el)) {
      logWarn("mickey: cannot click on non visible element");
      return;
    }

    if (!el && !fallback()) {
      logWarn("mickey: cannot click");
      return;
    }

    dispatchEvent(el, "click");
    return true;
  };

  // current mouse area
  mouse.area = function(el) {
    el = el || mouse.el;
    while (el && el !== parent) {
      el = el.parentNode;
      if (isArea(el)) {
        return el;
      }
    }
  };

  mouse.closest = function(ar) {
    const els = flatten((ar ? [ar] : allAreas()).map(allSelectables));
    return findClosest(mouse.pos, els);
  };

  mouse.closestInArea = function() {
    return mouse.closest(mouse.ar);
  };

  mouse.defaults = function(ar) {
    const area = (ar || defaultArea());
    if (!area) {
      return null;
    }

    const selectables = allSelectables(area);

    let newEl;
    if (areaHasFocus(area)) {
      newEl = find(selectables, isFocused);
      if (!newEl) {
        logWarn("mouse.defaults(): area with focus without focused element");
      }
    } else {
      newEl = selectables[0];
    }

    return newEl;
  };

  mouse.defaultsInArea = function() {
    return mouse.defaults(mouse.ar);
  };

  mouse.hovered = function(pos) {
    const els = flatten(allAreas().map(allSelectables));
    return findHovered(pos || mouse.pos, els);
  };

  mouse.circular = function(dir) {
    let reflect;
    const center = createBox(mouse.ar).center();
    if (dir) {
      reflect = axisReflect(createBox(mouse.el), dir, center);
    } else {
      reflect = pointReflect(mouse.pos, center);
    }
    return findClosest(reflect, allSelectables(mouse.ar), dir);
  };

  mouse.block = function() {
    locked = true;
  };

  mouse.unblock = function() {
    locked = false;
  };

  // clear mouse
  mouse.clear = () => {
    parent = null;
    mouse.pos = nil();
    mouse.el = null;
    mouse.ar = null;
    parent = null;
  };

  // focus update on current area
  mouse.update = function() {
    mouse.focus(mouse.closest());
  };

  mouse.checkFocus = function() {
    if (!parent || !mouse.el || (parent && parent.contains(mouse.el))) {
      return;
    }

    // TODO: handle mouse.ar disapearance ?
    let el;
    const ar = mouse.ar;
    switch(ar.getAttribute(__PREFIX__ + "policy")) {
    default:
    case "closest":  el = mouse.closestInArea(); break;
    case "defaults": el = mouse.defaultsInArea(); break;
    case "hovered":  el = mouse.hovered(); break;
    case "circular": el = mouse.circular(); break;
    }

    mouse.focus(el, null, true);
  };

  return mouse;
}

module.exports = Mickey;
