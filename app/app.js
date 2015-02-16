'use strict'

var app = angular.module('myApp', [ 
	'ngRoute', 
	'ngTable',
	'ngTagsInput', 
	'myApp.Authentication', 
	'myApp.Home',
	'myApp.timeline',
	'myApp.topics', 
	'myApp.links',
	'myApp.tags',
    'myApp.Readstatus',
    'myApp.about',
	'ngCookies']);

// declare modules - WHY
angular.module('myApp.Authentication', []);
angular.module('myApp.Home', []);

app.run(['$location', '$rootScope', 'AuthenticationService', function($location, $rootScope, AuthenticationService) {
	$rootScope.$on('$routeChangeSuccess', function(event, current, previous) {
		//$rootScope.title = current.$$route.title;
		$rootScope.title = current.title;
	});

    $rootScope.$on("$routeChangeStart", function (event, next, current) {
        if (! AuthenticationService.isLoggedin()) {
            if (next.templateUrl === "modules/link/edit-link.html") {
                $location.path("/login");
            }
            if (next.templateUrl === "modules/link/add-link-bookmarklet.html") {
                $location.path("/login");
            }
            if (next.templateUrl === "modules/topics/edit-topic.html") {
                $location.path("/login");
            }
        }

        //if(! AuthenticationService.isLoggedin()) {
        //    $location.path('/login');
        //}
    });
}]);

// Index
app.controller('indexCtrl', function($scope, services, AuthenticationService) {
	AuthenticationService.tryCookie();
    $scope.user = AuthenticationService.getCurrentUser();
});


app.config(['$routeProvider', function($routeProvider) {
	$routeProvider.otherwise({
		redirectTo : '/timeline'
	});
}]);

app.config(function($httpProvider) {
    $httpProvider.interceptors.push(['$q', '$location', '$rootScope', function ($q, $location, $rootScope) {
        return {
            'request': function (config) {
                config.headers = config.headers || {};


                ///if (AuthenticationService.isLoggedin()) {
                if ($rootScope.globals) {
                    config.headers.Authorization = $rootScope.globals.currentUser.token;
                    ///config.headers.Authorization = 'Bearer ' + AuthenticationService.getUserData().token;
                }

                //if ($localStorage.token) {
                    //config.headers.Authorization = 'Bearer ' + $localStorage.token;

                ///}
                return config;
            },
            'responseError': function (response) {
                if (response.status === 401 || response.status === 403) {
                    $location.path('/login');
                }
                return $q.reject(response);
            }
        };
    }])
});
