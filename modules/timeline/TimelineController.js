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
    .filter('topicFilter', function($filter) {
        return function(links, topicFilter, readStatusFilter) {
            var filtered = [];

            angular.forEach(links, function(link) {
                if(topicFilter == null || link.topic.topicName === topicFilter.topicName) {
                    if(readStatusFilter == null || link.readStatus === readStatusFilter.id) {
                        filtered.push(link);
                    }
                }
            });

            return filtered;
        }
    })

    .controller('timelineListCtrl', function($scope, $http, $routeParams, $filter, $location, data, services, ngTableParams, AuthenticationService, ReadstatusService, UserService, TopicServices, topics) {
        var linkID = $routeParams.linkID;
        $scope.user = AuthenticationService.getCurrentUser();

        $scope.links = data.data;
        $scope.topics = topics.data;
        $scope.readStats = ReadstatusService.getReadstats();

        // For topic search
        $scope.topic = {};

        var initialSearchStatus = $location.search().readStatus;
        $scope.readStatusFilter = $scope.readStats[initialSearchStatus];

        // Check if its ours
        var selectedUserID = $routeParams.userID;
        $scope.dateFormat = 'dd.MM.yyyy';
        if (selectedUserID) {
            if (selectedUserID == AuthenticationService.getCurrentUserID()) {
                $scope.isMy = true;
                $scope.dateFormat = 'HH:mm dd.MM.yyyy';
            } else {
                $scope.isMy = false;
                UserService.getUserInfo(selectedUserID).then(function (user) {
                    $scope.selectedUser = user.data;
                });
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

        var data = data.data;
        $scope.tableParams = new ngTableParams({
            page: 1,            // show first page
            count: 10,          // count per page

/* Dont do initial filtering - slow as fuck
 filter: {
 name: ''       // initial filter
 },
 sorting: {
 name: 'asc'     // initial sorting
 }
 */
             sorting: {
                 dateAdded: 'desc'     // initial sorting
             }
        }, {
            total: data.length, // length of data
            getData: function($defer, params) {
                var filters = params.filter();
                var tempDateFilter;

                var orderedData = params.sorting() ?
                    $filter('orderBy')(data, params.orderBy()) :
                    data;

                if(filters) {
                    if(filters.Date) {
                        orderedData = $filter('customUserDateFilter')(orderedData, filters.Date);
                        tempDateFilter = filters.Date;
                        delete filters.Date;
                    }
                    orderedData = $filter('filter')(orderedData, filters);
                    filters.Date = tempDateFilter;
                }

                //if($scope.topicFilter) {
                    orderedData = $filter('topicFilter')(orderedData, $scope.topic.selected, $scope.readStatusFilter);
                //}
                //if($scope.readStatusfilter) {
                //    orderedData = $filter('topicFilter')(orderedData, $scope.topicFilter);
                //}


                // use build-in angular filter
                /*var filteredData = params.filter() ?
                    $filter('filter')(data, params.filter()) :
                    data;
                var orderedData = params.sorting() ?
                    $filter('orderBy')(filteredData, params.orderBy()) :
                    data;*/
                params.total(orderedData.length); // set total for recalc pagination
                $defer.resolve(orderedData.slice((params.page() - 1) * params.count(), params.page() * params.count()));
            }
        });


        $scope.reloadTable = function() {
            var path = "";
            if ($scope.topic.selected) {
                path += "/timeline/" + selectedUserID + "/" + $scope.topic.selected.topicID;
            } else {
                path += "/timeline/" + selectedUserID;
            }

            if ($scope.readStatusFilter != null) {
                $location.path(path).search('readStatus', $scope.readStatusFilter.id);
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

    })

;

