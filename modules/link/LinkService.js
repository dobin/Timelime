'use strict';

angular.module('myApp.links')

.factory("services", ['$http', 'AuthenticationService', 'ReadstatusService',
    function($http, AuthenticationService, ReadstatusService) {
        var serviceBase = 'services/'
        var obj = {};

        var processLink = function(link) {
            // Readstats
            var readStats = ReadstatusService.getReadstatusTextFor(link.readStatus);
            link.readStatusTextRo = readStats;

            // Dates
            link.dateAdded = new Date(link.dateAdded.sec * 1000);
            if (link.datePublish != null) {
                link.datePublish = new Date(link.datePublish.sec * 1000);
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


        obj.getLinksForTopic = function(topicID) {
            var links = $http.get(serviceBase + 'links?topicID=' + topicID);

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
            //link.tagsJSON = JSON.stringify(link.tags);

            return $http.post(serviceBase + 'insertLink', link).then(function(results) {
                return results;
            });
        };


        obj.updateLink = function(id, link) {
            /*if ('tags' in link) {
             link.tagsJSON = JSON.stringify(link.tags);
             }*/

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
            var f = [{
                linkFormatID: '1',
                formatName: 'website',
                description: ''
            },
                {
                    linkFormatID: '2',
                    formatName: 'pdf',
                    description: ''
                }
            ];

            return f;
        }

        obj.getUsers = function() {
            return $http.get(serviceBase + 'users');
        }

        return obj;
    }]);