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
		
		if (!empty($username) and !empty($password)) {
				$query = "SELECT userID, username FROM users WHERE username = '".  $username . "' AND password = '" . md5($password) . "' LIMIT 1";
				$r = $this -> mysqli -> query($query) or die($this -> mysqli -> error . __LINE__);

				if ($r -> num_rows > 0) {
					$result = $r -> fetch_assoc();

					$now = time();
					//$key = "test";

					$token = array(
    					'jti' => md5($now . rand()),
	    				'iat' => $now,
	    				'username' => $result['username'],
					    'userID' => $result['userID']
					);
					$jwtToken = JWT::encode($token, self::TOKEN_KEY);

                    $result['token'] = $jwtToken;
                    error_log("X: ");
                    error_log($jwtToken);
					// If success everythig is good send header as "OK" and user details
					$this->response($this -> json($result), 200);
				}
				$this -> response('', 204);
				// If no records "No Content" status
		}

		$error = array('status' => "Failed", "msg" => "Invalid Email address or Password");
		$this -> response($this -> json($error), 401);
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
            error_log( 'Caught exception: ',  $e->getMessage(), "\n");
        }

        return $userID;
	}


    private function initMongo() {
        $mongoLinks = $this->mongoDB->links;
        $mongoLinks->drop();

        $post = array(
                'title'     => 'What is MongoDB',
                'content'   => 'MongoDB is a document database that provides high performance...',
                'saved_at'  => new MongoDate()
            );

        $mongoLinks->insert($post);

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
            $userID = (int)$this -> _request['userID'];
        }

        $topicID = NULL;
        if (isset($this->_request['topicID'])) {
            $topicID = (int)$this -> _request['topicID'];
        }

        $mongoLinks = $this->mongoDB->selectCollection('links');

        $linksCursor = $mongoLinks->find();
        $links = [];
        foreach($linksCursor as $link) {
            $links[] = $link;
        }

        error_log($this->json($links));
		$this->response($this->json($links), 200);

/*
		$userID = NULL;
        if (isset($this->_request['userID'])) {
            $userID = (int)$this -> _request['userID'];

            if ($this->getTokenUserID() != $userID) {
    		    $this -> response('', 301);
            }
        }

        $topicID = NULL;
        if (isset($this->_request['topicID'])) {
            $topicID = (int)$this -> _request['topicID'];
        }


        $query = "";
        if (! is_null($topicID)) {
            if (! is_null($userID)) {
                error_log("UserID: " + $userID);
                $query = "SELECT distinct c.linkID, c.linkName, c.linkURL, c.dateAdded, c.datePublish, c.topicID, c.formatID, t.topicName, l.formatName, c.tagsJSON, c.userID, c.readStatus";
                $query .= " FROM links c INNER JOIN topics t ON c.topicID = t.topicID INNER JOIN linkFormats l ON c.formatID = l.linkFormatID  WHERE c.userID = $userID AND c.topicID = $topicID ORDER BY c.linkID DESC";
            } else {
                error_log("No userID");
                $query = "SELECT distinct c.linkID, c.linkName, c.linkURL, c.dateAdded, c.datePublish, c.topicID, c.formatID, t.topicName, l.formatName, c.tagsJSON, c.userID, c.readStatus";
                $query .= " FROM links c INNER JOIN topics t ON c.topicID = t.topicID INNER JOIN linkFormats l ON c.formatID = l.linkFormatID AND c.topicID = $topicID ORDER BY c.linkID DESC";
            }
        } else {
            if (! is_null($userID)) {
                error_log("UserID: " + $userID);
                $query = "SELECT distinct c.linkID, c.linkName, c.linkURL, c.dateAdded, c.datePublish, c.topicID, c.formatID, t.topicName, l.formatName, c.tagsJSON, c.userID, c.readStatus";
                $query .= " FROM links c INNER JOIN topics t ON c.topicID = t.topicID INNER JOIN linkFormats l ON c.formatID = l.linkFormatID  WHERE c.userID = $userID ORDER BY c.linkID DESC";
            } else {
                error_log("No userID");
                $query = "SELECT distinct c.linkID, c.linkName, c.linkURL, c.dateAdded, c.datePublish, c.topicID, c.formatID, t.topicName, l.formatName, c.tagsJSON, c.userID, c.readStatus";
                $query .= " FROM links c INNER JOIN topics t ON c.topicID = t.topicID INNER JOIN linkFormats l ON c.formatID = l.linkFormatID ORDER BY c.linkID DESC";
            }
        }

		error_log($query);
		$r = $this -> mysqli -> query($query) or die($this -> mysqli -> error . __LINE__);

		if ($r -> num_rows > 0) {
			$result = array();
			while ($row = $r -> fetch_assoc()) {
				$result[] = $row;
			}


			$this -> response($this->json($result), 200);
			// send user details
		} else {
		    $this -> response('', 204);
		    // If no records "No Content" status
		}*/
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
                $linkURL = $this->mysqli->real_escape_string($linkURL);
            } else {
    		    $this -> response('', 204);
            }


            $query = "";
            $query = "SELECT distinct c.linkID, c.linkName, c.linkURL, c.dateAdded, c.datePublish, c.topicID, c.formatID, t.topicName, l.formatName, c.tagsJSON, c.userID, c.readStatus";
            $query .= " FROM links c INNER JOIN topics t ON c.topicID = t.topicID INNER JOIN linkFormats l ON c.formatID = l.linkFormatID  WHERE c.linkURL = '$linkURL' ORDER BY c.linkID DESC";
    		error_log($query);
    		$r = $this -> mysqli -> query($query) or die($this -> mysqli -> error . __LINE__);

    		if ($r -> num_rows > 0) {
    			//$result = array();
    			while ($row = $r -> fetch_assoc()) {
    			//	$result[] = $row;
    			    $result = $row;
    			}


    			$this -> response($this->json($result), 200);
    			// send user details
    		} else {
    		    $this -> response('', 204);
    		    // If no records "No Content" status
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

        // LinkID or error
        if (is_numeric($this->_request['id'])) {
            $id = (int)$this -> _request['id'];
        } else {
            $this->response('', 204);
        }

   		$query = "SELECT c.linkID, c.linkName, c.linkURL, c.dateAdded, c.datePublish, c.topicID, c.formatID, c.tagsJSON, c.userID, c.userPriv, c.readStatus ";
        $query .= " FROM links c where (c.linkID=? and userPriv=0) OR (c.linkID=? and userID=?)";

        $r = $this->mysqli->prepare($query);
        $r->bind_param('iii',
            $id,
            $id,
            $userID);

		if (! $r->execute()) { // or die($this -> mysqli -> error . __LINE__);
		    error_log("EXECUTE " . $this -> mysqli -> error);
		}

        $result = NULL;
        $r->bind_result($linkID, $linkName, $linkURL, $dateAdded, $datePublish, $topicID, $formatID, $tagsJSON, $userID, $userPriv, $readStatus);
        while ($r->fetch()) {
            $result = array(
                'linkID' => $linkID,
                'linkName' => $linkName,
                'linkURL' => $linkURL,
                'dateAdded' => $dateAdded,
                'datePublish' => $datePublish,
                'topicID' => (string)$topicID,
                'formatID' => strval($formatID),
                'tagsJSON' => $tagsJSON,
                'userID' => $userID,
                'userPriv' => $userPriv,
                'readStatus' => (string)$readStatus
            );
         }
         if ($result['datePublish'] == '1970-01-01') {
            unset($result['datePublish']);
         }
         //error_log($result['datePublish']);

        if (! is_null($result)) {
            $this -> response($this -> json($result), 200);
		} else {
    		//error_log("NO");
    		// If no records "No Content" status
	    	$this -> response('', 204);
        }
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

        $userID = $this->getTokenUSerID();

      	$link = json_decode(file_get_contents("php://input"), true);

        $link['readStatusInitial'] = $link['readStatus'];

		$query = 'INSERT INTO links (linkName, linkURL, dateAdded, datePublish, topicID, formatID, tagsJSON, userID, userPriv, readStatus)';
		$query .= ' VALUES (?, ?, now(), ? , ?, ?, ?, ?, ?, ?)';

		error_log("AAA: " . $link['datePublish']);

        $r = $this->mysqli->prepare($query);
        $r->bind_param('sssiisiii',
            $link['linkName'],
            $link['linkURL'],
            $link['datePublish'],
            $link['topicID'],
            $link['formatID'],
            $link['tagsJSON'],
            $userID,
            $link['userPriv'],
            $link['readStatus']);

        $ret = $r->execute();

        $r->close();
        $this->mysqli->close();

        if (! $ret) {
            error_log("NOPE");
			$this -> response('', 204);
        } else {
   			$success = array('status' => "Success", "msg" => "Link Created Successfully.", "data" => $link);
   			$this -> response($this -> json($success), 200);
        }
	}


    private function canWriteLink($userID, $linkID) {
        $query = 'SELECT t.userID, t.userPriv FROM links c INNER JOIN topics t ON c.topicID = t.topicID WHERE c.linkID = ?';
        $r = $this->mysqli->prepare($query);
        $r->bind_param('i', $linkID);


        $ret = $r->execute();

        if (! $ret) {
            return false;
        } else {
   			return true;
        }
    }

    private function canWriteTopic($userID, $topicID) {
        $query = 'SELECT t.userID, t.userPriv FROM topics t WHERE (t.topicID = ? AND t.userID = ?) or (t.topicID = ? AND t.userPriv = 0)';
        $r = $this->mysqli->prepare($query);
        $r->bind_param('iii', $topicID, $userID, $topicID);

        $ret = $r->execute();

        if (! $ret) {
            return false;
        } else {
   			return true;
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
		$id = (int)$link2['id'];

		if (! $this->canWriteLink($userID, $id)) {
			$this -> response('', 401);
            return;
		}

        $query = 'UPDATE links SET linkName=?, linkURL=?, datePublish=?, topicID=?, formatID=?, tagsJSON=?, readStatus=?';
        $query .= ' WHERE linkID=?';

        $r = $this->mysqli->prepare($query);
        $r->bind_param('sssiisii',
            $link['linkName'],
            $link['linkURL'],
            $link['datePublish'],
            $link['topicID'],
            $link['formatID'],
            $link['tagsJSON'],
            $link['readStatus'],
            $id);

        $ret = $r->execute();

        $r->close();
        $this->mysqli->close();

        if (! $ret) {
            error_log("A0: " . $r->error);
			$this -> response('', 204);
        } else {
            error_log("YES");
			$success = array(
			    'status' => "Success",
			    "msg" => "Link " . $id . " Updated Successfully.",
			    "data" => $link2
			);
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

		$id = (int)$this -> _request['id'];

        if (! $this->canWriteLink($userID, $id)) {
            $this -> response('', 401);
            return;
        }

		if ($id > 0) {
			$query = "DELETE FROM links WHERE linkID = $id";
			$r = $this -> mysqli -> query($query) or die($this -> mysqli -> error . __LINE__);
			$success = array('status' => "Success", "msg" => "Successfully deleted one record.");
			$this -> response($this -> json($success), 200);
		} else
			$this -> response('', 204);
		// If no records "No Content" status
	}

	/*** Topics ***/
	private function topics() {
		if ($this -> get_request_method() != "GET") {
			$this -> response('', 406);
		}
		$query = "SELECT distinct t.topicID, t.topicName, t.description FROM topics t ORDER BY topicName ASC";
		$r = $this -> mysqli -> query($query) or die($this -> mysqli -> error . __LINE__);

		if ($r -> num_rows > 0) {
			$result = array();
			while ($row = $r -> fetch_assoc()) {
				$result[] = $row;
			}
			$this -> response($this -> json($result), 200);
			// send user details
		}
		$this -> response('', 204);
		// If no records "No Content" status
	}

		private function topicsForUser() {
    		if ($this -> get_request_method() != "GET") {
    			$this -> response('', 406);
    		}

    		$userID = (int)$this -> _request['userID'];

    		$query = "SELECT t.topicID, t.topicName, t.description FROM topics t WHERE t.userID = $userID  ORDER BY topicName ASC";
    		error_log($query);
    		$r = $this -> mysqli -> query($query) or die($this -> mysqli -> error . __LINE__);

    		if ($r -> num_rows > 0) {
    			$result = array();
    			while ($row = $r -> fetch_assoc()) {
    				$result[] = $row;
    				//error_log($row);
    			}
    			$this -> response($this -> json($result), 200);
    			// send user details
    		}
    		$this -> response('', 204);
    		// If no records "No Content" status
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

        // TopicID or error
        if (is_numeric($this->_request['id'])) {
            $id = (int)$this -> _request['id'];
        } else {
            $this->response('', 204);
        }

        $query = "SELECT t.topicID, t.topicName, t.description, t.userID, t.userPriv FROM topics t ";
        $query .= " WHERE (t.topicID=1 and t.userPriv=?) OR (t.topicID=? and t.userID=?)";

        $r = $this->mysqli->prepare($query);
        $r->bind_param('iii',
            $id,
            $id,
            $userID);

        if (! $r->execute()) { // or die($this -> mysqli -> error . __LINE__);
            error_log("EXECUTE " . $this -> mysqli -> error);
        }

        $result = NULL;
        $r->bind_result($topicID, $topicName, $description, $userID, $userPriv);
        while ($r->fetch()) {
            $result = array(
                'topicID' => $topicID,
                'topicName' => $topicName,
                'description' => $description,
                'userID' => $userID,
                'userPriv' => (string) $userPriv
            );
         }

        if (! is_null($result)) {
            $this -> response($this -> json($result), 200);
        } else {
            error_log("NO");
            // If no records "No Content" status
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

        $userID = $this->getTokenUSerID();
        if (is_null($userID)) {
			$this -> response('', 401);
            return;
        }

		$topic2 = json_decode(file_get_contents("php://input"), true);
		$topic = $topic2['topic'];
		$id = (int)$topic2['id'];

		if (! $this->canWriteTopic($userID, $id)) {
		    error_log("UserID: $userID   ID: $id");
			$this -> response('', 401);
            return;
		}

        $query = 'UPDATE topics SET topicName=?, description=?, userPriv=?';
        $query .= ' WHERE topicID=?';

        $r = $this->mysqli->prepare($query);
        $r->bind_param('ssii',
            $topic['topicName'],
            $topic['description'],
            $topic['userPriv'],
            $id);

        $ret = $r->execute();

        $r->close();
        $this->mysqli->close();

        if (! $ret) {
            error_log("A0: " . $r->error);
			$this -> response('', 204);
        } else {
            error_log("YES");
			$success = array(
			    'status' => "Success",
			    "msg" => "Topic " . $id . " Updated Successfully.",
			    "data" => $topic2
			);
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

		$query = "INSERT INTO topics ( topicName, description, userID )";
		$query .= " VALUES (?, ?, ?)";

        $r = $this->mysqli->prepare($query);
        $r->bind_param('ssi', $topic['topicName'], $topic['description'], $userID );

        $ret = $r->execute();

        //$r->close();
        //$this->mysqli->close();

        if (! $ret) {
            error_log("A0: " . $r->error);
			$this -> response('', 204);
        } else {
			$success = array('status' => "Success", "msg" => "Topic Created Successfully.", "data" => $topic, "topicID" => $r->insert_id);

   		    $this -> response($this -> json($success), 200);
        }
	}

	/*** Formats ***/
	private function formats() {
		if ($this -> get_request_method() != "GET") {
			$this -> response('', 406);
		}
		$query = "SELECT distinct f.linkFormatID, f.formatName, f.description FROM linkFormats f ORDER BY linkFormatID ASC";
		$r = $this -> mysqli -> query($query) or die($this -> mysqli -> error . __LINE__);

		if ($r -> num_rows > 0) {
			$result = array();
			while ($row = $r -> fetch_assoc()) {
				$result[] = $row;
			}
			$this -> response($this -> json($result), 200);
			// send user details
		}
		$this -> response('', 204);
		// If no records "No Content" status
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
