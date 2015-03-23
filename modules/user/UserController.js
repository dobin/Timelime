'use strict';

angular.module('myApp.User', ['ngRoute'])

    .controller('UserViewCtrl', function($scope, $rootScope, $location, $routeParams) {
        $scope.test = "AAA";
    })

;