'use strict';

angular.module('myApp.Authentication', [])

.controller('LoginController',
    ['$scope', '$rootScope', '$location', '$window', 'AuthenticationService',
    function ($scope, $rootScope, $location, $window, AuthenticationService) {
        // reset login status
        //AuthenticationService.ClearCredentials();

        $scope.login = function () {
            $scope.dataLoading = true;
            
            AuthenticationService.Login($scope.username, $scope.password, function (response) {
            	//console.log("AuthenticationService.Login: " + response.userID);
                if (response) {
					//console.log("AuthenticationService.Login: has response");
                    AuthenticationService.SetCredentials(response);
                    //$window.location.path = '/';
                    //$window.location.reload();
                    $location.path('/timeline');
                    //$route.reload();
                } else {
                    $scope.error = response.message;
                    $scope.dataLoading = false;
                }
            });
        };
    }])

.config(['$routeProvider', function($routeProvider) {
        $routeProvider.when('/login', {
            controller: 'LoginController',
            templateUrl: 'modules/authentication/login.html',
            hideMenus: true
        });
}]);