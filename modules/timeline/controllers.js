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
        .when('/mytimeline', {
            title : 'My Timeline',
            templateUrl : 'modules/timeline/timeline.html',
            controller : 'timelineListCtrl',
            resolve : {
                data: function($route, services) {
                    return services.getMyLinks();
                },
                topics: function(TopicServices, $route) {
                    return TopicServices.getTopics();
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
                if(topicFilter == null || link.topicName === topicFilter.topicName) {
                    if(readStatusFilter == null || link.readStatus === readStatusFilter.id) {
                        filtered.push(link);
                    }
                }
            });

            return filtered;
        }
    })

    .controller('timelineListCtrl', function($scope, $routeParams, $filter, data, services, ngTableParams, AuthenticationService, ReadstatusService, topics) {
        //var linkID = ($routeParams.linkID) ? parseInt($routeParams.linkID) : 0;
        var linkID = $routeParams.linkID;
        $scope.user = AuthenticationService.getCurrentUser();

        $scope.links = data.data;
        $scope.topics = topics.data;
        $scope.readStats = ReadstatusService.getReadstats();

        if (linkID) {
            /*
             var linkParam = $filter('filter')($scope.links, function (d) {
             return d.linkID == linkID;
             })[0];*/

            for(var i=0; i<$scope.links.length; i++) {
                if (angular.equals($scope.links[i].linkID, linkID)) {
                    $scope.selectedLink = $scope.links[i];
                    $scope.links[i].isSelected = true;
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
                    orderedData = $filter('topicFilter')(orderedData, $scope.topicFilter, $scope.readStatusFilter);
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


        $scope.reloadTable = function(topic) {
            $scope.tableParams.reload();
        }

        $scope.changeLinkReadStatus = function(link) {
            link.readStatus++;
            link.readStatus = link.readStatus % 4;

            // Readstats
            var readStats = ReadstatusService.getReadstatusTextFor(link.readStatus);
            link.readStatusTextRo = readStats;

            services.updateLink(link.linkID, link);
        };

        $scope.viewLink = function(link) {
            if ($scope.selectedLink == link) {
                $scope.selectedLink.isSelected = false;
                $scope.selectedLink = null;
                return;
            }

            if ($scope.selectedLink) {
                $scope.selectedLink.isSelected = false;
            }

            $scope.selectedLink = link;
            link.isSelected = true;
        }
    })

;
