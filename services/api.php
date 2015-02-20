<?php

include_once ("Authentication/JWT.php");

require_once ("Rest.inc.php");

class API extends REST {

	public $data = "";

	const DB_SERVER = "127.0.0.1";
	const DB_USER = "root";
	const DB_PASSWORD = "lilo";
	const DB = "timelime";
	const TOKEN_KEY = "test";

	private $db = NULL;
	private $mysqli = NULL;
	public function __construct() {
		parent::__construct();
		// Init parent contructor

		date_default_timezone_set('Europe/Zurich');
		$this -> dbConnect();
		// Initiate Database connection
	}

	/*
	 *  Connect to Database
	 */
	private function dbConnect() {
		$this -> mysqli = new mysqli(self::DB_SERVER, self::DB_USER, self::DB_PASSWORD, self::DB);

		$this->mongoCon = new Mongo("mongodb://localhost");
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
            error_log("UserID: " . $userID);
        } catch (Exception $e) {
            error_log( 'Caught exception: '.  $e->getMessage() . "\n");
        }

        return $userID;
	}


    private function initMongo() {
        $out = "Init dä möngi\n";

        $mongoUsers = $this->mongoDB->users;
        $mongoUsers->drop();
        $users = [];
        $userT = [];
        $query = "SELECT * FROM users";
        $r = $this -> mysqli -> query($query) or die($this -> mysqli -> error . __LINE__);
  		if ($r -> num_rows > 0) {
	        while ($user = $r -> fetch_assoc()) {
	            $uid = $user['userID'];
	            //unset($user['userID']);
	            $mongoID = new MongoID();
	            $mID = $mongoID->{'$id'};
	            $user['userID'] = $mID;
	            $user['_id'] = $mID;
                $mongoUsers->insert($user);
                $userT[ $uid ] = $user['_id'];

   	            $users[] = $user;
	        }
	    }
	    $out .= $this->json($users) . "\n";

        $mongoTopics = $this->mongoDB->topics;
        $mongoTopics->drop();
        $topics = [];
        $topicT = [];
        $query = "SELECT * FROM topics";
        $r = $this -> mysqli -> query($query) or die($this -> mysqli -> error . __LINE__);
  		if ($r -> num_rows > 0) {
	        while ($topic = $r -> fetch_assoc()) {
	            $tid = $topic['topicID'];

	            //unset($topic['topicID']);
	            $mongoID = new MongoID();
	            $mID = $mongoID->{'$id'};
	            $topic['topicID'] = $mID;
	            $topic['_id'] = $mID;

	            $topic['userID'] = $userT[ $topic['userID'] ];

                $mongoTopics->insert($topic);
                $topiT[ $tid ] = $topic['_id'];
                $topics[] = $topic;
	        }
	    }
	    $out .= "\n";
	    $out .= $this->json($topics) . "\n";

        $linkFormats = [];
        $query = "SELECT * FROM linkFormats";
        $r = $this -> mysqli -> query($query) or die($this -> mysqli -> error . __LINE__);
        if ($r -> num_rows > 0) {
            while ($linkFormat = $r -> fetch_assoc()) {
                $linkFormats[] = $linkFormat;
            }
        }
        $out .= "\n";
        $out .= $this->json($linkFormats) . "\n";


        $mongoLinks = $this->mongoDB->links;
        $mongoLinks->drop();
        $query = "SELECT c.linkID, c.linkName, c.linkURL, c.dateAdded, c.datePublish, c.topicID, c.formatID, t.topicName, l.formatName, c.tagsJSON, c.readStatus, c.userID, c.userPriv, u.userID, u.userName";
        $query .= " FROM links c INNER JOIN topics t ON c.topicID = t.topicID INNER JOIN linkFormats l ON c.formatID = l.linkFormatID INNER JOIN users u ON u.userID = t.userID ";
        $query .= "  ORDER BY c.linkID DESC";
  	    $r = $this -> mysqli -> query($query) or die($this -> mysqli -> error . __LINE__);
  	    $links = [];
  		if ($r -> num_rows > 0) {
	        while ($link = $r -> fetch_assoc()) {
				// User
                $link['userID'] = $userT[ $link['userID'] ];
				$link['user'] = [
				    'userName' => $link['userName'],
				    'userID' => $link['userID'],
				];
				unset($link['userName']);
				unset($link['userID']);

				// Topic
                $link['topicID'] = $topiT[ $link['topicID'] ];
				$link['topic'] = [
				    'topicName' => $link['topicName'],
				    'topicID' => $link['topicID'],
                    'topicPermissions' => $link['userPriv'],
				];
				unset($link['topicName']);
				unset($link['topicID']);
				unset($link['userPriv']);

				// Format
				$link['format'] = $link['formatName'];
				unset($link['formatName']);
				unset($link['formatID']);

	            $mongoID = new MongoID();
	            $mID = $mongoID->{'$id'};
	            $link['linkID'] = $mID;
	            $link['_id'] = $mID;

                $links[] = $link;
                $mongoLinks->insert($link);
			}
  		}
        $out .= "\n";
  		$out .= $this->json($links) . "\n";

	    $this -> response($out, 200);
    }

	/***
	* Links
	*
	* Privs:
	*   userID = USERID
	*xxx   link.topic.userPriv = 0 (public)
	***/
	private function links() {
		if ($this -> get_request_method() != "GET") {
			$this -> response('', 406);
		}

		$userID = NULL;
        if (isset($this->_request['userID'])) {
            $userID = $this -> _request['userID'];
        }

        $topicID = NULL;
        if (isset($this->_request['topicID'])) {
            $topicID = $this -> _request['topicID'];
        }

        $mongoLinks = $this->mongoDB->selectCollection('links');
        $searchArr = array();
        if (! is_null($topicID)) {
            if (! is_null($userID)) {
                $searchArr = array('user.userID' => $userID, 'topicID' => $topicID);
            } else {
                $searchArr = array('user.topicID' => $topicID);
            }
        } else {
            if (! is_null($userID)) {
                $searchArr = array('user.userID' => $userID);
            } else {

            }
        }
        $linksCursor = $mongoLinks->find($searchArr);

        $links = [];
        foreach($linksCursor as $link) {
            $links[] = $link;
        }

		$this->response($this->json($links), 200);
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
	*
	* Privs:
	*   userID = USERID
	*xxx   link.topic.userPriv = 0 (public)
	***/
	private function link() {
		if ($this -> get_request_method() != "GET") {
			$this -> response('', 406);
		}

        $userID = NULL;
        $id = NULL;
        $query = NULL;

        // UserID
        $userID = $this->getTokenUSerID();
        $linkID = $this -> _request['id'];

        $mongoLinks = $this->mongoDB->selectCollection('links');
        $searchArr = array('linkID' => $linkID);
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

    private function getTopicnameFor($topicID) {
        $mongoTopics = $this->mongoDB->selectCollection('topics');
        $topic = $mongoTopics->findOne(array('topicID' => $topicID));
        return $topic['topicName'];
    }

	/***
	* Insert Link
	*
	* Privs:
	*   logged in
	*
	***/
	private function insertLink() {
		if ($this -> get_request_method() != "POST") {
			$this -> response('', 406);
		}

        $userID = $this->getTokenUserID();
      	$link = json_decode(file_get_contents("php://input"), true);

        $link['readStatusInitial'] = $link['readStatus'];

        $mongoLinks = $this->mongoDB->selectCollection('links');

        // ID
        $mongoID = new MongoID();
        $mID = $mongoID->{'$id'};
        $link['linkID'] = $mID;
        $link['_id'] = $mID;

        // Date added
        $link['dateAdded'] = date ("Y-m-d H:i:s");

        // Resolve: userName
        $link['user']['userID'] = $this->getTokenUserID();
        $link['user']['userName'] = $this->getUsernameFor( $link['user']['userID']);

        // Resolve: topicName
        $link['topic']['topicName'] = $this->getTopicnameFor( $link['topic']['topicID']);


        $mongoLinks->insert($link);
        if (false) {
            error_log("NOPE");
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

        $userID = $this->getTokenUSerID();
        if (is_null($userID)) {
			$this -> response('', 401);
            return;
        }

		$link2 = json_decode(file_get_contents("php://input"), true);
		$link = $link2['link'];
		$id = $link['linkID'];

/*		if (! $this->canWriteLink($userID, $id)) {
			$this -> response('', 401);
            return;
		}
*/
        $mongoLinks = $this->mongoDB->selectCollection('links');
        $searchArr = array('linkID' => $link['linkID']);
        $mongoLinks->update($searchArr, $link);

        if (false) {
            error_log("NOPE");
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

        $mongoTopics = $this->mongoDB->selectCollection('topics');

        $searchArr = array();
        $topicsCursor = $mongoTopics->find($searchArr);
        $topics = [];
        foreach($topicsCursor as $topic) {
            $topics[] = $topic;
        }
        $this->response($this->json($topics), 200);
	}

    private function topicsForUser() {
        if ($this -> get_request_method() != "GET") {
            $this -> response('', 406);
        }

        $userID = $this -> _request['userID'];
        $mongoTopics = $this->mongoDB->selectCollection('topics');

        $searchArr = array('userID' => $userID);
        $topicsCursor = $mongoTopics->find($searchArr);
        $topics = [];
        foreach($topicsCursor as $topic) {
            $topics[] = $topic;
        }
        $this->response($this->json($topics), 200);
    }

    private function topic() {
        if ($this -> get_request_method() != "GET") {
            $this -> response('', 406);
        }

        $userID = NULL;
        $id = NULL;
        $query = NULL;

        // UserID
        $userID = $this->getTokenUSerID();

        $topicID = $this->_request['id'];

        $mongoTopics = $this->mongoDB->selectCollection('topics');
        $searchArr = array('topicID' => $topicID);
        $topic = $mongoTopics->findOne($searchArr);

        if ($topic) {
            $this->response($this->json($topic), 200);
        } else {
            $this -> response('', 204);
        }
    }

	/***
	* Update Topic
	*
	* Privs:
	*   userID = USERID
	*xxx   link.topic.userPriv = 0 (public)
	***/
	private function updateTopic() {
		if ($this -> get_request_method() != "POST") {
			$this -> response('', 406);
		}

        $userID = $this->getTokenUserID();
        if (is_null($userID)) {
			$this -> response('', 401);
            return;
        }

		$data = json_decode(file_get_contents("php://input"), true);
		$topic = $data['topic'];
		$id = $data['id'];

		if (! $this->canWriteTopic($userID, $id)) {
		    error_log("UserID: $userID   ID: $id");
			$this -> response('', 401);
            return;
		}

        $mongoTopics = $this->mongoDB->selectCollection('topics');
        $searchArr = array('topicID' => $topic['topicID']);
        $mongoTopics->update($searchArr, $topic);

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
        $userID = $this->getTokenUSerID();
        if (is_null($userID)) {
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

	/*
	 *	Encode array into JSON
	 */
	private function json($data) {
		if (is_array($data)) {
			return json_encode($data);
		}
	}

}

// Initiiate Library

$api = new API;
$api -> processApi();
?>
