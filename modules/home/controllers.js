'use strict';

angular.module('myApp.Home', ['ngRoute'])
    .config(['$routeProvider', function($routeProvider) {
        $routeProvider.when('/home', {
            title : 'Home',
            templateUrl : 'modules/home/home.html',
            controller : 'HomeController'
        })
    }])

.controller('HomeController', ['$scope', 'services',
    function ($scope, services) {
        services.getUsers().then(function(data) {
            $scope.users = data.data;
        });
    }
]);