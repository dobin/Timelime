'use strict';

angular.module('myApp.topics')

 .factory("TopicServices", ['$http', function($http) {
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
        return $http.post(serviceBase + 'insertTopic', topic);
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
 }]);