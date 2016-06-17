const gulp = require('gulp');
const jscs = require('gulp-jscs');
const config = {
  src: '**/*.js',
};

gulp.task('lint', function linting() {
  return gulp.src(config.src)
    .pipe(jscs())
    .pipe(jscs.reporter());
});

gulp.task('development', ['lint'], function () {
  gulp.watch(config.src, ['lint']);
});

/*gulp.task('default', ['lint']);*/
