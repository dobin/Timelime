'use strict';

angular.module('myApp.User', ['ngRoute'])
    .controller('UserViewCtrl', function($scope, $rootScope, $location, $routeParams, UserService) {

    })

    .controller('userChangePasswordCtrl', function($scope, $rootScope, $location, $routeParams, UserService) {

    })

    .controller('userAddUserCtrl', function($scope, $rootScope, $location, $routeParams, UserService) {
        $scope.user = {};

        $scope.addUser = function() {
            console.log(UserService);
            console.log($scope.user);

            UserService.addUser($scope.user);

        }
    })
;