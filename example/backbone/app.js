var app = app || {};

(function() {
  'use strict';

  var ScrollDown = {
    initialize: function() {
      this.from = 0;
    },
    events: {
      'click li.item': function() {
        app.router.navigate(this.navTo, { trigger: true });
      },
      'click #go-down': function() {
        this.from++;
        this.renderList();
      },
      'click #go-up': function() {
        if (this.from > 0) {
          this.from--;
          this.renderList();
        }
      }
    },
    render: function() {
      this.el.innerHTML = [
        '<div data-nav-area=".item,#go-up,#go-down">',
        '  <h1>' + this.name + '</h1>',
        '  <p data-nav-limit="top" id="go-up">go up</p>',
        '  <ul></ul>',
        '  <p data-nav-limit="bottom" id="go-down">go down</p>',
        '</div>'
      ].join('');
      this.renderList();
      return this;
    },
    renderList: function() {
      var name = this.name;
      this.el.querySelector('ul').innerHTML = _.range(this.from, this.from + this.length).map(function(i) {
        return '<li class="item">item ' + name + ' ' + i + '</li>';
      }).join('');
    },
  };

  var FooView = Backbone.View.extend(_.extend({
    name:  'foo',
    navTo: 'bar',
    length: 10,
  }, ScrollDown));

  var BarView = Backbone.View.extend(_.extend({
    name:  'bar',
    navTo: 'foo',
    length: 10,
  }, ScrollDown));

  var Router = Backbone.Router.extend({
    routes: {
      '':    function() { this.navigate('foo', { trigger: true }); },
      'foo': function() { this.loadView(new FooView({ el: document.querySelector('#main') })); },
      'bar': function() { this.loadView(new BarView({ el: document.querySelector('#main') })); },
    },

    loadView : function(view) {
      if (this.mouse) {
        this.mouse.clear();
      }
      if (this.view) {
        this.view.undelegateEvents();
        this.view.stopListening();
      }
      this.view  = view.render();
      this.mouse = new Mickey(document.querySelector('#main')).init();
    }
  });

  document.addEventListener('DOMContentLoaded', function() {
    app.router = new Router();
    Backbone.history.start();
  });

})();
