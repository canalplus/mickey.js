(function(global) {
  'use strict';

  if (!global._) {
    throw new Error('autonav: lodash or underscore is required');
  }

  var VECS = {
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

  var $area = '[data-area]';
  var $href = '[data-href],[data-click],[data-limit]';
  var $selected = '[data-selected]';

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

  function reflect(a, c) {
    return { x: 2 * c.x - a.x, y: 2 * c.y - a.y };
  }

  // project a over b where b has norm 1
  function proj(a, b) {
    var d = dot(a, b);
    return { x: d * b.x, y: d * b.y };
  }

  function dataSorter(name, ord) {
    return function(a, b) {
      var sA = !_.isUndefined(a.dataset[name]);
      var sB = !_.isUndefined(b.dataset[name]);
      if (sA && !sB) { return  ord; }
      if (!sA && sB) { return -ord; }
      return 0;
    };
  }

  var limitLast     = dataSorter('limit', 1);
  var selectedFirst = dataSorter('selected', -1);

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
    var v = vec(c, this.bound(VECS.down));
    var h = vec(c, this.bound(VECS.right));
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

  function Mouse(parent, options) {
    var locked  = false;

    options = _.defaults(options || {}, {
      hoverClass: 'hover',
      areaClass:  'hover',
      overlap: 0,
      pos: null
    });

    var mouse = {
      pos: options.pos || nil(),
      el: null,
      ar: null,
    };

    function keyListener(ev) {
      var k = KEYS[ev.keyCode];
      if (k === 'click') {
        mouse.click();
      } else if (k) {
        mouse.move(k);
      }
    }

    function dispatchEvent(el, type) {
      if (!el) { return; }
      var ev = document.createEvent('MouseEvents');
      var x = mouse.pos.x;
      var y = mouse.pos.y;
      ev.initMouseEvent(type, true, true, window, 0, x, y, x, y, false, false, false, false, 0, null);
      el.dispatchEvent(ev);
    }

    function isArea(el) {
      return !!el && (!_.isUndefined(el.dataset.area) || el === parent);
    }

    function isLimit(el) {
      return !!el && !_.isUndefined(el.dataset.limit);
    }

    function checkLimit(el, dir) {
      return !!dir && isLimit(el) && el.dataset.limit === dir;
    }

    function isSelected(el) {
      return !!el && !_.isUndefined(el.dataset.selected);
    }

    function findClosest(pos, els, dir, area) {
      var v  = dir ? VECS[dir] : nil();
      var v_ = opp(v);

      if (pos instanceof Box) {
        pos = pos.bound(v);
      }

      var halfSpace = function(p) {
        return dot(vec(pos, p), v) >= -options.overlap;
      };

      var res = _.map(_.filter(_.compact(_.map(els, createBox)), function(b) {
        return halfSpace(area ? b.bound(v_) : b.center());
      }), function(b) {
        return {
          el:   b.el,
          proj: distp(pos, b.bound(v_), v),
          dist: dist1(pos, b.bound(v_))
        };
      });

      res = _.first(_.sortBy(res, ['proj', 'dist']));
      return res && res.el;
    }

    function findHovered(pos, els) {
      var box = createBox(findClosest(pos, els));
      if (box && box.contains(pos)) {
        return box.el;
      }
    }

    function findAreas() {
      var els = $find(parent, $area);
      if (!els.length) { return [parent]; }
      return _.some(els, isSelected) ?
        els.sort(selectedFirst) :
        els;
    }

    function allSelectable(el, dir) {
      var els = $find(el, el.dataset.area || $href);
      var lim = _.some(els, isLimit);
      if (lim) { els.sort(limitLast); }
      if (lim && dir) {
        return _.filter(els, function(el) {
          return !isLimit(el) || checkLimit(el, dir);
        });
      } else {
        return els;
      }
    }

    function firstSelectable(el) {
      return isArea(el) && allSelectable(el)[0];
    }

    function fallback(dir) {
      return mouse.focus(mouse.closest() || findAreas()[0], dir, true);
    }

    mouse.focus = function(el, dir, fallback) {
      if (_.isString(el)) {
        el = parent.querySelector(el);
      }

      if (isArea(el)) {
        return mouse.focus(firstSelectable(el));
      }

      var box = createBox(el);
      if (!box) { return false; }

      var newEl = el;
      var newAr = mouse.area(newEl);
      var memEl = mouse.el;
      var memAr = mouse.ar;
      var newLimit = isLimit(newEl);

      if (newAr !== memAr) {
        mouse.ar = newAr;
        $rmvClass(memAr, options.areaClass);
        $addClass(newAr, options.areaClass);
      }

      if (newEl !== memEl &&
         (newAr !== memAr || !newLimit || fallback)) {
        mouse.pos = box.center();
        mouse.el = newEl;
        $rmvClass(memEl, options.hoverClass);
        $addClass(newEl, options.hoverClass, !newLimit);
        dispatchEvent(memEl, 'mouseout');
        dispatchEvent(newEl, 'mouseover');
      }

      if (newLimit && checkLimit(newEl, dir)) {
        mouse.click(el);
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
        throw new Error('mouse: locked');
      }

      var boxEl = createBox(mouse.el);
      if (!boxEl) {
        if (!fallback(dir)) { throw new Error('mouse: cannot move'); }
        return;
      }

      // find the closest element in the same area as the current focused
      // element
      var curAr = mouse.area();
      var newEl = findClosest(boxEl, allSelectable(curAr, dir), dir);
      if (newEl) {
        return mouse.focus(newEl, dir);
      }

      var zidx = +curAr.dataset.zIndex;
      if (zidx > 0) {
        return;
      }

      // if no close element has been found, we may have to search for the
      // closest area, or check for a limit element
      var boxAr = createBox(curAr);
      var newAr = findClosest(boxAr, findAreas(), dir, true);
      if (!newAr) {
        if (checkLimit(mouse.el, dir)) {
          mouse.click();
        }
        return;
      }

      var els = allSelectable(newAr);
      if (!_.isUndefined(curAr.dataset.track)) {
        curAr.dataset.position = JSON.stringify(mouse.pos);
      }
      if (!_.isUndefined(newAr.dataset.position)) {
        newEl = findClosest(JSON.parse(newAr.dataset.position), els);
      }

      if (!newEl) {
        newEl = els[0];
      }

      return mouse.focus(newEl, dir);
    };

    mouse.click = function(el) {
      if (locked) {
        throw new Error('mouse: locked');
      }
      el = el || mouse.el;
      if (!parent.contains(el)) {
        throw new Error('mouse: cannot click on non visible element');
      }
      if (!el && !fallback()) {
        throw new Error('mouse: cannot click');
      }
      dispatchEvent(el, 'click');
    };

    mouse.area = function(el) {
      el = el || mouse.el;
      while (el && el !== parent) {
        el = el.parentNode;
        if (isArea(el)) { return el; }
      }
      return parent;
    };

    mouse.closest = function(ar) {
      var els = _.flatten(_.map(ar ? [ar] : findAreas(), allSelectable));
      return findClosest(mouse.pos, els);
    };

    mouse.hovered = function(ar) {
      var els = _.flatten(_.map(ar ? [ar] : findAreas(), allSelectable));
      return findHovered(mouse.pos, els);
    };

    mouse.circular = function(ar) {
      ar = ar || mouse.ar;
      return findClosest(reflect(mouse.pos, createBox(ar).center()), allSelectable(ar));
    };

    mouse.bind = function() {
      mouse.unbind();
      parent.addEventListener('DOMSubtreeModified', watch);
      if (!options.noListener) {
        document.addEventListener('keydown', keyListener);
      }
    };

    mouse.unbind = function() {
      parent.removeEventListener('DOMSubtreeModified', mouse.init);
      parent.removeEventListener('DOMSubtreeModified', watch);
      document.removeEventListener('keydown', keyListener);
    };

    mouse.block = function() {
      locked = true;
    };

    mouse.unblock = function() {
      locked = false;
    };

    mouse.clear = function() {
      mouse.unbind();
      mouse.pos = nil();
      mouse.el = null;
      mouse.ar = null;
      parent = null;
      locked = false;
    };

    mouse.update = function() {
      mouse.focus(mouse.closest(mouse.ar));
    };

    mouse.init = function() {
      var el;
      if (options.position) {
        el = mouse.hovered();
      } else {
        el = firstSelectable(findAreas()[0]);
      }

      mouse.unbind();
      if (mouse.focus(el)) {
        mouse.bind();
      } else {
        parent.addEventListener('DOMSubtreeModified', mouse.init);
      }

      return mouse;
    };

    var watch = _.debounce(function() {
      if (parent.contains(mouse.el)) { return; }
      var el, ar = parent.contains(mouse.ar) && mouse.ar;
      switch(ar && ar.dataset.navPolicy) {
      default:
      case 'closest':  el = mouse.closest(ar);   break;
      case 'hovered':  el = mouse.hovered(ar);   break;
      case 'circular': el = mouse.circular(ar);  break;
      case 'first':    el = firstSelectable(ar); break;
      }
      mouse.focus(el, null, true);
    }, 0);

    return mouse;
  }

  global.Mouse = Mouse;

})(this);
