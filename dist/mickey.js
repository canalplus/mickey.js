(function webpackUniversalModuleDefinition(root, factory) {
	if(typeof exports === 'object' && typeof module === 'object')
		module.exports = factory();
	else if(typeof define === 'function' && define.amd)
		define(factory);
	else if(typeof exports === 'object')
		exports["Mickey"] = factory();
	else
		root["Mickey"] = factory();
})(this, function() {
return /******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId])
/******/ 			return installedModules[moduleId].exports;
/******/
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			exports: {},
/******/ 			id: moduleId,
/******/ 			loaded: false
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.loaded = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(0);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ function(module, exports, __webpack_require__) {

	"use strict";
	var DOMObserver = __webpack_require__(3);
	var $__0 = __webpack_require__(2),
	    Box = $__0.Box,
	    createBox = $__0.createBox;
	var $__0 = __webpack_require__(4),
	    $first = $__0.$first,
	    $find = $__0.$find,
	    $rmvClass = $__0.$rmvClass,
	    $addClass = $__0.$addClass;
	var $__0 = __webpack_require__(1),
	    dot = $__0.dot,
	    vec = $__0.vec,
	    opp = $__0.opp,
	    nil = $__0.nil,
	    dist1 = $__0.dist1,
	    distp = $__0.distp,
	    axisReflect = $__0.axisReflect,
	    pointReflect = $__0.pointReflect;
	var BASE = {
	  left: {
	    x: -1,
	    y: 0
	  },
	  up: {
	    x: 0,
	    y: -1
	  },
	  right: {
	    x: 1,
	    y: 0
	  },
	  down: {
	    x: 0,
	    y: 1
	  }
	};
	var KEYS = {
	  37: 'left',
	  38: 'up',
	  39: 'right',
	  40: 'down',
	  13: 'click'
	};
	var LIMITS = {
	  left: 'left',
	  up: 'top',
	  right: 'right',
	  down: 'bottom'
	};
	var DIRS = {
	  left: 'horizontal',
	  right: 'horizontal',
	  up: 'vertical',
	  down: 'vertical'
	};
	function keyListener(mouse) {
	  var listener = (function(ev) {
	    var k = KEYS[ev.keyCode];
	    if (k === 'click') {
	      mouse.click();
	    } else if (k) {
	      mouse.move(k);
	    }
	  });
	  return {
	    bind: _.bind(document.addEventListener, document, 'keydown', listener),
	    unbind: _.bind(document.removeEventListener, document, 'keydown', listener)
	  };
	}
	function dataSorter(name, ord, prefix) {
	  return (function(el) {
	    return el.hasAttribute(prefix + name) ? ord : 0;
	  });
	}
	function Mickey(parent, options) {
	  if (!parent)
	    throw new Error('mickey: should pass a parent DOM element');
	  var locked = false;
	  var inited = false;
	  options = _.defaults(options || {}, {
	    hoverClass: 'hover',
	    areaClass: 'hover',
	    trackClass: 'tracked',
	    overlap: 0,
	    position: null,
	    priority: 'left,top',
	    listener: keyListener,
	    observer: DOMObserver,
	    prefix: 'data-nav-',
	    $area: '[data-nav-area]',
	    $href: null
	  });
	  var limitLast = dataSorter('limit', 1, options.prefix);
	  var selectedFirst = dataSorter('selected', -1, options.prefix);
	  var mouse = {
	    version: '1.0.6',
	    pos: options.position || nil(),
	    el: null,
	    ar: null
	  };
	  var listener = options.listener(mouse);
	  function dispatchEvent(el, type) {
	    if (!el)
	      return;
	    var ev = document.createEvent('MouseEvents');
	    var x = mouse.pos.x;
	    var y = mouse.pos.y;
	    ev.initMouseEvent(type, true, true, window, 0, x, y, x, y, false, false, false, false, 0, null);
	    el.dispatchEvent(ev);
	  }
	  function isArea(el) {
	    return !!el && (el.hasAttribute(options.prefix + 'area') || el === parent);
	  }
	  function isLimit(el) {
	    return !!el && el.hasAttribute(options.prefix + 'limit');
	  }
	  function isTracked(el) {
	    return !!el && el.hasAttribute(options.prefix + 'track');
	  }
	  function checkCircular(el, dir) {
	    if (!el || !el.hasAttribute(options.prefix + 'circular'))
	      return false;
	    var circular = el.getAttribute(options.prefix + 'circular');
	    return circular === '' || DIRS[dir] === circular;
	  }
	  function checkLimit(el, dir) {
	    return !!dir && isLimit(el) && el.getAttribute(options.prefix + 'limit') === LIMITS[dir];
	  }
	  function isSelected(el) {
	    return !!el && el.hasAttribute(options.prefix + 'selected');
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
	  function findClosest(pos, els, dir, area) {
	    var v = dir ? BASE[dir] : nil();
	    var v_ = opp(v);
	    var rect = pos._r;
	    if (pos instanceof Box)
	      pos = pos.bound(v);
	    var halfSpace = (function(p) {
	      return dot(vec(pos, p), v) >= 0;
	    });
	    var res = _.sortBy(_.map(_.filter(_.map(els, function(el) {
	      return createBox(el, options.overlap);
	    }), (function(b) {
	      return b && halfSpace(area ? b.bound(v_) : b.center());
	    })), function(b) {
	      var bound = b.bound(v_);
	      var item = ({
	        el: b.el,
	        proj: distp(pos, b.bound(v_), v),
	        dist: dist1(pos, bound),
	        priority: Infinity
	      });
	      if (!rect || !intersectRect(rect, b._r, v)) {
	        return item;
	      }
	      if (v.y !== 0) {
	        if (_.contains(options.priority, 'left')) {
	          item.priority = bound.x;
	        }
	        if (_.contains(options.priority, 'right')) {
	          item.priority = -bound.x;
	        }
	      }
	      if (v.x !== 0) {
	        if (_.contains(options.priority, 'top')) {
	          item.priority = bound.y;
	        }
	        if (_.contains(options.priority, 'bottom')) {
	          item.priority = -bound.y;
	        }
	      }
	      return item;
	    }), ['proj', 'priority', 'dist']);
	    if (res.length > 1 && _.find(res, (function(x) {
	      return x.priority < Infinity;
	    }))) {
	      res = _.filter(res, (function(x) {
	        return x.priority < Infinity;
	      }));
	    }
	    return res[0] && res[0].el;
	  }
	  function findHovered(pos, els) {
	    var box = createBox(findClosest(pos, els), options.overlap);
	    if (box && box.contains(pos, BASE))
	      return box.el;
	  }
	  function allAreas() {
	    var els = $find(parent, options.$area);
	    return els.length ? els : [parent];
	  }
	  function defaultArea() {
	    var els = allAreas();
	    if (_.some(els, isSelected)) {
	      els = _.sortBy(els, selectedFirst);
	    }
	    return _.first(els);
	  }
	  function allSelectables(el, dir) {
	    var els = $find(el, el.getAttribute(options.prefix + 'area') || options.$href);
	    var lim = _.some(els, isLimit);
	    if (lim)
	      els = _.sortBy(els, limitLast);
	    if (lim && dir) {
	      return _.filter(els, (function(el) {
	        return !isLimit(el) || checkLimit(el, dir);
	      }));
	    } else {
	      return els;
	    }
	  }
	  function fallback(dir) {
	    return mouse.focus(mouse.closest() || defaultArea(), dir, true);
	  }
	  var obs;
	  var bind = _.once((function() {
	    obs = options.observer(parent, watch);
	    if (listener.bind)
	      listener.bind(parent);
	  }));
	  var unbind = _.once((function() {
	    obs && obs.disconnect();
	    if (listener.unbind)
	      listener.unbind();
	  }));
	  mouse.focus = function(el, dir, fallback) {
	    if (_.isString(el)) {
	      el = parent.querySelector(el);
	    }
	    if (isArea(el))
	      return mouse.focus(mouse.defaults(el));
	    var box = createBox(el, options.overlap);
	    if (!box)
	      return false;
	    var newEl = el;
	    var newAr = mouse.area(newEl);
	    var memEl = mouse.el;
	    var memAr = mouse.ar;
	    var newLimit = isLimit(newEl);
	    var shiftArea = newAr !== memAr;
	    if (shiftArea) {
	      mouse.ar = newAr;
	      $rmvClass(memAr, options.areaClass);
	      $addClass(newAr, options.areaClass);
	    }
	    if (newEl !== memEl && (newAr !== memAr || !newLimit || fallback)) {
	      mouse.pos = box.center();
	      mouse.el = newEl;
	      $rmvClass(memEl, options.hoverClass);
	      $addClass(memEl, options.trackClass, shiftArea && isTracked(memAr));
	      dispatchEvent(memEl, 'mouseout');
	      dispatchEvent(newEl, 'mouseover');
	    }
	    $rmvClass(newEl, options.trackClass);
	    $addClass(newEl, options.hoverClass, !newLimit);
	    if (newLimit && checkLimit(newEl, dir)) {
	      mouse.click(el);
	    }
	    if (!inited)
	      inited = true;
	    return true;
	  };
	  mouse.position = function() {
	    return {
	      x: mouse.pos.x,
	      y: mouse.pos.y
	    };
	  };
	  mouse.move = function(dir) {
	    if (locked)
	      throw new Error('mickey: locked');
	    var curEl = mouse.el;
	    var boxEl = createBox(curEl, options.overlap);
	    if (!boxEl) {
	      if (!fallback(dir))
	        throw new Error('mickey: cannot move');
	      return;
	    }
	    var curAr = mouse.area();
	    var selectables = _.without(allSelectables(curAr, dir), curEl);
	    var newEl = findClosest(boxEl, selectables, dir);
	    if (newEl)
	      return mouse.focus(newEl, dir);
	    var zidx = +curAr.getAttribute(options.prefix + 'z-index');
	    if (zidx > 0)
	      return;
	    if (checkCircular(curAr, dir))
	      return mouse.focus(mouse.circular(dir));
	    var boxAr = createBox(curAr, options.overlap);
	    var areas = _.without(allAreas(), curAr);
	    var newAr = findClosest(boxAr, areas, dir, true);
	    if (!newAr) {
	      if (checkLimit(mouse.el, dir))
	        return mouse.click();
	      else
	        return false;
	    }
	    var els = allSelectables(newAr);
	    if (els.length === 1 && checkLimit(els[0], dir))
	      return mouse.click(els[0]);
	    if (isTracked(curAr)) {
	      curAr.setAttribute(options.prefix + 'track-pos', JSON.stringify(mouse.pos));
	    }
	    if (isTracked(newAr)) {
	      var trackPos = newAr.getAttribute(options.prefix + 'track-pos');
	      var trackElt = $first(newAr, '.' + options.trackClass);
	      newEl = trackElt || (trackPos && findClosest(JSON.parse(trackPos), els));
	    }
	    return mouse.focus(newEl || els[0], dir);
	  };
	  mouse.click = function(el) {
	    if (locked || !inited)
	      throw new Error('mickey: locked');
	    el = el || mouse.el;
	    if (!parent.contains(el, BASE))
	      throw new Error('mickey: cannot click on non visible element');
	    if (!el && !fallback())
	      throw new Error('mickey: cannot click');
	    dispatchEvent(el, 'click');
	    return true;
	  };
	  mouse.area = function(el) {
	    el = el || mouse.el;
	    while (el && el !== parent) {
	      el = el.parentNode;
	      if (isArea(el))
	        return el;
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
	    var center = createBox(mouse.ar, options.overlap).center();
	    if (dir) {
	      reflect = axisReflect(createBox(mouse.el, options.overlap), dir, center);
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
	  mouse.clear = _.once((function() {
	    unbind();
	    mouse.pos = nil();
	    mouse.el = null;
	    mouse.ar = null;
	    parent = null;
	    locked = false;
	    listener = null;
	  }));
	  mouse.update = function() {
	    mouse.focus(mouse.closest());
	  };
	  mouse.init = function() {
	    if (inited) {
	      throw new Error('mickey: already initialized');
	    }
	    bind();
	    mouse.focus(options.position ? mouse.hovered() : mouse.defaults());
	    return mouse;
	  };
	  var watch = function() {
	    if (!inited)
	      return mouse.init();
	    if (!parent || parent.contains(mouse.el, BASE))
	      return;
	    var el,
	        ar = mouse.ar;
	    switch (ar.getAttribute(options.prefix + 'policy')) {
	      default:
	      case 'closest':
	        el = mouse.closestInArea();
	        break;
	      case 'defaults':
	        el = mouse.defaultsInArea();
	        break;
	      case 'hovered':
	        el = mouse.hovered();
	        break;
	      case 'circular':
	        el = mouse.circular();
	        break;
	    }
	    mouse.focus(el, null, true);
	  };
	  return mouse;
	}
	module.exports = Mickey;


/***/ },
/* 1 */
/***/ function(module, exports, __webpack_require__) {

	"use strict";
	function nil() {
	  return {
	    x: 0,
	    y: 0
	  };
	}
	function vec(a, b) {
	  return {
	    x: b.x - a.x,
	    y: b.y - a.y
	  };
	}
	function dist1(a, b) {
	  return norm2(vec(a, b));
	}
	function distp(a, b, dir) {
	  return norm1(proj(vec(a, b), dir));
	}
	function norm1(a) {
	  return Math.sqrt(a.x * a.x + a.y * a.y);
	}
	function norm2(a) {
	  return Math.abs(a.x) + Math.abs(a.y);
	}
	function opp(a) {
	  return {
	    x: -a.x,
	    y: -a.y
	  };
	}
	function dot(a, b) {
	  return a.x * b.x + a.y * b.y;
	}
	function pointReflect(a, c) {
	  return {
	    x: 2 * c.x - a.x,
	    y: 2 * c.y - a.y
	  };
	}
	function axisReflect(box, dir, center) {
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
	function proj(a, b) {
	  var d = dot(a, b);
	  return {
	    x: d * b.x,
	    y: d * b.y
	  };
	}
	module.exports = {
	  nil: nil,
	  vec: vec,
	  dist1: dist1,
	  distp: distp,
	  norm1: norm1,
	  opp: opp,
	  dot: dot,
	  pointReflect: pointReflect,
	  axisReflect: axisReflect
	};


/***/ },
/* 2 */
/***/ function(module, exports, __webpack_require__) {

	"use strict";
	var $__0 = __webpack_require__(1),
	    vec = $__0.vec,
	    dot = $__0.dot;
	function createBox(el, overlap) {
	  if (!el)
	    return;
	  var r = _.extend({}, el.getBoundingClientRect());
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
	function Box(el, r) {
	  this.el = el;
	  this._r = r;
	}
	Box.prototype.contains = function(pos, base) {
	  var c = this.center();
	  var v = vec(c, this.bound(base.down));
	  var h = vec(c, this.bound(base.right));
	  var x = vec(c, pos);
	  return (2 * Math.abs(dot(v, x)) <= this._r.height && 2 * Math.abs(dot(h, x)) <= this._r.width);
	};
	Box.prototype.center = function() {
	  return {
	    x: this._r.left + this._r.width / 2,
	    y: this._r.top + this._r.height / 2
	  };
	};
	Box.prototype.bound = function(d) {
	  return {
	    x: this._r.left + this._r.width * (1 + d.x) / 2,
	    y: this._r.top + this._r.height * (1 + d.y) / 2
	  };
	};
	module.exports = {
	  Box: Box,
	  createBox: createBox
	};


/***/ },
/* 3 */
/***/ function(module, exports, __webpack_require__) {

	"use strict";
	module.exports = function DOMObserver(target, fn) {
	  var obs;
	  if (window.MutationObserver != null) {
	    obs = new MutationObserver(fn);
	    obs.observe(target, {
	      attributes: false,
	      childList: true,
	      characterData: true,
	      subtree: true
	    });
	  } else {
	    fn = _.debounce(fn, 0);
	    target.addEventListener('DOMSubtreeModified', fn);
	    obs = {disconnect: function() {
	        target.removeEventListener('DOMSubtreeModified', fn);
	      }};
	  }
	  return obs;
	};


/***/ },
/* 4 */
/***/ function(module, exports, __webpack_require__) {

	"use strict";
	function $first(el, selector) {
	  return el.querySelector(selector);
	}
	function $find(el, selector) {
	  return _.toArray(el.querySelectorAll(selector));
	}
	function $addClass(el, cl, add) {
	  if (!el || add === false) {
	    return;
	  }
	  el.classList.add(cl);
	}
	function $rmvClass(el, cl, rem) {
	  if (!el || rem === false) {
	    return;
	  }
	  el.classList.remove(cl);
	}
	module.exports = {
	  $first: $first,
	  $find: $find,
	  $addClass: $addClass,
	  $rmvClass: $rmvClass
	};


/***/ }
/******/ ])
});
