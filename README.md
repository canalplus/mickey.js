# IRMouse

**IRMouse** is a Javascript library for building webapps used with a remote control or keyboard layout, and without a mouse or pointer device.

Web UIs generally rely on DOM and click events. When building webapps running on embedded devices, accessible through remote control, you can only treat keypress events, which make it very difficult to build interoperable and stateless components.

IRMouse offers a DOM abstraction, to build more generic and simple applications that can be used with a remote control or a mouse.

## Examples

```html
<body>
    <menu data-nav-area="ul > li">
        <ul>
            <li>item 1</li>
            <li>item 2</li>
            <li>item 3</li>
            <li>item 4</li>
        </ul>
    </menu>

    <section data-nav-area=".box,.limit">
        <div class="limit" data-nav-limit="left">Previous Page</div>
        <div class="box">Box1</div>
        <div class="box">Box2</div>
        <div class="box">Box3</div>
        <div class="box">Box4</div>
        <div class="limit" data-nav-limit="right">Next Page</div>
    </section>
</body>

<script>
new Mouse(document.body).init();
</script>
```

See the `examples` directory for examples using Backbone.

## Installation

You can simply download the `src/mouse.js` file, or use bower if you prefer.

```shell
bower install --save irmouse
```

```html
<script src="bower_components/irmouse/src/mouse.js"></script>
```
