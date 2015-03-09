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
        $scope.formats = formats;

        $scope.link = link.data;
    })


    .controller('linkEditCtrl', function($scope, $rootScope, $location, $routeParams, services, link, topics, formats, AuthenticationService, TopicServices, ReadstatusService) {
        var linkID = ($routeParams.linkID) ? parseInt($routeParams.linkID) : 0;
        $rootScope.title = 'Edit Link';
        $scope.buttonText = 'Update Link';

        $scope.topics = topics.data;
        $scope.formats = formats;

        $scope.readStats = ReadstatusService.getReadstats();

        var original = link.data;
        $scope.link = angular.copy(original);
        $scope.readStats = ReadstatusService.getReadstats();

        $scope.goBack = function() {
            window.history.back();
        };

        $scope.isClean = function() {
            return angular.equals(original, $scope.link);
        }

        $scope.deleteLink = function(link) {
            $location.path('/');
            if (confirm("Are you sure to delete link number: " + $scope.link.linkID) == true)
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
                    userPriv: 0};
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
        $scope.formats = formats;

        $scope.link.readStatus = '0';
        $scope.link.readStatusInitial = '0';
        $scope.link.user = {
            userPriv: '0'
        };
        $scope.link.format = "website";
        $scope.link.topic = {};

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
            if (confirm("Are you sure to delete link number: " + $scope.linkID) == true)
                services.deleteLink(link.linkID);
        }

        $scope.setPublishToToday = function() {
            $scope.link.datePublish = new Date();
        }

        $scope.saveLink = function(link, isBookmarklet) {
            if (AuthenticationService.isLoggedin()) {
                $location.path('/');
                if (AuthenticationService.getCurrentUserID()) {
                    /*link.user = {
                        userID: AuthenticationService.getCurrentUserID(),
                    }*/

                    services.insertLink(link);
                }
            } else {
                alert("User not logged in");
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
                    userPriv: 0};
                TopicServices.insertTopic(t).then(function(data) {
                    $scope.reloadTopics();
                    $scope.link.topic.topicID = data.data.topicID;
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



;
