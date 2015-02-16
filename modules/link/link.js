'use strict';

angular.module('myApp.links', ['ngRoute'])
    .config(['$routeProvider', function($routeProvider) {
        $routeProvider.when('/links', {
            title : 'Links',
            templateUrl : 'modules/link/links.html',
            controller : 'linkListCtrl'
        }).when('/view-link/:linkID', {
            title : 'View Link',
            templateUrl : 'modules/link/view-link.html',
            controller : 'linkViewCtrl',
            resolve : {
                link : function(services, $route) {
                    var linkID = $route.current.params.linkID;
                    return services.getLink(linkID);
                },
                topics: function(TopicServices, $route) {
                    return TopicServices.getTopics();
                },
                formats: function(services, $route) {
                    return services.getFormats();
                }
            }
        }).when('/edit-link/:linkID', {
            title : 'Edit Links',
            templateUrl : 'modules/link/edit-link.html',
            controller : 'linkEditCtrl',
            resolve : {
                link : function(services, $route) {
                    var linkID = $route.current.params.linkID;
                    return services.getLink(linkID);
                },
                topics: function(TopicServices, $route) {
                    return TopicServices.getTopics();
                },
                formats: function(services, $route) {
                    return services.getFormats();
                }
            }
        }).when('/add-link/:linkID/:title/:url*', {
            title : 'Add Links',
            templateUrl : 'modules/link/add-link-bookmarklet.html',
            controller : 'linkAddCtrl',
            resolve : {
                link : function(services, $route) {
                    var a = {

                    };
                    return a;
                },
                topics: function(TopicServices, $route) {
                    return TopicServices.getTopics();
                },
                formats: function(services, $route) {
                    return services.getFormats();
                }
            }
        }).when('/add-link', {
            title : 'Add Links',
            templateUrl : 'modules/link/edit-link.html',
            controller : 'linkAddCtrl',
            resolve : {
                link : function(services, $route) {
                    var a = {

                    };
                    return a;
                },
                topics: function(TopicServices, $route) {
                    return TopicServices.getTopics();
                },
                formats: function(services, $route) {
                    return services.getFormats();
                }
            }
        });
    }])


// Links
    .controller('linkListCtrl', function($scope, services) {
        services.getLinks().then(function(data) {
            $scope.links = data.data;

            //$scope.link = $scope.links[0];

            $scope.viewLink = function(link) {
                if ($scope.link == link) {
                    $scope.link = null;
                } else {
                    $scope.link = link;
                }
            }
        });
    })

    .controller('linkViewCtrl', function($scope, $rootScope, $location, $routeParams, services, link, topics, formats, AuthenticationService, ReadstatusService) {
        var linkID = ($routeParams.linkID) ? parseInt($routeParams.linkID) : 0;
        $rootScope.title = 'View Link';

        $scope.readStats = ReadstatusService.getReadstats();

        $scope.topics = topics.data;
        $scope.formats = formats.data;

        $scope.link = link.data;
    })


    .controller('linkEditCtrl', function($scope, $rootScope, $location, $routeParams, services, link, topics, formats, AuthenticationService, TopicServices, ReadstatusService) {
        var linkID = ($routeParams.linkID) ? parseInt($routeParams.linkID) : 0;
        $rootScope.title = 'Edit Link';
        $scope.buttonText = 'Update Link';

        $scope.topics = topics.data;
        $scope.formats = formats.data;

        $scope.readStats = ReadstatusService.getReadstats();

        var original = link.data;
        original._id = linkID;
        $scope.link = angular.copy(original);
        $scope.link._id = linkID;

        $scope.readStats = ReadstatusService.getReadstats();

        $scope.goBack = function() {
            window.history.back();
        };
        /*
         $scope.loadTags = function(query) {
         return [];
         //return $http.get('/tags?query=' + query);
         };*/

        $scope.isClean = function() {
            return angular.equals(original, $scope.link);
        }

        $scope.deleteLink = function(link) {
            $location.path('/');
            if (confirm("Are you sure to delete link number: " + $scope.link._id) == true)
                services.deleteLink(link.linkID);
        };

        $scope.saveLink = function(link) {
            if (AuthenticationService.isLoggedin()) {

                $location.path('/');
                if (linkID <= 0) {
                    services.insertLink(link);
                } else {
                    services.updateLink(linkID, link);
                }
            } else {
                alert("Not logged in");
            }
        };

        $scope.addNewTopic = function() {
            if (AuthenticationService.isLoggedin()) {
                var t = {
                    topicName: $scope.newTopic,
                    description: "",
                    userID: AuthenticationService.getCurrentUserID,
                    userPrivs: 0};
                TopicServices.insertTopic(t).then(function(data) {
                    $scope.reloadTopics();
                    $scope.link.topicID = data.data.topicID.toString();
                });
            } else {
                alert("User nog logged in");
            }
        };

        $scope.reloadTopics = function() {
            TopicServices.getTopics().success(function(data) {
                $scope.topics = data;
            });
        };
    })

    .controller('linkAddCtrl', function($scope, $rootScope, $location, $routeParams, services, link, topics, formats, AuthenticationService, TopicServices, ReadstatusService) {
        $rootScope.title = 'Add Link';
        $scope.buttonText = 'Add New Link';

        $scope.readStats = ReadstatusService.getReadstats();

        var original = link;
        $scope.link = angular.copy(original);

        $scope.topics = topics.data;
        $scope.formats = formats.data;

        $scope.link.readStatus = '0';
        $scope.link.readStatusOrig = '0';
        $scope.link.formatID = '1';
        $scope.link.userPriv = '0';

        // for adding a link via bookmarklet
        if ($routeParams.url) {
            $scope.link.linkURL = decodeURIComponent($routeParams.url);
        }
        if ($routeParams.title) {
            $scope.link.linkName = decodeURIComponent($routeParams.title);
        }

        $scope.checkIfLinkExists = function(link) {
            var data = services.checkIfLinkExists(link);
            data.then(function(data2) {
                if (data2.data) {
                    console.log(data2.data);
                    $scope.linkURLexists = data2.data;
                } else {
                    $scope.linkURLexists = null;
                }
            });
        }

        // After definition of checkIfLinkExist...
        if ($scope.link.linkURL) {
            $scope.checkIfLinkExists($scope.link);
        }

        $scope.isClean = function() {
            return angular.equals(original, $scope.link);
        }

        $scope.deleteLink = function(link) {
            $location.path('/');
            if (confirm("Are you sure to delete link number: " + $scope.link.topicID) == true)
                services.deleteLink(link.linkID);
        }

        $scope.setPublishToToday = function() {
            $scope.link.datePublish = new Date();
        }

        $scope.saveLink = function(link, isBookmarklet) {
            if (AuthenticationService.isLoggedin()) {
                $location.path('/');
                if (AuthenticationService.getCurrentUserID()) {
                    link.user = {
                        userID: AuthenticationService.getCurrentUserID(),
                    }

                    services.insertLink(link);
                }
            } else {
                alert("User nog logged in");
            }
        };

        $scope.saveLinkAndClose = function(link) {
            $location.path('/');
            services.insertLink(link);
            self.close();
        };

        $scope.addNewTopic = function() {
            if (AuthenticationService.isLoggedin()) {
                var t = {
                    topicName: $scope.newTopic,
                    description: "",
                    userID: AuthenticationService.getCurrentUserID,
                    userPrivs: 0};
                TopicServices.insertTopic(t).then(function(data) {
                    $scope.reloadTopics();
                    $scope.link.topicID = data.data.topicID.toString();
                });
            } else {
                alert("User nog logged in");
            }
        };

        $scope.reloadTopics = function() {
            TopicServices.getTopics().success(function(data) {
                $scope.topics = data;
            });
        };
    })

    .factory("services", ['$http', 'AuthenticationService', 'ReadstatusService',
        function($http, AuthenticationService, ReadstatusService) {
            var serviceBase = 'services/'
            var obj = {};

            var processLink = function(link) {
                // Readstats
                var readStats = ReadstatusService.getReadstatusTextFor(link.readStatus);
                link.readStatusTextRo = readStats;

                if (link.tagsJSON.length > 0) {
                    link.tags = angular.fromJson(link.tagsJSON);
                }

                link.dateAdded = new Date(link.dateAdded);
                if (link.datePublish != null) {
                    link.datePublish = new Date(link.datePublish);
                }
            }


            obj.getLinks = function() {
                var links = $http.get(serviceBase + 'links');

                links.success(function(linkss) {
                    //for(var link in linkss) {
                    for (var index=0; index<linkss.length; index++) {
                        var link = linkss[index];
                        processLink(link);
                    }
                });

                return links;
            }

            obj.getLinksForUser = function(userID) {
                var links = $http.get(serviceBase + 'links?userID=' + userID);

                links.success(function(linkss) {
                    //for(var link in linkss) {
                    for (var index=0; index<linkss.length; index++) {
                        var link = linkss[index];
                        processLink(link);
                    }
                }).error( function(linkss) {
                    linkss = [{}];
                    console.log("BLERH");
                    console.log(linkss);
                });

                return links;
            }


            obj.getLinksForTopic = function(topic) {
                var links = $http.get(serviceBase + 'links?topicID=' + topic.topicID);

                links.success(function(linkss) {
                    //for(var link in linkss) {
                    for (var index=0; index<linkss.length; index++) {
                        var link = linkss[index];
                        processLink(link);
                    }
                });

                return links;
            }

            obj.getMyLinks = function() {
                var userID = AuthenticationService.getCurrentUserID();
                var links = $http.get(serviceBase + 'links' + '?userID=' + userID);

                links.success(function(linkss) {
                    //for(var link in linkss) {
                    for (var index=0; index<linkss.length; index++) {
                        var link = linkss[index];
                        processLink(link);
                    }
                });

                return links;
            }

            obj.checkIfLinkExists = function(link) {
                var userID = AuthenticationService.getCurrentUserID();

                return $http.get(serviceBase + 'linkExists' + '?linkURL=' + link.linkURL).then(function(results) {
                    return results;
                });
            }

            obj.getLink = function(linkID) {
                var link = $http.get(serviceBase + 'link?id=' + linkID);

                link.success(function(data) {
                    processLink(data);
                });

                return link;
            }


            obj.insertLink = function(link) {
                link.tagsJSON = JSON.stringify(link.tags);

                return $http.post(serviceBase + 'insertLink', link).then(function(results) {
                    return results;
                });
            };

            obj.updateLink = function(id, link) {
                if ('tags' in link) {
                    link.tagsJSON = JSON.stringify(link.tags);
                }

                return $http.post(serviceBase + 'updateLink', {
                    id : id,
                    link : link
                }).then(function(status) {
                    return status.data;
                });
            };

            obj.deleteLink = function(id) {
                return $http.delete(serviceBase + 'deleteLink?id=' + id).then(function(status) {
                    return status.data;
                });
            };


            // Formats
            obj.getFormats = function() {
                return $http.get(serviceBase + 'formats');
            }

            return obj;
        }]);

;
