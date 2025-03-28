use tauri::async_runtime::Mutex;

use crate::{network::{self, ConsensusRes, ServerData, ServerStructure}, AppContext, AppState};

impl ServerData {
    pub fn test_server() -> ServerData {
        ServerData {
            name: "Consensus Server".to_string(),
            instance: "localhost".to_string(),
            id: "000000".to_string(),
        }
    }
}

#[derive(serde::Serialize, Clone)]
pub struct ServerRole {
    name: String,
    colour: String,
    sort_by: bool,
    id: String,
}

#[tauri::command]
pub fn get_server_list() -> Vec<ServerData> {
    vec![
        ServerData {
            name: "Consensus Server".to_string(),
            instance: "localhost".to_string(),
            id: "000000".to_string(),
        };
        1
    ]
}

#[tauri::command]
pub async fn open_server(
    state: tauri::State<'_, Mutex<AppState>>,
    instance: &str,
    id: &str,
) -> Result<ServerStructure, String> {
    let mut astate = state.lock().await;
    astate.context = AppContext::Server(instance.into(), id.into());
    let token = astate.token(instance).await;

    let req = network::make_req(
        &astate,
        instance,
        network::ConsensusReq::ReqServerStructure { token, server_id: id.to_string() }
    )
    .await;

    match req {
        Ok(res) => {
            match res {
                ConsensusRes::ServerStructure(sstruct) => return Ok(sstruct),
                ConsensusRes::Error(e) => return Err(e.to_string()),
                _ => return Err("Unexpected response".to_string())
            }
        },
        Err(e) => return Err(e),
    }
}

#[tauri::command]
pub async fn create_server(
    state: tauri::State<'_, Mutex<AppState>>,
    instance: &str,
    server_name: &str,
) -> Result<ServerData, String> {
    let mut astate = state.lock().await;
    let token = astate.token(instance).await;
    let res = network::make_req(
        &astate,
        instance,
        network::ConsensusReq::CreateServer {
            token,
            server_name: server_name.to_string()
        }).await?;
    
    let sid = match res {
        ConsensusRes::Error(e) => return Err(e.to_string()),
        ConsensusRes::ServerJoin(sid) => {sid}
        _ => return Err("Unexpected response".to_string()),
    };

    // Successfully created server, joining it:
    let data = get_server_data(&mut astate, instance, &sid).await?;

    astate.sync_user_data().await?;
    astate.synced_user_data.servers.push(data.clone());
    astate.sync_user_data().await?;

    Ok(data)
}

#[tauri::command]
pub async fn join_server(
    state: tauri::State<'_, Mutex<AppState>>,
    instance: &str,
    server_id: &str,
) -> Result<ServerData, String> {
    let mut astate = state.lock().await;
    let token = astate.token(instance).await;
    let res = network::make_req(
        &astate,
        instance,
        network::ConsensusReq::JoinServer { token, server_id: server_id.to_string() }
    ).await?;
    
    let sid = match res {
        ConsensusRes::Error(e) => return Err(e.to_string()),
        ConsensusRes::ServerJoin(sid) => {sid}
        _ => return Err("Unexpected response".to_string()),
    };

    // Successfully created server, joining it:
    let data = get_server_data(&mut astate, instance, &sid).await?;

    astate.sync_user_data().await?;
    astate.synced_user_data.servers.push(data.clone());
    astate.sync_user_data().await?;

    Ok(data)
}

async fn get_server_data(state: &mut AppState, instance: &str, server_id: &str) -> Result<ServerData, String> {
    let token = state.token(instance).await;
    let req = network::make_req(
        &state,
        instance,
        network::ConsensusReq::ReqServerData { token, server_id: server_id.to_string() }
    ).await;

    match req {
        Ok(res) => {
            match res {
                ConsensusRes::ServerData(d) => return Ok(d),
                ConsensusRes::Error(e) => return Err(e.to_string()),
                _ => return Err("Unexpected response".to_string())
            }
        },
        Err(e) => return Err(e),
    }
}