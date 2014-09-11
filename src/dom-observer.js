
// creates an observer instance
module.exports = function DOMObserver(target, fn) {
  var obs;
  if (window.MutationObserver != null) {
    obs = new MutationObserver(fn);
    obs.observe(target, { attributes: false, childList: true, characterData: true, subtree: true });
  } else {
    fn = _.debounce(fn, 0);
    target.addEventListener('DOMSubtreeModified', fn);
    obs = {
      disconnect() { target.removeEventListener('DOMSubtreeModified', fn); }
    };
  }
  return obs;
};
