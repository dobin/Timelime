'use strict';
/*
angular.module('myApp.topics')

.factory("TopicServices", ['$http',
function($http) {
	var serviceBase = 'services/'
	var obj = {};
	
	
	// Topics
	obj.getTopics = function() {
		return $http.get(serviceBase + 'topics');
	}
	obj.getTopic = function(linkID) {
		return $http.get(serviceBase + 'topic?id=' + linkID);
	}

	obj.insertTopic = function(link) {
		return $http.post(serviceBase + 'insertTopic', link).then(function(results) {
			return results;
		});
	};

	obj.updateTopic = function(id, link) {
		return $http.post(serviceBase + 'updateTopic', {
			id : id,
			link : link
		}).then(function(status) {
			return status.data;
		});
	};

	obj.deleteTopic = function(id) {
		return $http.delete(serviceBase + 'deleteTopic?id=' + id).then(function(status) {
			return status.data;
		});
	};
	
	
	return obj;
}])
*/