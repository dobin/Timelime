'use strict';

angular.module('myApp.tags', ['ngRoute'])
.config(['$routeProvider', function($routeProvider) {
	$routeProvider.when('/tags', {
		title : 'Tags',
		templateUrl : 'modules/tags/tags.html',
		controller : 'tagListCtrl'
	}
 );
}])

.controller('tagListCtrl', function($scope, TagServices) {
	TagServices.getTags().then(function(data) {
		$scope.links = data.data;
	});
})

.factory("TagServices", ['$http',
function($http) {
	var serviceBase = 'services/'
	var obj = {};

	obj.getTags = function() {
	};
	
	obj.getTagsFor = function(linkID) {
		return $http.get(serviceBase + 'tags?linkID=' + linkID);
	};
	
	return obj;
}]);

;
