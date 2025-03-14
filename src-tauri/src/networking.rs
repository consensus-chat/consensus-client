use tauri::async_runtime::Mutex;

/// Enum for all consensus protocol requests
#[derive(serde::Serialize, serde::Deserialize, Clone)]
pub enum ConsensusReq {
    Login {email: String, password: String},
}

/// Enum for all consensus protocol responses
#[derive(serde::Serialize, serde::Deserialize, Clone)]
pub enum ConsensusRes {
    /// Login response, either success with authkey or failure with error
    Login {res: Result<String, String>},
}


pub async fn make_req(state: tauri::State<'_,Mutex<crate::AppState> >, instance: String, req: ConsensusReq) -> Result<ConsensusRes, String> {
    let res = match state.lock().await.client.post(format!("http://{}", instance))
        .json(&req)
        .send()
        .await {
            Ok(res) => res,
            Err(err) => return Err(err.to_string()),
        };

    match serde_json::from_str(&res.text().await.unwrap()) {
        Ok(req) => Ok(req),
        Err(_) => Err("Couldn't parse response. Is Instance correct and supported?".into()),
    }
}