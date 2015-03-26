'use strict';

angular.module('myApp.timeline', ['ngRoute'])

    .config(['$routeProvider', function($routeProvider) {
        $routeProvider.when('/timeline', {
            title : 'Timeline',
            templateUrl : 'modules/timeline/timeline.html',
            controller : 'timelineListCtrl',
            resolve : {
                data: function($route, services) {
                    return services.getLinks();
                },
                topics: function(TopicServices, $route) {
                    return TopicServices.getTopics();
                }
            }
        })
        .when('/timeline/:userID', {
            title : 'Timeline',
            templateUrl : 'modules/timeline/timeline.html',
            controller : 'timelineListCtrl',
            resolve : {
                data: function($route, services) {
                    var userID = $route.current.params.userID;
                    return services.getLinksForUser(userID);
                },
                topics: function(TopicServices, $route) {
                    var userID = $route.current.params.userID;
                    return TopicServices.getTopicsForUser(userID);
                }
            }
        })
        .when('/timeline/:userID/:topicID', {
            title : 'Timeline',
            templateUrl : 'modules/timeline/timeline.html',
            controller : 'timelineListCtrl',
            resolve : {
                data: function($route, services) {
                    var topicID = $route.current.params.topicID;
                    return services.getLinksForTopic(topicID);
                },
                topics: function(TopicServices, $route) {
                    var userID = $route.current.params.userID;
                    return TopicServices.getTopicsForUser(userID);
                }
            }
        });
    }])

    .filter('customUserDateFilter', function($filter) {
        return function(links, tagString) {
            var filtered = [];
            var searchTags = tagString.split(/ *, */);

            // Remove empty items
            for(var i=0; i<searchTags.length; i++) {
                    if (searchTags[i] == "") {
                            searchTags.splice(i, 1);
                    }
            }

            if(typeof links != 'undefined' && typeof tagString != 'undefined') {

                angular.forEach(links, function(link) {
                    var allTagsFound = true;
                    angular.forEach(searchTags, function(searchTag) {
                        var tagFound = false;

                        // Check if tag we search exists in link
                        angular.forEach(link.tags, function(tag) {
                            if (tag.text == searchTag) {
                                tagFound = true;
                            }
                        });

                        if (! tagFound) {
                            allTagsFound = false;
                        }
                    });

                    if (allTagsFound) {
                        filtered.push(link);
                    }
                });
            }

            return filtered;
        }
    })

    .controller('timelineListCtrl', function($scope, $http, $routeParams, $filter, $location, data, services, ngTableParams, AuthenticationService, ReadstatusService, UserService, TopicServices, topics, Reddit) {
        var linkID = $routeParams.linkID;
        $scope.user = AuthenticationService.getCurrentUser();

        $scope.links = data.data;
        $scope.topics = topics.data;
        $scope.readStats = ReadstatusService.getReadstats();

        // For topic search
        $scope.topic = {};
        $scope.readStat = {};

        var initialSearchStatus = $location.search().readStatus;
        $scope.readStat.selected = $scope.readStats[initialSearchStatus];


        $scope.busy = false;
        $scope.after = '';
        $scope.items = [];

        $scope.reddit = new Reddit();

        // Check if its ours
        var selectedUserID = $routeParams.userID;
        $scope.dateFormat = 'dd.MM.yyyy';
        if (selectedUserID) {
            UserService.getUserInfo(selectedUserID).then(function (user) {
                $scope.selectedUser = user.data;
            });

            if (selectedUserID == AuthenticationService.getCurrentUserID()) {
                $scope.isMy = true;
                $scope.dateFormat = 'HH:mm dd.MM.yyyy';
            } else {
                $scope.isMy = false;

            }
        }

        // Check if a topic is selected
        var selectedTopicID = $routeParams.topicID;
        if(selectedTopicID) {
            var found = $filter('filter')($scope.topics, { topicID: selectedTopicID}, true);
            $scope.topic.selected = found[0];
        }

        // Check if a link is selected
        if (linkID) {
            /*
             var linkParam = $filter('filter')($scope.links, function (d) {
             return d.linkID == linkID;
             })[0];*/
            for(var i=0; i<$scope.links.length; i++) {
                if (angular.equals($scope.links[i].linkID, linkID)) {
                    $scope.selectedLink = $scope.links[i];
                    $scope.links[i].isSelected = true;
                    ///$scope.viewLink(links[i]);
                }
            }
        }

        $scope.reloadTable = function() {
            var path = "";
            if ($scope.topic.selected) {
                path += "/timeline/" + selectedUserID + "/" + $scope.topic.selected.topicID;
            } else {
                path += "/timeline/" + selectedUserID;
            }

            //if ($scope.readStatusFilter != null) {
                //$location.path(path).search('readStatus', $scope.readStatusFilter.id);
            if ($scope.readStat != null && $scope.readStat.selected != null) {
                $location.path(path).search('readStatus', $scope.readStat.selected.id);
            } else {
                $location.path(path).search('');
            }

            $scope.tableParams.reload();
        }


        $scope.changeLinkReadStatus = function(link) {
            var rs = parseInt(link.readStatus);
            rs++;
            rs = rs % 4;
            link.readStatus = rs.toString();

            // Readstats
            var readStats = ReadstatusService.getReadstatusTextFor(rs);
            link.readStatusTextRo = readStats;

            services.updateLink(link.linkID, link);
        };

        $scope.viewLink = function(link) {
            if ($scope.selectedLink == link) {
                $scope.selectedLink = null;
                return;
            } else {
                $scope.selectedLink = link;
            }
        }

        $scope.removeTopicFilter = function() {
            $scope.topic.selected = undefined;
            $scope.reloadTable();
        }


        $scope.nextPage = function() {
            if ($scope.busy) return;
            $scope.busy = true;

            services.getLinksAfter($scope.after).success(function (data) {
                //console.log(data);
                for (var i = 0; i < data.length; i++) {
                    //this.items.push(items[i].data);
                    $scope.items.push(data[i]);
                }

                console.log($scope.items);

                $scope.after = $scope.items[$scope.items.length - 1].linkID;
                $scope.busy = false;
            });
        }
    })

.factory('Reddit', function($http, services) {
        var Reddit = function() {
            this.items = [];
            this.busy = false;
            this.after = '';
        };

        Reddit.prototype.nextPage = function() {
            if (this.busy) return;
            this.busy = true;

            var url = "/timelime/services/links?after=" + this.after + "&jsonp=JSON_CALLBACK";
            $http.jsonp(url).success(function(data) {
                console.log(data);

                var items = data.children;

                var x;
                for (var i = 0; i < items.length; i++) {
                    x = items[i].dateAdded.sec;
                    services.processLink(items[i]);
                    this.items.push( items[i] );
                }
                this.after = x;
                this.busy = false;
            }.bind(this));
        };

        return Reddit;
});
;

