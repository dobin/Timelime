'use strict';

angular.module('myApp.User')
    .factory("UserService", ['$http',
        function($http) {
            var serviceBase = 'services/'

            var obj = {};

            obj.getUserInfo = function(userID) {
                return $http.get(serviceBase + 'user?id=' + userID);
            }

            obj.addUser = function(user) {
                return $http.post(serviceBase + 'insertUser', user).then(function(result) {
                    return result;
                });
            }

            return obj;
        }
    ])

    .config(['$routeProvider', function($routeProvider) {
        $routeProvider.when('/user', {
            title : 'User',
            templateUrl : 'modules/user/user.html',
            controller : 'UserViewCtrl'
        });
    }])

;