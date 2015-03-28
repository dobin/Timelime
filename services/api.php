<?php

include_once ("Authentication/JWT.php");

require_once ("Rest.inc.php");

class API extends REST {
	public $data = "";
	const TOKEN_KEY = "test";

	private $db = NULL;
	private $mysqli = NULL;
	public function __construct() {
		parent::__construct();
		// Init parent contructor

		date_default_timezone_set('Europe/Zurich');
		$this -> dbConnect();
	}


	/*
	 *  Connect to Database
	 */
	private function dbConnect() {
		$this->mongoCon = new MongoClient();
		$this->mongoDB = $this->mongoCon->selectDB('timelime');
	}

	/*
	 * Dynmically call the method based on the query string
	 */
	public function processApi() {
		$func = strtolower(trim(str_replace("/", "", $_REQUEST['x'])));
		if ((int)method_exists($this, $func) > 0)
			$this -> $func();
		else
			$this -> response('', 404);
		// If the method not exist with in this class "Page not found".
	}

	private function userLogin() {
		if ($this -> get_request_method() != "POST") {
			$this -> response('', 406);
		}
		
		$user = json_decode(file_get_contents("php://input"), true);
	
		$username = $user['username'];
		$password = $user['password'];

		if (empty($username) || empty($password)) {
		    $this -> response('', 204);
		}

        $mongoUsers = $this->mongoDB->selectCollection('users');
        $user = $mongoUsers->findOne( array( 'username' => $username ));
        if ($user['password'] == md5($password)) {
            $result = array();
            $result['username'] = $user['username'];
            $result['userID'] = $user['userID'];

            $now = time();
            $token = array(
                'jti' => md5($now . rand()),
                'iat' => $now,
                'username' => $result['username'],
                'userID' => $result['userID']
            );
            $jwtToken = JWT::encode($token, self::TOKEN_KEY);


            $result['token'] = $jwtToken;
            // If success everythig is good send header as "OK" and user details
            $this->response($this -> json($result), 200);
        } else {
		    $error = array('status' => "Failed", "msg" => "Invalid Email address or Password");
		    $this -> response($this -> json($error), 401);
		}
	}
/*
	public function fixTags() {
        $mongoLinks = $this->mongoDB->selectCollection('links');
        $searchArr = array();
        $linksCursor = $mongoLinks->find($searchArr);

        foreach($linksCursor as $link) {
            $newtags = array();

            if (array_key_exists('tags', $link)) {

                foreach($link['tags'] as $tag) {
                    $newtags[] = $tag['text'];

                }
                //unlink($link['tags']);

                $link['tags'] = $newtags;

                $mongoLinks->update(array('linkID' => $link['linkID']), $link);
            }
        }
	}*/


	private function getAuthenticationHeader() {
	    $token = "";
        $headers = getallheaders();

        foreach($headers as $key=>$val){
            if($key === "Authorization") {
                $token = $val;
            }
        }

	    return $token;
	}

	private function getTokenUserID() {
	    $userID = NULL;

        $token = $this->getAuthenticationHeader();

        try {
    	    $jwtToken = JWT::decode($token, "test");
            $userID = $jwtToken->userID;
        } catch (Exception $e) {
            //error_log( 'Caught exception: '.  $e->getMessage() . "\n");
        }

        return $userID;
	}


	/***
	* Links
	***/
	private function links() {
		if ($this -> get_request_method() != "GET") {
			$this -> response('', 406);
		}

        $authUserID = $this->getTokenUSerID();

		$userID = NULL;
        if (isset($this->_request['userID'])) {
            $userID = $this -> _request['userID'];
        }

        $callback = NULL;
        if (isset($this->_request['jsonp'])) {
            $callback = $this -> _request['jsonp'];
        }

        $after = NULL;
        if (isset($this->_request['after'])) {
            $after = $this -> _request['after'];
        }

        $topicID = NULL;
        if (isset($this->_request['topic']) && $this->_request['topic'] != '') {
            $topicID = $this -> _request['topic'];
        }

        $search = NULL;
        if (isset($this->_request['search']) && $this->_request['search'] != '' && $this->_request['search'] != 'undefined') {
            $search = $this -> _request['search'];
        }

        $tags = NULL;
        if (isset($this->_request['tags']) && $this->_request['tags'] != '' && $this->_request['tags'] != 'undefined') {
            $tags = urldecode($this -> _request['tags']);
        }

        $mongoLinks = $this->mongoDB->selectCollection('links');
        $searchArr = array();

        // Search for topic?
        if (! is_null($topicID)) {
            $searchArr['topic.topicID'] = $topicID;
        }

        // Search for user?
        if (! is_null($userID)) {
            $searchArr['user.userID'] = $userID;
        }

        // Only public?
        if (! isset($authUserID)) {
            $searchArr['topic.topicPermissions'] = '0';
        } else {
            $searchArr['$or'] = array(
             array( 'topic.topicPermissions' => 0),
             array( 'user.userID' => $authUserID));
        }

        // searchfor?
        if (! is_null($search)) {
            $searchArr['linkName'] = array ('$regex' => new MongoRegex("/$search/"));
        }

        // Tags?
        if (! is_null($tags)) {
            $t = preg_split('/, /', $tags);
            foreach($t as $tag) {
                $searchArr['tags'] = array('$elemMatch' => array('text' =>  $tag));
            }
        }


        // After?
        if (isset($after) && $after != "") {
            $after = new MongoDate($after);
            $searchArr['dateAdded'] = array( '$lt' => $after);
         }

        $linksCursor = $mongoLinks->find($searchArr);
        $linksCursor->limit(10);

        $links = array();
        foreach($linksCursor as $link) {
            $links[] = $link;
        }

        if ($links) {
            if (isset($callback)) {
		        $this->response($callback . '({ "children": ' .  $this->json($links) . '})', 200);
		    } else {
		        $this->response($this->json($links), 200);
		    }
        } else {
		    $this->response('', 204);
        }
	}


    private function linkExists() {
        if ($this -> get_request_method() != "GET") {
            $this -> response('', 406);
        }

        $userID = NULL;
        $userID = $this->getTokenUSerID();

        $linkURL = NULL;
        if (isset($this->_request['linkURL'])) {
            $linkURL = $this->_request['linkURL'];
        } else {
            $this -> response('', 204);
        }

        $mongoLinks = $this->mongoDB->selectCollection('links');
        $searchArr = array('linkURL' => $linkURL);
        $link = $mongoLinks->findOne($searchArr);
        if ($link) {
            $this -> response($this->json($link), 200);
        } else {
            $this -> response('', 204);
        }
   	}



	/***
	* Link
	***/
	private function link() {
		if ($this -> get_request_method() != "GET") {
			$this -> response('', 406);
		}

        $mongoLinks = $this->mongoDB->selectCollection('links');

        $userID = NULL;
        $id = NULL;
        $query = NULL;

        $authUserID = $this->getTokenUSerID();
        $linkID = $this -> _request['id'];

        $searchArr = array('linkID' => $linkID);
        if (! isset($authUserID)) {
            $searchArr['topic.topicPermissions'] = '0';
        } else {
            $searchArr['$or'] = array(
             array( 'topic.topicPermissions' => 0),
             array( 'user.userID' => $authUserID));
        }

        $link = $mongoLinks->findOne($searchArr);

        if ($link) {
            $this->response($this->json($link), 200);
        } else {
  	    	$this -> response('', 204);
        }
	}


    private function getUsernameFor($userID) {
        $mongoUsers = $this->mongoDB->selectCollection('users');
        $user = $mongoUsers->findOne(array('userID' => $userID));
        return $user['username'];
    }

    private function getTopicFor($topicID) {
        $mongoTopics = $this->mongoDB->selectCollection('topics');
        $topic = $mongoTopics->findOne(array('topicID' => $topicID));
        return $topic;
    }

	/***
	* Insert Link
	***/
	private function insertLink() {
		if ($this -> get_request_method() != "POST") {
			$this -> response('', 406);
		}

        $userID = $this->getTokenUserID();
        if (! isset($userID)) {
            $this -> response('', 401);
            return;
        }

      	$link = json_decode(file_get_contents("php://input"), true);

        $link['readStatusInitial'] = $link['readStatus'];

        $mongoLinks = $this->mongoDB->selectCollection('links');

        // ID
        $mongoID = new MongoID();
        $mID = $mongoID->{'$id'};
        $link['linkID'] = $mID;
        $link['_id'] = $mID;

        // Dates
        $link['dateAdded'] =  new MongoDate();
        if(isset($link['datePublish'])) {
            $link['datePublish'] = new MongoDate(strtotime($link['datePublish']));
        }

        // Resolve: userName
        $link['user']['userID'] = $this->getTokenUserID();
        $link['user']['userName'] = $this->getUsernameFor( $link['user']['userID']);

        // Resolve: topicName
        $topic = $this->getTopicFor( $link['topic']['topicID']);
        if ($topic['userID'] != $userID ) {
            $this -> response('', 401);
            return;
        }
        $link['topic']['topicName'] = $topic['topicName'];


        $mongoLinks->insert($link);
        if (false) {
			$this -> response('', 204);
        } else {
   			$success = array('status' => "Success", "msg" => "Link Created Successfully.", "data" => $link);
   			$this -> response($this -> json($success), 200);
        }
	}


    private function canWriteLink($userID, $linkID) {
        $mongoLinks = $this->mongoDB->selectCollection('links');
        $searchArr = array('linkID' => $linkID);
        $link = $mongoLinks->findOne($searchArr);

        if ($link && $link['user']['userID'] == $userID) {
            return true;
        } else {
            return false;
        }
    }

    private function canWriteTopic($userID, $topicID) {
        $mongoLinks = $this->mongoDB->selectCollection('topics');
        $searchArr = array('topicID' => $topicID);
        $topic = $mongoLinks->findOne($searchArr);

        if ($topic && $topic['userID'] == $userID) {
            return true;
        } else {
            return false;
        }
    }

	/***
	* Update Link
	*
	* Privs:
	*   userID = USERID
	*xxx   link.topic.userPriv = 0 (public)
	***/
	private function updateLink() {
		if ($this -> get_request_method() != "POST") {
			$this -> response('', 406);
		}

        $userID = $this->getTokenUserID();
        if (! isset($userID)) {
			$this -> response('', 401);
            return;
        }

		$link2 = json_decode(file_get_contents("php://input"), true);
		$link = $link2['link'];
		$id = $link['linkID'];

		if (! $this->canWriteLink($userID, $id)) {
			$this -> response('', 401);
            return;
		}

        // Dates
        $link['dateAdded'] =  new MongoDate(strtotime($link['dateAdded']));
        if(isset($link['datePublish'])) {
            $link['datePublish'] = new MongoDate(strtotime($link['datePublish']));
        }
        $mongoLinks = $this->mongoDB->selectCollection('links');
        $searchArr = array('linkID' => $link['linkID']);
        $mongoLinks->update($searchArr, $link);

        if (false) {
			$this -> response('', 204);
        } else {
   			$success = array('status' => "Success", "msg" => "Link Created Successfully.", "data" => $link);
   			$this -> response($this -> json($success), 200);
        }

	}


	private function deleteLink() {
		if ($this -> get_request_method() != "DELETE") {
			$this -> response('', 406);
		}
        $userID = $this->getTokenUSerID();
        if (is_null($userID)) {
			$this -> response('', 401);
            return;
        }

		$id = $this -> _request['id'];

        if (! $this->canWriteLink($userID, $id)) {
            $this -> response('', 401);
            return;
        }

        $mongoLinks = $this->mongoDB->selectCollection('links');
        $searchArr = array('linkID' => $id);
        $mongoLinks->remove($searchArr);
	}



	/*** Topics ***/
	private function topics() {
		if ($this -> get_request_method() != "GET") {
			$this -> response('', 406);
		}

        $authUserID = $this->getTokenUSerID();
        $mongoTopics = $this->mongoDB->selectCollection('topics');

        $searchArr = array();
        if (! isset($authUserID)) {
            $searchArr['topicPermissions'] = '0';
        } else {
            $searchArr['$or'] = array(
             array( 'topicPermissions' => 0),
             array( 'userID' => $authUserID));
        }

        $topicsCursor = $mongoTopics->find($searchArr);

        $topics = array();
        foreach($topicsCursor as $topic) {
            $topics[] = $topic;
        }

        if ($topics) {
            $this->response($this->json($topics), 200);
        } else {
            $this->response('', 204);
        }
	}

    private function topicsForUser() {
        if ($this -> get_request_method() != "GET") {
            $this -> response('', 406);
        }

        $authUserID = $this->getTokenUSerID();

        $userID = $this -> _request['userID'];
        $mongoTopics = $this->mongoDB->selectCollection('topics');

        $searchArr = array('userID' => $userID);
        if (! isset($authUserID)) {
            $searchArr['topicPermissions'] = '0';
        } else {
            $searchArr['$or'] = array(
             array( 'topicPermissions' => 0),
             array( 'userID' => $authUserID));
        }

        $topicsCursor = $mongoTopics->find($searchArr);
        $topics = array();
        foreach($topicsCursor as $topic) {
            $topics[] = $topic;
        }

        if ($topics) {
            $this->response($this->json($topics), 200);
        } else {
		    $this->response('', 204);
        }
    }

    private function topic() {
        if ($this -> get_request_method() != "GET") {
            $this -> response('', 406);
        }

        $authUserID = NULL;
        $id = NULL;
        $query = NULL;

        // UserID
        $authUserID = $this->getTokenUSerID();

        $topicID = $this->_request['id'];

        $mongoTopics = $this->mongoDB->selectCollection('topics');
        $searchArr = array('topicID' => $topicID);
        if (! isset($authUserID)) {
            $searchArr['topicPermissions'] = '0';
        } else {
            $searchArr['$or'] = array(
             array( 'topicPermissions' => 0),
             array( 'userID' => $authUserID));
        }

        $topic = $mongoTopics->findOne($searchArr);

        if ($topic) {
            $this->response($this->json($topic), 200);
        } else {
            $this -> response('', 204);
        }
    }


	/***
	* Update Topic
	***/
	private function updateTopic() {
		if ($this -> get_request_method() != "POST") {
			$this -> response('', 406);
		}

        $authUserID = $this->getTokenUserID();
        if (is_null($authUserID)) {
			$this -> response('', 401);
            return;
        }

		$data = json_decode(file_get_contents("php://input"), true);
		$topic = $data['topic'];
		$id = $data['id'];

		if (! $this->canWriteTopic($authUserID, $id)) {
			$this -> response('', 401);
            return;
		}

        $mongoTopics = $this->mongoDB->selectCollection('topics');
        $searchArr = array('topicID' => $topic['topicID']);
        $originalTopic = $mongoTopics->findOne($searchArr);

        // Edit topic in topics
        $mongoTopics->update($searchArr, $topic);

        // Update topic.topicName for all links where and if necessary
        if ($originalTopic['topicName'] != $topic['topicName']) {
            $mongoLinks = $this->mongoDB->selectCollection('links');
            $searchArrLinks = array('topic.topicID' => $topic['topicID']);
            $mongoLinks->update(
                $searchArrLinks,
                array('$set' => array('topic.topicName' => $topic['topicName'])),
                array( 'multiple' => true )
             );
        }

        // Update permissions of links
        if ($originalTopic['topicPermissions'] != $topic['topicPermissions']) {
            $mongoLinks = $this->mongoDB->selectCollection('links');
            $searchArrLinks = array('topic.topicID' => $topic['topicID']);
            $mongoLinks->update(
                $searchArrLinks,
                array('$set' => array('topic.topicPermissions' => $topic['topicPermissions'])),
                array( 'multiple' => true )
             );
        }


        if (false) {
            error_log("NOPE");
            $this -> response('', 204);
        } else {
            $success = array('status' => "Success", "msg" => "Topic updated successfully", "data" => $topic);
            $this -> response($this -> json($success), 200);
        }
	}

	private function insertTopic() {
		if ($this -> get_request_method() != "POST") {
			$this -> response('', 406);
		}
        $authUserID = $this->getTokenUSerID();
        if (is_null($authUserID)) {
			$this -> response('', 401);
            return;
        }

		$topic = json_decode(file_get_contents("php://input"), true);

        $mongoID = new MongoID();
        $mID = $mongoID->{'$id'};
        $topic['topicID'] = $mID;
        $topic['_id'] = $mID;
        $topic['userID'] = $this->getTokenUserID();

        $mongoTopics = $this->mongoDB->selectCollection('topics');
        $mongoTopics->insert($topic);

        if (false) {
			$this -> response('', 204);
        } else {
			$success = array('status' => "Success", "msg" => "Topic Created Successfully.", "data" => $topic, "topicID" => $mID);
   		    $this -> response($this -> json($success), 200);
        }
	}



    private function users() {
        if ($this -> get_request_method() != "GET") {
            $this -> response('', 406);
        }

        $mongousers = $this->mongoDB->selectCollection('users');

        $searchArr = array();
        $usersCursor = $mongousers->find($searchArr);
        $users = array();
        foreach($usersCursor as $user) {
            $users[] = $user;
        }
        $this->response($this->json($users), 200);
    }


    private function user() {
        if ($this -> get_request_method() != "GET") {
            $this -> response('', 406);
        }

        $userID = $this->_request['id'];
        $mongousers = $this->mongoDB->selectCollection('users');
        $searchArr = array('userID' => $userID);
        $user = $mongousers->findOne($searchArr);

        $publicUser = array (
            'username' => $user['username'],
            'userID' => $user['userID'],
        );

        $this->response($this->json($publicUser), 200);
    }


	/*
	 *	Encode array into JSON
	 */
	private function json($data) {
		if (is_array($data)) {
			return json_encode($data);
		}
	}


    public function rss() {
        $response = "";

        $mongolinks = $this->mongoDB->selectCollection('links');
        $userID = $this->_request['userid'];


        $topic = null;
        $searchArr = array('user.userID' => $userID);
        if (isset($this->_request['topicid'])) {
            $topicID = $this->_request['topicid'];
            $searchArr['topic.topicID'] = $topicID;

            $mongotopics = $this->mongoDB->selectCollection('topics');
            $topic = $mongotopics->findOne(array('topicID' => $topicID));
        }

        $mongousers = $this->mongoDB->selectCollection('users');
        $user = $mongousers->findOne(array('userID' => $userID));

        $links = $mongolinks->find($searchArr);
        $links->sort(array('dateAdded' => 1));
        $links->limit(20);

        $response .= '<?xml version="1.0" encoding="UTF-8" ?>';
        $response .= '<rss version="2.0">';
        $response .= '<channel>';
        $response .= '<title>';
        $response .= 'Haking.ch: ' . $user['username'];
        if (isset($topicID)) {
            $response .= " / " . $topic['topicName'];
        }
        $response .= '</title>';
        $response .= '<description> </description>';

        foreach($links as $link) {
            $response .= '<item>';

            $response .= '<title>' . $link['linkName'] .'</title>';
            $response .= '<link>' . $link['linkURL'] . '</link>';
            $response .= '<guid>' . $link['linkID'] . '</guid>';
            $response .= '<pubDate>' . $link['dateAdded'] . '</pubDate>';

            $response .= '<description>';
            $response .= "Title: " . $link['linkName'] . "&lt;br&gt;";
            $response .= "Topic: " . $link['topic']['topicName'] . "&lt;br&gt;";

            if (isset($link['tags'])) {
                $a = array();
                foreach($link['tags'] as $tag) {
                    $a[] = $tag['text'];
                }
                $response .= "Tags: " . join(",", $a) . "&lt;br&gt;";
            }

            if (isset($link['description'])) {
                $response .= "Description: " . $link['description'] . "&lt;br&gt;";
            }
            $response .= "URL: &lt;a href=\"" . $link['linkURL'] . "\"&gt;" . $link['linkURL'] . "&lt;/a&gt;" . "&lt;br&gt;";
            $response .= "Haking URL: &lt;a href=\"http://www.haking.ch/" . $link['user']['userID'] . "/" . $link['linkID'] . "\"&gt;" . "http://www.haking.ch/" . $link['user']['userID'] . "/" . $link['linkID'] . "&lt;/a&gt;";
            $response .= "&lt;br&gt;";
            $response .= '</description>';

            $response .= '</item>';

        }
        $response .= '</channel>';
        $response .= '</rss>';


        $this->response($response, 200);
    }
}

$api = new API;
$api -> processApi();
?>
