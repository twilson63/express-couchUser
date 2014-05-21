var path = require('path');
var src = path.join(__dirname, 'index.js');
module.exports = function(grunt) {
  grunt.initConfig({
    clean: ['coverage'],
    jshint: {
      files: src
    },
    mochaTest: {
      test: {
        options: {
          reporter: 'spec'
        },
        src: ['test/**/*.js']
      }
    },
    watch: {
      scripts: {
        files: 'index.js',
        tasks: ['jshint'],
        options: {
          interrupt: true
        }
      },
      tests: {
        files: ['test/**/*.js'],
        tasks: ['jshint', 'mochaTest'],
        options: {
          interrupt: true
        }
      }
    },
    bump: {
      options: {
        files: ['package.json'],
        updateConfigs: [],
        commit: true,
        commitMessage: 'Release v%VERSION%',
        commitFiles: ['package.json'], // '-a' for all files
        createTag: true,
        tagName: 'v%VERSION%',
        tagMessage: 'Version %VERSION%',
        push: true,
        pushTo: 'origin',
        gitDescribeOptions: '--tags --always --abbrev=1 --dirty=-d' // options to use with '$ git describe'
      }
    },
    mocha_istanbul: {
      coverage: {
        src: 'test',
        options: {  
          coverageFolder: '/coverage',
          mask: '*Spec.js',
          reportFormats: ['html']
        }
      }
    }
  });
  grunt.loadNpmTasks('grunt-contrib-clean');
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-bump');
  grunt.loadNpmTasks('grunt-mocha-test');
  grunt.loadNpmTasks('grunt-mocha-istanbul')
  
  grunt.registerTask('default', ['jshint']);
  grunt.registerTask('testCoverage', ['clean', 'mocha_istanbul:coverage']);

}

