'use strict';

angular.module('myApp.about', ['ngRoute'])
    .config(['$routeProvider', function($routeProvider) {
        $routeProvider.when('/about', {
            title: 'About',
            templateUrl: 'modules/about/about.html',
            controller: 'aboutCtrl'
        })
    }])

    .controller('aboutCtrl', [ '$scope', 'services', function($scope, services) {

    }])
;