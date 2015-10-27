var DOMObserver = require('./dom-observer');
var { Box, createBox } = require('./box');
var { $first, $find, $rmvClass, $addClass } = require('./dom');
var {
  dot,
  vec,
  opp,
  nil,
  dist1,
  distp,
  axisReflect,
  pointReflect
} = require('./math');

var BASE = {
  left:  { x: -1, y: 0 },
  up:    { x: 0,  y: -1 },
  right: { x: 1,  y: 0 },
  down:  { x: 0,  y: 1 },
};

var KEYS = {
  37: 'left',
  38: 'up',
  39: 'right',
  40: 'down',
  13: 'click'
};

var LIMITS = {
  left:  'left',
  up:    'top',
  right: 'right',
  down:  'bottom',
};

var DIRS = {
  left:  'horizontal',
  right: 'horizontal',
  up:    'vertical',
  down:  'vertical'
};

function keyListener(mouse) {
  var listener = (ev) => {
    var k = KEYS[ev.keyCode];
    if (k === 'click') {
      mouse.click();
    } else if (k) {
      mouse.move(k);
    }
  };

  return {
    bind: function() {
      document.addEventListener("keydown", listener);
    },
    unbind: function() {
      document.removeEventListener("keydown", listener);
    },
  };
}

function dataSorter(name, ord, prefix) {
  return el => el.hasAttribute(prefix + name) ? ord : 0;
}

function Mickey(parent, options) {
  if (!parent)
    throw new Error('mickey: should pass a parent DOM element');

  var locked = false;
  var inited = false;

  options = _.defaults(options || {}, {
    changeClass: true,
    hoverClass: 'hover',
    areaClass:  'hover',
    trackClass: 'tracked',
    onChangeArea: _.noop,
    onChangeSelected: _.noop,
    overlap: 0,
    position: null,
    priority: 'left,top',
    listener: keyListener,
    observer: DOMObserver,
    prefix: 'data-nav-',
    $area: '[data-nav-area]',
    $href: null
  });

  var __PREFIX__ = options.prefix;
  var __Y_PRIORITY__ = 0;
  var __X_PRIORITY__ = 0;

  if (_.contains(options.priority, 'left'))
    __X_PRIORITY__ = 1;
  if (_.contains(options.priority, 'right'))
    __X_PRIORITY__ = -1;

  if (_.contains(options.priority, 'top'))
    __Y_PRIORITY__ = 1;
  if (_.contains(options.priority, 'bottom'))
    __Y_PRIORITY__ = -1;

  var limitLast = dataSorter('limit', 1, __PREFIX__);
  var selectedFirst = dataSorter('selected', -1, __PREFIX__);

  var mouse = {
    version: '1.0.5',
    pos: options.position || nil(),
    el: null,
    ar: null,
  };

  var listener = options.listener(mouse);

  function dispatchEvent(el, type) {
    if (!el) return;
    var ev = document.createEvent('MouseEvents');
    var x = mouse.pos.x;
    var y = mouse.pos.y;
    ev.initMouseEvent(type, true, true, window, 0, x, y, x, y, false, false, false, false, 0, null);
    el.dispatchEvent(ev);
  }

  function isArea(el) {
    return !!el && (el.hasAttribute(__PREFIX__ + 'area'));
  }

  function isLimit(el) {
    return !!el && el.hasAttribute(__PREFIX__ + 'limit');
  }

  function isTracked(el) {
    return !!el && el.hasAttribute(__PREFIX__ + 'track');
  }

  function checkCircular(el, dir) {
    if (!el || !el.hasAttribute(__PREFIX__ + 'circular'))
      return false;

    var circular = el.getAttribute(__PREFIX__ + 'circular');
    return circular === '' || DIRS[dir] === circular;
  }

  function checkLimit(el, dir) {
    return !!dir && isLimit(el) && el.getAttribute(__PREFIX__ + 'limit') === LIMITS[dir];
  }

  function isSelected(el) {
    return !!el && el.hasAttribute(__PREFIX__ + 'selected');
  }

  function intersectRect(r1, r2, dir) {
    if (dir.y !== 0) {
      return !(r2.left >= r1.left + r1.width || r2.left + r2.width <= r1.left);
    }
    if (dir.x !== 0) {
      return !(r2.top >= r1.top + r1.height || r2.top + r2.height <= r1.top);
    }
    return false;
  }

  // Finds and returns the closest element from a given vector
  // position or Box to a set of DOM elements.
  //
  // If a direction is given as a vector or string 'up', 'left'
  // 'down', 'right', the closest element will be searched in the
  // halfspace defined by the direction and the position.
  function findClosest(pos, els, dir, area) {
    var v  = dir ? BASE[dir] : nil();
    var v_ = opp(v);
    var rect = pos._r;

    if (pos instanceof Box)
      pos = pos.bound(v);


    // create a box object for each DOM elements containing sizing
    // informations
    var allBoxes = _.map(els, createBox);

    // filter out elements that are not in the half space described by
    // the direction vector "v"
    var halfSpaceFilteredBoxes = _.filter(allBoxes, (b) => {
      if (!b)
        return false;

      // reference point on distant box is the center for an area or
      // is calculated using the opposite direction vector "v_"
      var distPos = area ? b.bound(v_) : b.center();
      var distVec = vec(pos, distPos);

      return dot(distVec, v) >= -options.overlap;
    });

    var res = _.sortByAll(_.map(halfSpaceFilteredBoxes, function(b) {
      var bound = b.bound(v_);

      var item = {
        el: b.el,
        proj: distp(pos, b.bound(v_), v),
        dist: dist1(pos, bound),
        priority: Infinity
      };

      if (!rect || !intersectRect(rect, b._r, v))
        return item;

      if (v.y !== 0)
        item.priority = bound.x * __X_PRIORITY__;

      if (v.x !== 0)
        item.priority = bound.y * __Y_PRIORITY__;

      return item;
    }), ['proj', 'priority', 'dist']);

    if (res.length > 1 && _.find(res, x => x.priority < Infinity)) {
      res = _.filter(res, x => x.priority < Infinity);
    }

    return res[0] && res[0].el;
  }

  // Finds and returns the element that contains the given
  // position from a set of given DOM elements.
  function findHovered(pos, els) {
    var box = createBox(findClosest(pos, els));
    if (box && box.contains(pos, BASE)) return box.el;
  }

  // Find all the areas in the DOM.
  function allAreas() {
    var els = $find(parent, options.$area);
    return els.length ? els: [parent];
  }

  // Find the default area: the one containing prefix-selected
  // attribute or (if none) the first one in the DOM.
  function defaultArea() {
    var els = allAreas();
    if (_.some(els, isSelected)) {
      els = _.sortBy(els, selectedFirst);
    }
    return _.first(els);
  }

  // Find all selectable elements inside the given DOM element.
  function allSelectables(el, dir) {
    var els = $find(el, el.getAttribute(__PREFIX__ + 'area') || options.$href);
    var lim = _.some(els, isLimit);
    if (lim) els = _.sortBy(els, limitLast);
    if (lim && dir) {
      return _.filter(els, el => !isLimit(el) || checkLimit(el, dir));
    } else {
      return els;
    }
  }

  function fallback(dir) {
    return mouse.focus(mouse.closest() || defaultArea(), dir, true);
  }

  var obs;
  var bind = _.once(() => {
    obs = options.observer(parent, watch);
    if (listener.bind) listener.bind(parent);
  });

  var unbind = _.once(() => {
    obs && obs.disconnect();
    if (listener.unbind) listener.unbind();
  });

  mouse.focus = function(el, dir, fallback) {
    if (_.isString(el)) {
      el = parent.querySelector(el);
    }

    if (isArea(el))
      return mouse.focus(mouse.defaults(el));

    var box = createBox(el);
    if (!box)
      return false;

    var newEl = el;
    var newAr = mouse.area(newEl);
    var memEl = mouse.el;
    var memAr = mouse.ar;

    var newLimit  = isLimit(newEl);
    var shiftArea = newAr !== memAr;

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
        $addClass(memEl, options.trackClass, shiftArea && isTracked(memAr));
      }
      dispatchEvent(memEl, 'mouseout');
      dispatchEvent(newEl, 'mouseover');
    }

    if (options.changeClass) {
      $rmvClass(newEl, options.trackClass);
      $addClass(newEl, options.hoverClass, !newLimit);
    }

    if (newLimit && checkLimit(newEl, dir)) {
      mouse.click(el);
    }

    if (mouse.ar !== memAr)
      options.onChangeArea(memAr, mouse.ar);

    if (mouse.el !== memEl)
      options.onChangeSelected(memEl, mouse.el, mouse.ar);

    if (!inited) {
      bind();
      inited = true;
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
      console.warn('mickey: locked');
      return;
    }

    var curEl = mouse.el;
    var boxEl = createBox(curEl);
    if (!boxEl) {
      if (!fallback(dir)) {
        console.warn('mickey: cannot move');
      }
      return;
    }

    // find the closest element in the same area as the current focused
    // element
    var curAr = mouse.area();
    var selectables = _.without(allSelectables(curAr, dir), curEl);
    var newEl = findClosest(boxEl, selectables, dir);
    if (newEl)
      return mouse.focus(newEl, dir);

    var zidx = +curAr.getAttribute(__PREFIX__ + 'z-index');
    if (zidx > 0)
      return;

    if (checkCircular(curAr, dir))
      return mouse.focus(mouse.circular(dir));

    // if no close element has been found, we may have to search for the
    // closest area, or check for a limit element
    var boxAr = createBox(curAr);
    var areas = _.without(allAreas(), curAr);
    var newAr = findClosest(boxAr, areas, dir, true);
    if (!newAr) {
      if (checkLimit(mouse.el, dir))
        return mouse.click();
      else
        return false;
    }

    // for a area containing only one limit element
    var els = allSelectables(newAr);
    if (els.length === 1 && checkLimit(els[0], dir))
      return mouse.click(els[0]);

    if (isTracked(curAr)) {
      curAr.setAttribute(__PREFIX__ + 'track-pos', JSON.stringify(mouse.pos));
    }

    if (isTracked(newAr)) {
      var trackPos = newAr.getAttribute(__PREFIX__ + 'track-pos');
      var trackElt = $first(newAr, '.' + options.trackClass);
      newEl = trackElt || (trackPos && findClosest(JSON.parse(trackPos), els));
    }

    return mouse.focus(newEl || els[0], dir);
  };

  mouse.click = function(el) {
    if (locked || !inited) {
      console.warn('mickey: locked');
      return;
    }

    el = el || mouse.el;
    if (!parent.contains(el, BASE)) {
      console.warn('mickey: cannot click on non visible element');
      return;
    }

    if (!el && !fallback()) {
      console.warn('mickey: cannot click');
      return;
    }

    dispatchEvent(el, 'click');
    return true;
  };

  // current mouse area
  mouse.area = function(el) {
    el = el || mouse.el;
    while (el && el !== parent) {
      el = el.parentNode;
      if (isArea(el)) return el;
    }
    return parent;
  };

  mouse.closest = function(ar) {
    var els = _.flatten(_.map(ar ? [ar] : allAreas(), allSelectables));
    return findClosest(mouse.pos, els);
  };

  mouse.closestInArea = function() {
    return mouse.closest(mouse.ar);
  };

  mouse.defaults = function(ar) {
    return (allSelectables(ar || defaultArea()))[0];
  };

  mouse.defaultsInArea = function() {
    return mouse.defaults(mouse.ar);
  };

  mouse.hovered = function() {
    var els = _.flatten(_.map(allAreas(), allSelectables));
    return findHovered(mouse.pos, els);
  };

  mouse.circular = function(dir) {
    var reflect;
    var center = createBox(mouse.ar).center();
    if (dir) {
      reflect = axisReflect(createBox(mouse.el), dir, center);
    } else {
      reflect = pointReflect(mouse.pos, center);
    }
    return findClosest(reflect, allSelectables(mouse.ar), dir);
  };

  mouse.block = function() {
    locked = true;
    if (options.changeClass)
      $addClass(mouse.el, 'blocked');
  };

  mouse.unblock = function() {
    locked = false;
    if (options.changeClass)
      $rmvClass(mouse.el, 'blocked');
  };

  // clear mouse
  mouse.clear = _.once(() => {
    unbind();
    mouse.pos = nil();
    mouse.el = null;
    mouse.ar = null;
    parent = null;
    locked = false;
    listener = null;
  });

  // focus update on current area
  mouse.update = function() {
    mouse.focus(mouse.closest());
  };

  // mouse initialization
  mouse.init = function() {
    if (inited) {
      console.warn('mickey: already initialized');
      return;
    }

    bind();

    mouse.focus(options.position ?
      mouse.hovered() :
      mouse.defaults());

    return mouse;
  };

  var watch = function() {
    if (!inited)
      return mouse.init();

    if (!parent || parent.contains(mouse.el, BASE))
      return;

    // TODO: handle mouse.ar disapearance ?
    var el, ar = mouse.ar;
    switch(ar.getAttribute(__PREFIX__ + 'policy')) {
    default:
    case 'closest':  el = mouse.closestInArea(); break;
    case 'defaults': el = mouse.defaultsInArea(); break;
    case 'hovered':  el = mouse.hovered(); break;
    case 'circular': el = mouse.circular(); break;
    }

    mouse.focus(el, null, true);
  };

  return mouse;
}

module.exports = Mickey;
