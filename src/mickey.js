var DOMObserver = require("./dom-observer");
var { Box, createBox } = require("./box");
var { $first, $find, $rmvClass, $addClass } = require("./dom");
var {
  dot,
  vec,
  opp,
  nil,
  dist1,
  distp,
  axisReflect,
  pointReflect
} = require("./math");

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

function camelize(str) {
  return str.replace(/-(.)/g, (__, g) => g.toUpperCase());
}

function prefixed(str) {
  return __PREFIX__
    ? `${__PREFIX__}-${str}`
    : str;
}

// prefixed and camelized dataset keys
var $ATTRSELECTED = "data-" + prefixed('selected');
var $ATTRAREA     = "data-" + prefixed('area');
var $ATTRLIMIT    = "data-" + prefixed('limit');
var $ATTRTRACK    = "data-" + prefixed('track');
var $ATTRCIRCULAR = "data-" + prefixed('circular');

var $AREA      = camelize(prefixed('area'));
var $LIMIT     = camelize(prefixed('limit'));
var $Z_INDEX   = camelize(prefixed('z-index'));
var $TRACK_POS = camelize(prefixed('track-pos'));
var $POLICY    = camelize(prefixed('policy'));

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
    bind:   () => document.addEventListener('keydown', listener, false),
    unbind: () => document.removeEventListener('keydown', listener),
  };
}

function dataSorter(name, ord) {
  return el => el.hasAttribute(name) ? ord : 0;
}

var limitLast = dataSorter($ATTRLIMIT, 1);
var selectedFirst = dataSorter($ATTRSELECTED, -1);

function dispatchEvent(el, {x, y}, type) {
  if (!el) return;
  var ev = document.createEvent('MouseEvents');
  ev.initMouseEvent(type, true, true, window, 0, x, y, x, y, false, false, false, false, 0, null);
  el.dispatchEvent(ev);
}

function isArea(el, root) {
  return !!el && (el.hasAttribute($ATTRAREA) || el === root);
}

function isLimit(el) {
  return !!el && el.hasAttribute($ATTRLIMIT);
}

function isTracked(el) {
  return !!el && el.hasAttribute($ATTRTRACK);
}

function checkCircular(el, dir) {
  if (!el || !el.hasAttribute($ATTRCIRCULAR)) return false;
  var circular = el.dataset.navCircular;
  return circular === '' || DIRS[dir] === circular;
}

function checkLimit(el, dir) {
  return !!dir && isLimit(el) && el.dataset[$LIMIT] === LIMITS[dir];
}

function isSelected(el) {
  return !!el && el.hasAttribute($ATTRSELECTED);
}

// Find all the areas in the DOM.
function allAreas(root, selector) {
  var els = $find(root, selector);
  return els.length ? els: [root];
}

// Find the default area: the one containing data-selected
// attribute or (if none) the first one in the DOM.
function defaultArea(root, selector) {
  var els = allAreas(root, selector);
  if (_.some(els, isSelected)) {
    els = _.sortBy(els, selectedFirst);
  }
  return els[0];
}

// Find all selectable elements inside the given DOM element.
function allSelectables(el, selector, dir) {
  var els = $find(el, el.dataset[$AREA] || selector);
  var lim = _.some(els, isLimit);
  if (lim) els = _.sortBy(els, limitLast);
  if (lim && dir) {
    return _.filter(els, el => !isLimit(el) || checkLimit(el, dir));
  } else {
    return els;
  }
}

function Mickey(root, options = {}) {
  if (!root)
    throw new Error('mickey: should pass a root DOM element');

  var locked = false;
  var inited = false;

  var { $area, $href, hoverClass, areaClass, trackClass, overlap } = _.defaults(options, {
    position: null,
    hoverClass: 'hover',
    areaClass:  'hover',
    trackClass: 'tracked',
    overlap: 0,
    listener: keyListener,
    observer: DOMObserver,
    $area: `[data-${prefixed('area')}]`,
    $href: null,
  });

  // Finds and returns the closest element from a given vector
  // position or Box to a set of DOM elements.
  //
  // If a direction is given as a vector or string 'up', 'left'
  // 'down', 'right', the closest element will be searched in the
  // halfspace defined by the direction and the position.
  function findClosest(pos, els, dir, fromCenter = true) {
    var v  = dir ? BASE[dir] : nil();
    var v_ = opp(v);

    if (pos instanceof Box)
      pos = pos.bound(v);

    var halfSpace = p => dot(vec(pos, p), v) >= -overlap;

    var res = _(els)
      .map(createBox)
      .filter(b => b && halfSpace(fromCenter ? b.center() : b.bound(v_)))
      .map(b => ({
        box:  b,
        el:   b.el,
        proj: distp(pos, b.bound(v_), v),
        dist: dist1(pos, b.bound(v_))
      }))
      .sortBy(['proj', 'dist'])
      .value();

    return res[0] && res[0].el;
  }

  // Finds and returns the element that contains the given
  // position from a set of given DOM elements.
  function findHovered(pos, els) {
    var box = createBox(findClosest(pos, els));
    if (box && box.contains(pos, BASE)) return box.el;
  }

  var mouse = {
    version: '1.0.1',
    pos: options.position || nil(),
    el: null,
    ar: null,

    // mouse initialization
    init() {
      if (inited) throw new Error('mickey: already initialized');

      bind();

      mouse.focus(options.position ?
        mouse.hovered() :
        mouse.defaults());

      return mouse;
    },

    // focus update on current area
    update() {
      mouse.focus(mouse.closest());
    },

    focus(el, dir, forceFallback = false) {
      if (_.isString(el))
        el = root.querySelector(el);

      if (isArea(el, root))
        return mouse.focus(mouse.defaults(el));

      var box = createBox(el);
      if (!box) return false;

      var newEl = el;
      var newAr = mouse.area(newEl);
      var memEl = mouse.el;
      var memAr = mouse.ar;

      var newLimit  = isLimit(newEl);
      var shiftArea = newAr !== memAr;

      if (shiftArea) {
        mouse.ar = newAr;
        $rmvClass(memAr, areaClass);
        $addClass(newAr, areaClass);
      }

      if (newEl !== memEl &&
         (newAr !== memAr || !newLimit || forceFallback)) {
        mouse.pos = box.center();
        mouse.el = newEl;
        $rmvClass(memEl, hoverClass);
        $addClass(memEl, trackClass, shiftArea && isTracked(memAr));
        dispatchEvent(memEl, mouse.pos, 'mouseout');
        dispatchEvent(newEl, mouse.pos, 'mouseover');
      }

      $rmvClass(newEl, trackClass);
      $addClass(newEl, hoverClass, !newLimit);

      if (newLimit && checkLimit(newEl, dir))
        mouse.click(el);

      if (!inited) inited = true;

      return true;
    },

    position() {
      var x = mouse.pos.x;
      var y = mouse.pos.y;
      return { x, y };
    },

    move(dir) {
      if (locked)
        throw new Error('mickey: locked');

      var curEl = mouse.el;
      var boxEl = createBox(curEl);
      if (!boxEl) {
        if (!fallback(dir)) throw new Error('mickey: cannot move');
        return;
      }

      // find the closest element in the same area as the current focused
      // element
      var curAr = mouse.area();
      var selectables = _.without(allSelectables(curAr, $href, dir), curEl);
      var newEl = findClosest(boxEl, selectables, dir);
      if (newEl)
        return mouse.focus(newEl, dir);

      var zidx = +curAr.dataset[$Z_INDEX];
      if (zidx > 0) return;

      if (checkCircular(curAr, dir))
        return mouse.focus(mouse.circular(dir));

      // if no close element has been found, we may have to search for the
      // closest area, or check for a limit element
      var areas = _.without(allAreas(root, $area), curAr);
      var boxAr = createBox(curAr);
      var newAr = findClosest(boxAr, areas, dir, true);
      if (!newAr) {
        return checkLimit(mouse.el, dir)
          ? mouse.click()
          : false;
      }

      // for a data-area containing only one limit element
      var els = allSelectables(newAr, $href);
      if (els.length === 1 && checkLimit(els[0], dir))
        return mouse.click(els[0]);

      if (isTracked(curAr))
        curAr.dataset[$TRACK_POS] = JSON.stringify(mouse.pos);

      if (isTracked(newAr)) {
        var trackPos = newAr.dataset[$TRACK_POS];
        var trackElt = $first(newAr, '.' + trackClass);
        newEl = trackElt || (trackPos && findClosest(JSON.parse(trackPos), els));
      } else {
        newEl = els[0];
      }

      return mouse.focus(newEl, dir);
    },

    click(el = mouse.el) {
      if (locked || !inited)
        throw new Error('mickey: locked');

      if (!root.contains(el))
        throw new Error('mickey: cannot click on non visible element');

      if (!el && !fallback())
        throw new Error('mickey: cannot click');

      dispatchEvent(el, mouse.pos, 'click');
      return true;
    },

    area(el = mouse.el) {
      while (el && el !== root) {
        el = el.parentNode;
        if (isArea(el, root)) return el;
      }
      return root;
    },

    closest(ar) {
      var ars = ar ? [ar] : allAreas(root, $area);
      var els = _.flatten(ars, true, a => allSelectables(a, $href));
      return findClosest(mouse.pos, els);
    },

    closestInArea() {
      return mouse.closest(mouse.ar);
    },

    defaults(ar) {
      return (allSelectables(ar || defaultArea(root, $area), $href))[0];
    },

    defaultsInArea() {
      return mouse.defaults(mouse.ar);
    },

    hovered() {
      var ars = allAreas(root, $area);
      var els = _.flatten(ars, true, a => allSelectables(a, $href));
      return findHovered(mouse.pos, els);
    },

    circular(dir) {
      var center = createBox(mouse.ar).center();
      var reflect = dir
        ? axisReflect(createBox(mouse.el).bound(BASE[dir]), center, BASE[dir])
        : pointReflect(mouse.pos, center);
      var els = allSelectables(mouse.ar, $href);
      return findClosest(reflect, els, dir);
    },

    block() {
      locked = true;
      $addClass(mouse.el, 'blocked');
    },

    unblock() {
      locked = false;
      $rmvClass(mouse.el, 'blocked');
    },

    // clear mouse
    clear: _.once(() => {
      unbind();
      mouse.pos = nil();
      mouse.el = null;
      mouse.ar = null;
      root = null;
      locked = false;
    }),
  };

  //
  // PRIVATES
  //

  var { bind, unbind } = ((Observer, Listener) => {
    var obs, lis = Listener(mouse);
    return {
      bind: _.once(() => {
        obs = Observer(root, watch);
        if (lis.bind) lis.bind(root);
      }),
      unbind: _.once(() => {
        if (obs) obs.disconnect();
        if (lis.unbind) lis.unbind();
      })
    };
  })(
    options.observer,
    options.listener
  );


  function fallback(dir) {
    return mouse.focus(mouse.closest() || defaultArea(root, $area), dir, true);
  }

  function watch() {
    if (!inited)
      return mouse.init();

    if (!root || root.contains(mouse.el))
      return;

    // TODO: handle mouse.ar disapearance ?
    var el, ar = mouse.ar;
    switch(ar.dataset[$POLICY]) {
    default:
    case 'closest':  el = mouse.closestInArea(); break;
    case 'defaults': el = mouse.defaultsInArea(); break;
    case 'hovered':  el = mouse.hovered(); break;
    case 'circular': el = mouse.circular(); break;
    }

    mouse.focus(el, null, true);
  }

  return mouse;
}

module.exports = Mickey;
