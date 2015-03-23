// types.js
import { define } from "../node_modules/flowcheck/assert";

// extend Types

// integer
window &&	(window.integer = window.integer || define('integer', function (x) {
	return x !== NaN && typeof x === 'number' && x.valueOf() === parseInt(x.valueOf());
}));
