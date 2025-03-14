// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::{async_runtime::Mutex, Manager};

mod networking;
mod server;

use networking::ConsensusReq;


/// Current open view
enum AppContext {
    /// Current view is login
    Login,
    /// Current view is an open server with id
    Server(String, String),
    DirectMessage(String),
    Friends,
}

struct Account {
    instance: String,
    id: String,
    username: String,
    email: String,
    authkey_private: String,
}

struct AppState {
    context: AppContext,
    servers: Vec<server::ServerInfo>,
    account: Option<Account>,
    client: reqwest::Client,
}

#[tauri::command]
async fn attempt_login(state: tauri::State<'_,Mutex<crate::AppState> > , instance: String, email: String, password: String) -> Result<String, String> {
    let res = networking::make_req(
        state,
        instance,
        ConsensusReq::Login {
            email,
            password
        }
    ).await;

    match res {
        Ok(res) => match res {
            networking::ConsensusRes::Login { res } => {
                match res {
                    Ok(key) => Ok(key),
                    Err(e) => Err(e)
                }
            }
        },
        Err(e) => Err(e),
    }
}

fn main() {
    let app_state = AppState {
        context: AppContext::Login,
        servers: vec![server::ServerInfo::test_server()],
        account: Some( Account { instance: "localhost".to_string(),
            id: "0921737".to_string(),
            username: "VioletSpace".to_string(),
            email: "vi@gmail.com".to_string(),
            authkey_private: "323981381238".to_string()
        }),
        client: reqwest::Client::new(),
    };

    tauri::Builder::default()
        .setup(|app| {
            app.manage(Mutex::new(app_state));
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![attempt_login, server::get_server_list, server::open_server])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
