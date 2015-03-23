//index.js
import "./types";
import Mickey from "./mickey";

window && !window.Mickey && (window.Mickey = Mickey);
