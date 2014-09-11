
// creates an observer instance
module.exports = function observer(target, fn) {
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
};
