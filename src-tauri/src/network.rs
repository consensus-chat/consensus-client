/// Enum for all consensus protocol requests
#[derive(serde::Serialize, serde::Deserialize, Clone)]
pub enum ConsensusReq {
    /// User login request
    Login {email: String, password: String},
    /// User registration request
    Register {username: String, email: String, password: String},
    /// User token request
    ReqToken {instance: String, user_id: String, signature: String},
    /// Instance requests user public key from another instance
    ReqUserKey {user_id: String}
}

/// Enum for all consensus protocol responses
#[derive(serde::Serialize, serde::Deserialize, Clone)]
pub enum ConsensusRes {
    /// Login response, either success with (instance, id, username, email, authkey_priv) or failure with error
    Login {res: Result<(String, String, String, String, String), String>},
    /// Token response, Token request may be denied -> Error
    Token {res: Result<ConsensusToken, ConsensusError>},
    /// User key response, a requested users public key
    UserKey {res: Result<String, ConsensusError>}
}

/// Struct for consensus auth token
#[derive(serde::Serialize, serde::Deserialize, Clone)]
pub struct ConsensusToken {
    pub token: String,
    pub valid_until: String,
}


/// Enum for all consensus protocol errors
#[derive(serde::Serialize, serde::Deserialize, Clone)]
pub enum ConsensusError {
    Rejected,
}

// Make a request to an instance
pub async fn make_req(
    state: &crate::AppState,
    instance: &str,
    req: ConsensusReq,
) -> Result<ConsensusRes, String> {
    let res = match state.client
        .post(format!("http://{}", instance))
        .json(&req)
        .send()
        .await
    {
        Ok(res) => res,
        Err(_) => { return Err(format!("Error connecting to '{}'", instance)) },
    };

    match serde_json::from_str(&res.text().await.unwrap()) {
        Ok(req) => Ok(req),
        Err(_) => Err("Couldn't parse response. Is Instance correct and supported?".into()),
    }
}
