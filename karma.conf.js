module.exports = function(config) {
  config.set({
    frameworks: ['jasmine'],
    files: [
      'test/*_test.js',
    ],
    reporters: ['progress', 'coverage'],
    preprocessors: {
      'src/**/*.js': ['coverage'],
      'test/*_test.js': ['webpack'],
    },
    webpack: {
      mode: 'development',
    },
    browsers: ['jsdom'],
    singleRun: true,
  })
}
