'use strict';


angular.module('myApp.User', ['ngRoute'])
    .config(['$routeProvider', function($routeProvider) {
        $routeProvider.when('/users', {
            title : 'Users',
            templateUrl : 'modules/user/user.html',
            controller : 'UserListCtrl'
        });
    }])

    .factory("UserService", ['$http',
        function($http) {
            var serviceBase = 'services/'

            var obj = {};

            obj.getUserInfo = function(userID) {
                return $http.get(serviceBase + 'user?id=' + userID);
            }

            return obj;
        }])

;