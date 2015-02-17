'use strict';

angular.module('myApp.topics', ['ngRoute'])
.config(['$routeProvider', function($routeProvider) {
    $routeProvider.when('/topics', {
		title : 'Topics',
		templateUrl : 'modules/topics/topics.html',
		controller : 'topicListCtrl'
    });
    $routeProvider.when('/edit-topic/:topicID', {
        title : 'Topics',
        templateUrl : 'modules/topics/edit-topic.html',
        controller : 'topicEditCtrl'
    });
}])

.factory("TopicServices", ['$http',
function($http) {
	var serviceBase = 'services/'
	var obj = {};
	
	
	// Topics
	obj.getTopics = function() {
		return $http.get(serviceBase + 'topics');
	}

	obj.getTopic = function(topicID) {
		return $http.get(serviceBase + 'topic?id=' + topicID);
	}

    obj.getTopicsForUser = function(userID) {
        return $http.get(serviceBase + 'topicsForUser?userID=' + userID);
    }

	obj.insertTopic = function(topic) {
		return $http.post(serviceBase + 'insertTopic', topic).then(function(results) {
			return results;
		});
	};

	obj.updateTopic = function(id, topic) {
		return $http.post(serviceBase + 'updateTopic', {
			id : id,
            topic : topic
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
	
.controller('topicListCtrl', function($scope, TopicServices) {

	TopicServices.getTopics().then(function(data) {
		$scope.topics = data.data;
	});


})

.controller('topicEditCtrl', function($scope, $routeParams, $location, TopicServices, AuthenticationService) {
    //var topicID = ($routeParams.topicID) ? parseInt($routeParams.topicID) : 0;
        var topicID = $routeParams.topicID;

    TopicServices.getTopic(topicID).then(function(data) {
        $scope.topic = data.data;
    });
    var original = angular.copy($scope.topic);

    $scope.permissions = AuthenticationService.getPermissionList();

    $scope.isClean = function() {
        return angular.equals(original, $scope.topic);
    }

    $scope.deleteTopic = function(topic) {
        $location.path('/');
        if (confirm("Are you sure to delete topic number: " + $scope.topic.topicID) == true)
            services.deleteTopic(topic.topicID);
    };

    $scope.saveTopic = function(topic) {
        if (AuthenticationService.isLoggedin()) {

            $location.path('/');
            if (topicID <= 0) {
                TopicServices.insertTopic(topic);
            } else {
                TopicServices.updateTopic(topicID, topic);
            }
        } else {
            alert("Not logged in");
        }
    };
})

;
