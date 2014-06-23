(function() {

  var ScrollDown = React.createClass({
    getInitialState: function() {
      return { from: 0, length: 10 };
    },
    render: function() {
      var up = this.state.from;
      var to = this.state.from + this.state.length;
      return React.DOM.ul(null, _.range(up, to).map(function(i) {
        return React.DOM.li({ className: 'item', onClick: _.bind(this.onClick, this) }, 'item' + i);
      }, this));
    },
    onClick: function() {
      this.setState({ from: this.state.from + 1 });
    }
  });

  document.addEventListener('DOMContentLoaded', function() {
    React.renderComponent(ScrollDown(), document.getElementById('main'));
    new Mickey(document.getElementById('main')).init();
  });

})();
