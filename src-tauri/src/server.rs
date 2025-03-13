use std::sync::Mutex;

use crate::AppContext;

#[derive(serde::Serialize, Clone)]
pub struct ServerInfo {
    name: String,
    instance: String,
    id: String,
    channel_open_id: String,
}

impl ServerInfo {
    pub fn test_server() -> ServerInfo {
        ServerInfo {
            name: "Consensus Server".to_string(),
            instance: "localhost".to_string(),
            id: "000000".to_string(),
            channel_open_id: "0312309832".into()
        }
    }
}

#[derive(serde::Serialize, Clone)]
pub struct ServerStructure {
    name: String,
    /// channels with name, id tuples
    channels: Vec<(String, String)>,
    roles: Vec<ServerRole>,
}

#[derive(serde::Serialize, Clone)]
pub struct ServerRole {
    name: String,
    colour: String,
    sort_by: bool,
    id: String,
}

#[tauri::command]
pub fn get_server_list() -> Vec<ServerInfo> {
    vec![ServerInfo {
        name: "Consensus Server".to_string(),
        instance: "localhost".to_string(),
        id: "000000".to_string(),
        channel_open_id: "9728127".into()
    }; 1]
}

#[tauri::command]
pub fn open_server(state: tauri::State<'_,Mutex<crate::AppState> > , instance: &str, id: &str) -> ServerStructure {
    let mut astate = state.lock().unwrap();
    astate.context = AppContext::Server(instance.into(), id.into());
    ServerStructure {
        name: "Consensus Server".to_string(),
        channels: vec![("general".to_string(), "10382".to_string()), ("genderal".to_string(), "1230382".to_string())],
        roles: vec![],
    }
}