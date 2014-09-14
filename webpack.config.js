/* jshint node:true */
var webpack = require("webpack");
var prefix = process.env.MICKEY_PREFIX;
if (prefix == null) prefix = "nav";

module.exports = {
  entry: "./src/mickey.js",
  output: {
    library: "Mickey",
    libraryTarget: "umd",
  },
  module: {
    loaders: [
      { test: /\.js$/, exclude: [/node_modules\/.*/], loader: "webpack-traceur" },
    ]
  },
  plugins: [
    new webpack.optimize.OccurrenceOrderPlugin(),
    new webpack.DefinePlugin({ "__DEV__": (process.env.MICKEY_ENV === "debug") }),
    new webpack.DefinePlugin({ "__PREFIX__": "\"" + prefix + "\"" })
  ],
};
