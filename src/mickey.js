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
  var listener = function(ev) {
    var k = KEYS[ev.keyCode];
    if (k === 'click') {
      mouse.click();
    } else if (k) {
      mouse.move(k);
    }
  };

  return {
    bind:   _.bind(document.addEventListener,    document, 'keydown', listener),
    unbind: _.bind(document.removeEventListener, document, 'keydown', listener)
  };
}

function observer(target, fn) {
  // create an observer instance
  var obs;
  if (window.MutationObserver != null) {
    obs = new MutationObserver(fn);
    obs.observe(target, { attributes: true, childList: true, characterData: true, subtree: true });
  } else {
    fn = _.debounce(fn, 0);
    target.addEventListener('DOMSubtreeModified', fn);
    obs = { disconnect: function() { target.removeEventListener('DOMSubtreeModified', fn); } };
  }
  return obs;
}

function $first(el, selector) {
  return el.querySelector(selector);
}

function $find(el, selector) {
  return _.toArray(el.querySelectorAll(selector));
}

function $addClass(el, cl, add) {
  if (!el || add === false) { return; }
  el.classList.add(cl);
}

function $rmvClass(el, cl, rem) {
  if (!el || rem === false) { return; }
  el.classList.remove(cl);
}

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

function dataSorter(name, ord) {
  return function(el) {
    return el.dataset[name] == null ? 0 : ord;
  };
}

var limitLast     = dataSorter('navLimit', 1);
var selectedFirst = dataSorter('navSelected', -1);

function createBox(el) {
  if (!el) { return; }
  var r = el.getBoundingClientRect();
  if (r.height > 0 || r.width > 0) {
    return new Box(el, r);
  }
}

function Box(el, r) {
  this.el = el;
  this._r = r;
}

Box.prototype.contains = function(pos) {
  var c = this.center();
  var v = vec(c, this.bound(BASE.down));
  var h = vec(c, this.bound(BASE.right));
  var x = vec(c, pos);
  return (
    2 * Math.abs(dot(v, x)) <= this._r.height &&
    2 * Math.abs(dot(h, x)) <= this._r.width
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

function Mickey(parent, options) {
  if (!parent) {
    throw new Error('mickey: should pass a parent DOM element');
  }

  var locked = false;
  var inited = false;

  options = _.defaults(options || {}, {
    hoverClass: 'hover',
    areaClass:  'hover',
    trackClass: 'tracked',
    overlap: 0,
    position: null,
    listener: keyListener,
    $area: '[data-nav-area]',
    $href: null
  });

  var mouse = {
    version: '1.0.0',
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
    return !!el && (el.dataset.navArea != null || el === parent);
  }

  function isLimit(el) {
    return !!el && el.dataset.navLimit != null;
  }

  function isTracked(el) {
    return !!el && el.dataset.navTrack != null;
  }

  function checkCircular(el, dir) {
    if (!el || el.dataset.navCircular == null) return false;
    var circular = el.dataset.navCircular;
    return circular === '' || DIRS[dir] === circular;
  }

  function checkLimit(el, dir) {
    return !!dir && isLimit(el) && el.dataset.navLimit === LIMITS[dir];
  }

  function isSelected(el) {
    return !!el && el.dataset.navSelected != null;
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

    if (pos instanceof Box) {
      pos = pos.bound(v);
    }

    var halfSpace = function(p) {
      return dot(vec(pos, p), v) >= -options.overlap;
    };

    var res = _.map(_.filter(_.map(els, createBox), function(b) {
      return b && halfSpace(area ? b.bound(v_) : b.center());
    }), function(b) {
      return {
        el:   b.el,
        proj: distp(pos, b.bound(v_), v),
        dist: dist1(pos, b.bound(v_))
      };
    });

    res = _.sortBy(res, function(x) { return x.proj; });
    if (res.length > 1 && res[0].proj === res[1].proj) {
      res = _.sortBy(res, function(x) { return x.dist; });
    }
    return res[0] && res[0].el;
  }

  // Finds and returns the element that contains the given
  // position from a set of given DOM elements.
  function findHovered(pos, els) {
    var box = createBox(findClosest(pos, els));
    if (box && box.contains(pos)) {
      return box.el;
    }
  }

  // Find all the areas in the DOM.
  function allAreas() {
    var els = $find(parent, options.$area);
    return els.length ? els: [parent];
  }

  // Find the default area: the one containing data-selected
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
    var els = $find(el, el.dataset.navArea || options.$href);
    var lim = _.some(els, isLimit);
    if (lim) { els = _.sortBy(els, limitLast); }
    if (lim && dir) {
      return _.filter(els, function(el) {
        return !isLimit(el) || checkLimit(el, dir);
      });
    } else {
      return els;
    }
  }

  function fallback(dir) {
    return mouse.focus(mouse.closest() || defaultArea(), dir, true);
  }

  var obs;
  var bind = _.once(function() {
    obs = observer(parent, watch);
    listener.bind && listener.bind(parent);
  });

  var unbind = _.once(function() {
    obs && obs.disconnect();
    listener.unbind && listener.unbind();
  });

  mouse.focus = function(el, dir, fallback) {
    if (_.isString(el)) {
      el = parent.querySelector(el);
    }

    if (isArea(el))
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
      $rmvClass(memAr, options.areaClass);
      $addClass(newAr, options.areaClass);
    }

    if (newEl !== memEl &&
       (newAr !== memAr || !newLimit || fallback)) {
      mouse.pos = box.center();
      mouse.el = newEl;
      $rmvClass(memEl, options.hoverClass);
      $addClass(memEl, options.trackClass, shiftArea && isTracked(memAr));
      $rmvClass(newEl, options.trackClass);
      $addClass(newEl, options.hoverClass, !newLimit);
      dispatchEvent(memEl, 'mouseout');
      dispatchEvent(newEl, 'mouseover');
    }

    if (newLimit && checkLimit(newEl, dir)) {
      mouse.click(el);
    }

    if (!inited) { inited = true; }

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
      throw new Error('mickey: locked');
    }

    var curEl = mouse.el;
    var boxEl = createBox(curEl);
    if (!boxEl) {
      if (!fallback(dir)) throw new Error('mickey: cannot move');
      return;
    }

    // find the closest element in the same area as the current focused
    // element
    var curAr = mouse.area();
    var selectables = _.without(allSelectables(curAr, dir), curEl);
    var newEl = findClosest(boxEl, selectables, dir);
    if (newEl)
      return mouse.focus(newEl, dir);

    var zidx = +curAr.dataset.navZIndex;
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

    // for a data-area containing only one limit element
    var els = allSelectables(newAr);
    if (els.length === 1 && checkLimit(els[0], dir))
      return mouse.click(els[0]);

    if (isTracked(curAr)) {
      curAr.dataset.navTrackPos = JSON.stringify(mouse.pos);
    }
    if (isTracked(newAr)) {
      var trackPos = newAr.dataset.navTrackPos;
      var trackElt = $first(newAr, '.' + options.trackClass);
      newEl = trackElt || (trackPos && findClosest(JSON.parse(trackPos), els));
    }

    return mouse.focus(newEl || els[0], dir);
  };

  mouse.click = function(el) {
    if (locked || !inited)
      throw new Error('mickey: locked');
    el = el || mouse.el;
    if (!parent.contains(el))
      throw new Error('mickey: cannot click on non visible element');
    if (!el && !fallback())
      throw new Error('mickey: cannot click');
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
    return _.first(allSelectables(ar || defaultArea()));
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
      reflect = axisReflect(createBox(mouse.el).bound(BASE[dir]), center, BASE[dir]);
    } else {
      reflect = pointReflect(mouse.pos, center);
    }
    return findClosest(reflect, allSelectables(mouse.ar), dir);
  };

  mouse.block = function() {
    locked = true;
    $addClass(mouse.el, 'blocked');
  };

  mouse.unblock = function() {
    locked = false;
    $rmvClass(mouse.el, 'blocked');
  };

  // clear mouse
  mouse.clear = _.once(function() {
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
      throw new Error('mickey: already initialized');
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

    if (!parent || parent.contains(mouse.el))
      return;

    // TODO: handle mouse.ar disapearance ?
    var el, ar = mouse.ar;
    switch(ar.dataset.navPolicy) {
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
