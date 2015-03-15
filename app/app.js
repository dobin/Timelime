'use strict'

var app = angular.module('myApp', [ 
	'ngRoute', 
	'ngTable',
	'ngTagsInput',
    'ngSanitize',
    'ui.select',
    'ui.bootstrap',
	'myApp.Authentication', 
	'myApp.Home',
	'myApp.timeline',
	'myApp.topics', 
	'myApp.links',
	'myApp.tags',
    'myApp.Readstatus',
    'myApp.User',
    'myApp.about',
	'ngCookies']);

// declare modules - WHY
angular.module('myApp.Authentication', []);

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
app.filter('propsFilter', function() {
    return function(items, props) {
        var out = [];

        if (angular.isArray(items)) {
            items.forEach(function(item) {
                var itemMatches = false;

                var keys = Object.keys(props);
                for (var i = 0; i < keys.length; i++) {
                    var prop = keys[i];
                    var text = props[prop].toLowerCase();
                    if (item[prop].toString().toLowerCase().indexOf(text) !== -1) {
                        itemMatches = true;
                        break;
                    }
                }

                if (itemMatches) {
                    out.push(item);
                }
            });
        } else {
            // Let the output be the input untouched
            out = items;
        }

        return out;
    };
});

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
