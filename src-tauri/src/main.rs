// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::collections::HashMap;

use network::ConsensusToken;
use server::ServerInfo;
use tauri::{async_runtime::Mutex, Manager};

mod network;
mod server;
mod user;

use tauri_plugin_store::StoreExt;

/// Current open view
enum AppContext {
    /// Current view is login
    Login,
    /// Current view is an open server with id
    Server(String, String),
    DirectMessage(String),
    Friends,
}

#[derive(Clone, serde::Deserialize, serde::Serialize)]
struct Account {
    instance: String,
    id: String,
    username: String,
    email: String,
    authkey_private: String,
}

#[derive(Clone, serde::Deserialize, serde::Serialize)]
struct OnlineInfo {
    servers: Vec<server::ServerInfo>,
}

struct AppState {
    context: AppContext,
    servers: Vec<server::ServerInfo>,
    account: Option<Account>,
    client: reqwest::Client,
    /// Information that is stored on the sign-on instance and synced over all devices. This includes most
    /// of the application info like added servers, friends and some settings
    online_info: Option<OnlineInfo>,
    /// Authentication tokens for instances. Do not access these directly, use the `AppState::token()`
    /// function instead. The function checks for token validity and automatically requests new tokens
    /// from instances.
    auth_tokens: HashMap<String, ConsensusToken>
}

#[derive(Clone, serde::Deserialize, serde::Serialize)]
struct InterfaceState {
    account: Option<Account>,
    servers: Vec<ServerInfo>,
}

impl InterfaceState {
    fn from_app_state(state: &AppState) -> InterfaceState {
        InterfaceState {
            account: state.account.clone(),
            servers: state.servers.clone()
        }
    }
}


#[tauri::command]
async fn pull_state(state: tauri::State<'_, Mutex<crate::AppState>>) -> Result<InterfaceState, ()> {
    let lstate = &state.lock().await;
    Ok(InterfaceState::from_app_state(&lstate))
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            let store = app.store("store.json")?;

            let app_state = AppState {
                context: AppContext::Login,
                servers: vec![server::ServerInfo::test_server()],
                account: match store.get("account") {
                        Some(account) => Some(serde_json::from_value(account)?),
                        None => None,
                    },
                client: reqwest::Client::new(),
                online_info: None,
                auth_tokens: HashMap::new(),
            };

            app.manage(store);
            app.manage(Mutex::new(app_state));

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            user::attempt_login,
            user::attempt_registration,
            user::gather_account_info,
            pull_state,
            server::get_server_list,
            server::open_server
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");

}
