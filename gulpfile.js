/*jshint node:true */
'use strict';

var jshint = require('gulp-jshint');
var concat = require('gulp-concat');
var uglify = require('gulp-uglify');
var gulp   = require('gulp');

var paths = {
  js:'./src/*.js'
};

gulp.task('lint', function() {
  return gulp.src(paths.js)
    .pipe(jshint())
    .pipe(jshint.reporter('default'));
});

gulp.task('compress', function() {
  gulp.src(paths.js)
    .pipe(uglify())
    .pipe(concat('mickey.min.js'))
    .pipe(gulp.dest('dist'));
});

gulp.task('default', ['lint', 'compress']);
