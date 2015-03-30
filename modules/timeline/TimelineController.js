'use strict';

angular.module('myApp.timeline', ['ngRoute'])

    .config(['$routeProvider', function($routeProvider) {
        $routeProvider.when('/timeline', {
            title : 'Timeline',
            templateUrl : 'modules/timeline/timeline.html',
            controller : 'timelineListCtrl',
            resolve : {
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

    .controller('timelineListCtrl', function($scope, $http, $routeParams, $filter, $location, services, ngTableParams, AuthenticationService, ReadstatusService, UserService, TopicServices, topics, Reddit) {
        $scope.user = AuthenticationService.getCurrentUser();

        $scope.topics = topics.data;
        $scope.readStats = ReadstatusService.getReadstats();

        // For topic search
        $scope.topic = {};
        $scope.readStat = {};
        $scope.filter = {
            tags: '',
            search: ''
        };

        $scope.reddit = new Reddit();

        // Readstatus
        var initialSearchStatus = $location.search().readStatus;
        $scope.readStat.selected = $scope.readStats[initialSearchStatus];

        // Search
        $scope.filter.search = $location.search().search;

        // tags
        $scope.filter.tags = $location.search().tags;


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

        // Check if a link is selected (details)
        var linkID = $routeParams.linkID;
        if (linkID) {
            for(var i=0; i<$scope.links.length; i++) {
                if (angular.equals($scope.links[i].linkID, linkID)) {
                    $scope.selectedLink = $scope.links[i];
                    $scope.links[i].isSelected = true;
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
                $location.path(path).search('readStatus', '');
            }

            if ($scope.filter.search != null && $scope.filter.search != "") {
                $location.path(path).search('search', $scope.filter.search);
            } else {
                $location.path(path).search('search', '');
            }

            if ($scope.filter.tags != null && $scope.filter.tags != "") {
                $location.path(path).search('tags', $scope.filter.tags);
            } else {
                $location.path(path).search('tags', '');
            }

            console.log("ReloadTable");
            // Copy all search things
            //console.log($scope.topic);
            //console.log($scope.readStat.selected);

            //$scope.reddit.sett("aa");
            //$scope.reddit.search.topic = $scope.topic.selected.topicID;
            //$scope.reddit.search.readstatus = $scope.readStat.selected.id;
            //$scope.reddit.search.tags = $scope.tags;

            //$scope.tableParams.reload();
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
    })

.factory('Reddit', function($http, services) {
        var Reddit = function() {
            this.items = [];
            this.busy = false;
            this.after = '';
            this.shit = 'S1';

            this.search = {
                topic: '',
                readStatus: '',
                tags: []
            };
        };

        Reddit.prototype = {
            nextPage: function (topic, readStat, tags, search) {
                if (this.busy) return;
                this.busy = true;

                var topicID = '';
                var readStatID = '';

                if (topic.selected) {
                    topicID = topic.selected.topicID;
                }
                if (readStat.selected) {
                    readStatID = readStat.selected.id;
                }

                var url = "services/links?"
                    + "after=" + this.after
                    + "&topic=" + topicID
                    + "&readStatus=" + readStatID
                    + "&tags=" + tags
                    + "&search=" + search;

                 $http.get(url).success(function (data) {
                    var items = data;

                    var x;
                    for (var i = 0; i < items.length; i++) {
                        x = items[i].dateAdded.sec;
                        services.processLink(items[i]);
                        this.items.push(items[i]);
                    }
                    this.after = x;
                    this.busy = false;
                }.bind(this));
            }
        };

        return Reddit;
});
;

