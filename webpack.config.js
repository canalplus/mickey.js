/* jshint node:true */
var webpack = require("webpack");

module.exports = {
  entry: "./src/mickey.js",
  output: {
    library: "Mickey",
    libraryTarget: "umd",
  }
};
