'use strict';


angular.module('myApp.Readstatus', ['ngRoute'])
    .config(['$routeProvider', function($routeProvider) {
        $routeProvider.when('/readstatus', {
            title : 'Readstatus',
            templateUrl : 'modules/topics/readstatus.html',
            controller : 'readstatusListCtrl'
        });
    }])

    .factory("ReadstatusService", ['$http',
        function($http) {
            var obj = {};

            var readStats = [{
                id: '0',
                text: 'Not read'
            },{
                id: '1',
                text: 'Started'
            },{
                id: '2',
                text: 'Finished'
            },{
                id: '3',
                text: 'Todo'
             }];

            obj.getReadstats = function() {
                return readStats;
            }

            obj.getReadstatusTextFor = function(readStatus) {
                return readStats[readStatus].text
            }

            return obj;
        }])
    .controller('readstatusListCtrl', function($scope, TopicServices) {

    });
