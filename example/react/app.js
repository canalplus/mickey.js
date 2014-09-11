(function(React, Mickey) {

  var d = React.DOM;
  var mouse;

  var App = React.createClass({
    render: function() {
      return d.div(null, [
        d.h1(null, "foo"),
        ScrollDown({ length: 15 })
      ]);
    }
  });

  var ScrollDown = React.createClass({
    getInitialState: function() {
      return { from: 0 };
    },
    render: function() {
      var up = this.state.from;
      var to = this.state.from + this.props.length;
      var range = _.range(up, to);
      return d.div({ "data-nav-area": ".item,#go-up,#go-down" }, _.flatten([
        d.p({ id: "go-up", "data-nav-limit": "top", onClick: _.bind(this.scroll, this, -1) }, "go up"),
        d.ul(null, _.map(range, function(i) { return d.li({ className: 'item', key: i }, 'item' + i); })),
        d.p({ id: "go-down", "data-nav-limit": "bottom", onClick: _.bind(this.scroll, this, +1) }, "go down"),
      ]));
    },
    scroll: function(dir) {
      this.setState({ from: this.state.from + (dir || 1) });
    },
    componentDidUpdate: function() {
      mouse.update();
    }
  });

  document.addEventListener('DOMContentLoaded', function() {
    React.renderComponent(App(), document.getElementById('main'));
    mouse = new Mickey(document.getElementById('main'), { observer: _.noop }).init();
  });

})(window.React, window.Mickey);
