use std::ops::DerefMut;

use hex::ToHex;
use tauri::async_runtime::Mutex;

use crate::network::*;
use crate::network;
use crate::Account;
use crate::InterfaceState;

#[tauri::command]
pub async fn attempt_login(
    state: tauri::State<'_, Mutex<crate::AppState>>,
    instance: String,
    email: String,
    password: String,
) -> Result<Account, String> {
    let mut state = state.lock().await;
    let res = network::make_req(
            &state,
            &instance,
            ConsensusReq::Login { email, password },
        ).await;

    match res {
        Ok(res) => match res {
            network::ConsensusRes::Login { res } => match res {
                Ok(res) => {
                    let account = Account {
                        instance: res.0.clone(),
                        id: res.1.clone(),
                        username: res.2.clone(),
                        email: res.3.clone(),
                        authkey_private: res.4.clone(),
                    };
                    state.account = Some(account.clone());
                    
                    Ok(account)
                }
                Err(e) => Err(e),
            },
            _ => Err("Unexpected response".into())
        },
        Err(e) => Err(e),
    }
}

#[tauri::command]
pub async fn attempt_registration(
    state: tauri::State<'_, Mutex<crate::AppState>>,
    instance: String,
    username: String,
    email: String,
    password: String,
) -> Result<Account, String> {
    let mut state = state.lock().await;
    let res = network::make_req(
            &state,
            &instance,
            ConsensusReq::Register { username, email, password },
        ).await;

    match res {
        Ok(res) => match res {
            network::ConsensusRes::Login { res } => match res {
                Ok(res) => {
                    let account = Account {
                        instance: res.0.clone(),
                        id: res.1.clone(),
                        username: res.2.clone(),
                        email: res.3.clone(),
                        authkey_private: res.4.clone(),
                    };
                    state.account = Some(account.clone());
                    
                    Ok(account)
                }
                Err(e) => Err(e),
            },
            _ => Err("Unexpected response".into())
        },
        Err(e) => Err(e),
    }
}

/// Request an authentication token from an instance by sending a signed messages.
pub async fn request_token(state: &crate::AppState, instance: &str) -> Result<ConsensusToken, ()> {
    let account = state.account.as_ref().expect("Need to be logged in to request tokens.");
    let sign_on_instance = account.instance.clone();
    let id = account.id.clone();
    let authkey = hex::decode(account.authkey_private.clone()).expect("Expecting authkey to be valid hex.");

    let msg = sign_on_instance.clone() + &id;
    let key = ring::signature::Ed25519KeyPair::from_pkcs8(&authkey).expect("Expecting authkey to be a valid Ed25519 key pair");
    let signature = key.sign(msg.as_bytes());

    let res = make_req(state, instance, ConsensusReq::ReqToken { instance: sign_on_instance, user_id: id, signature: signature.encode_hex() }).await;

    match res {
        Ok(res) => {
            match res {
                ConsensusRes::Token { res } => {
                    match res {
                        Ok(token) => Ok(token),
                        Err(_) => Err(()),
                    }
                },
                _ => Err(()),
            }
        },
        Err(_) => Err(()),
    }
}

impl crate::AppState {
    /// get token for instance from auth_tokens, if no valid one is available, request one
    async fn token(&mut self, instance: &str) -> String {
        match self.auth_tokens.get(instance) {
            Some(token) => {
                let time_valid = chrono::NaiveDateTime::parse_from_str(&token.valid_until, "%Y-%m-%d %H:%M:%S").unwrap().and_utc();
                if time_valid > chrono::Utc::now() {
                    return token.token.clone()
                }
            },
            None => {},
        }
        let token = request_token(self, instance).await.unwrap();
        self.auth_tokens.insert(instance.to_string(), token.clone());
        return token.token;
    }
}


#[tauri::command]
pub async fn gather_account_info(state: tauri::State<'_, Mutex<crate::AppState>>) -> Result<InterfaceState, ()> {
    let mut s = state.lock().await;
    let state = s.deref_mut();
    let sign_on_instance = state.account.as_ref().expect("msg").instance.clone();
    state.token(&sign_on_instance).await;

    Ok(InterfaceState::from_app_state(&state))
}