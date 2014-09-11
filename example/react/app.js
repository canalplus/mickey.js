/** @jsx d */
(function(React, Mickey) {

  var d = React.DOM;
  var cx = React.addons.classSet;

  var MouseUpdateMixin = {
    componentDidUpdate() {
      mouse.update();
    }
  };

  var MouseInitMixin = {
    componentDidMount() {
      mouse.init();
    }
  };

  var App = React.createClass({
    mixins: [MouseInitMixin],
    getInitialState() {
      return { selected: [] };
    },
    onSelect(obj) {
      var prev = this.state.selected;
      var find = _.find(prev, obj);
      var next = find
        ? _.without(prev, find)
        : _.flatten([prev, obj]);
      this.setState({ selected: next });
    },
    render() {
      return (
        <div>
          <h1>{this.props.title}</h1>
          <ScrollDown length={10} values={this.props.values} selected={this.state.selected} onSelect={(x) => this.onSelect(x)}/>
          <SelectedItems values={this.state.selected}/>
        </div>
      )
    },
  });

  var ScrollDown = React.createClass({
    mixins: [MouseUpdateMixin],
    getInitialState() {
      return { pos: 0 };
    },
    scroll(dir) {
      var pos = this.state.pos + (dir || 1);
      var max = this.props.values.length - this.props.length;
      if (0 <= pos && pos <= max) this.setState({ pos });
    },
    render() {
      var pos  = this.state.pos;
      var vals = this.props.values.slice(pos, pos + this.props.length);
      var list = _.map(vals, obj => {
        var { key, val } = obj;
        var selected = !!_.find(this.props.selected, { key });
        return (
          <li className={cx({ item: true, selected })} onClick={() => this.props.onSelect(obj)} key={key}>{val}</li>
        )
      });

      return (
        <div data-nav-area=".item,[data-nav-limit]">
          <p onClick={() => this.scroll(-1)} data-nav-limit="top">go up</p>
          <ul>{list}</ul>
          <p onClick={() => this.scroll(+1)} data-nav-limit="bottom">go down</p>
        </div>
      );
    },
  });

  var SelectedItems = React.createClass({
    render() {
      return <span>{_(this.props.values).sortBy("key").pluck("val").join(', ')}</span>
    },
  });

  var values = _.range(0, 1000).map(i => ({ key: i, val: `item ${i}` }));
  var root = document.getElementById('main');

  // with react, we don't need on observer and update the mouse
  // when components are updated.
  var mouse = new Mickey(root, { observer: _.noop });
  React.renderComponent(<App title="foo" values={values}/>, root);

})(window.React, window.Mickey);
