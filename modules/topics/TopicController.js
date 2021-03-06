'use strict';

angular.module('myApp.topics', ['ngRoute'])
.config(['$routeProvider', function($routeProvider) {
    $routeProvider.when('/mytopics', {
		title : 'Topics',
		templateUrl : 'modules/topics/topics.html',
		controller : 'topicListCtrl'
    })
    .when('/edit-topic/:userID/:topicID', {
        title : 'Topics',
        templateUrl : 'modules/topics/edit-topic.html',
        controller : 'topicEditCtrl'
    })
    .when('/add-topic', {
        title : 'Topics',
        templateUrl : 'modules/topics/edit-topic.html',
        controller : 'topicEditCtrl'
    });
}])


.controller('topicListCtrl', function($scope, TopicServices, AuthenticationService) {
	TopicServices.getTopicsForUser(AuthenticationService.getCurrentUserID()).then(function(data) {
		$scope.topics = data.data;
	});
})


.controller('topicEditCtrl', function($scope, $routeParams, $location, TopicServices, AuthenticationService) {
    var topicID = $routeParams.topicID;

    TopicServices.getTopicsForUser(AuthenticationService.getCurrentUserID()).then(function(data) {
        $scope.topics = data.data;
    });

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

            // Todo: move to service or api
            if (topic.parentTopic) {
                var foundTopic = _.findWhere($scope.topics, {topicID: topic.parentTopic.topicID});
                topic.parentTopic.topicName = foundTopic.topicName;
            }

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
