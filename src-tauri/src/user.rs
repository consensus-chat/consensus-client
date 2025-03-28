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
            network::ConsensusRes::Login(instance, id, username, email, authkey_private) => {
                let account = Account {
                    instance,
                    id,
                    username,
                    email,
                    authkey_private,
                };
                state.account = Some(account.clone());
                state.get_user_data().await?;
                
                Ok(account)
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
            network::ConsensusRes::Login(instance, id, username, email, authkey_private) => {
                let account = Account {
                    instance,
                    id,
                    username,
                    email,
                    authkey_private,
                };
                state.account = Some(account.clone());
                state.get_user_data().await?;
                
                Ok(account)
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
    let authkey = hex::decode(account.authkey_private.clone()).expect("Expecting authkey to be valid hex");

    let msg = sign_on_instance.clone() + &id;
    let key = ring::signature::Ed25519KeyPair::from_pkcs8(&authkey).expect("Expecting authkey to be a valid Ed25519 key pair");
    let signature = key.sign(msg.as_bytes());

    let res = make_req(state, instance, ConsensusReq::ReqToken { instance: sign_on_instance, user_id: id, signature: signature.encode_hex() }).await;

    match res {
        Ok(res) => {
            match res {
                ConsensusRes::Token(token) => Ok(token),
                _ => Err(()),
            }
        },
        Err(_) => Err(()),
    }
}

impl crate::AppState {
    /// get token for instance from auth_tokens, if no valid one is available, request one
    pub async fn token(&mut self, instance: &str) -> String {
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

    // get user data from sign on instance, overwrite current user data so it is mainly ued for logging in.
    pub async fn get_user_data(&mut self) -> Result<(), String> {
        let sign_on_instance = self.account.as_ref().expect("can only get user data with account").instance.clone();
        let token = self.token(&sign_on_instance).await;

        let res = network::make_req(
            &self,
            &sign_on_instance,
            ConsensusReq::ReqUserData { token }
        )
        .await?;

        match res {
            ConsensusRes::SyncedUserData(data) => self.synced_user_data = data,
            ConsensusRes::Error(e) => return Err(e.to_string()),
            _ => return Err("Unexpected response".into())
        }

        Ok(())
    }

    // sync user data from sign on instance
    pub async fn sync_user_data(&mut self) -> Result<(), String> {
        let sign_on_instance = self.account.as_ref().expect("can only get user data with account").instance.clone();
        let token = self.token(&sign_on_instance).await;
        let data = self.synced_user_data.clone();

        let res = network::make_req(
            &self,
            &sign_on_instance,
            ConsensusReq::SyncUserData { token, data }
        )
        .await?;

        match res {
            ConsensusRes::SyncedUserData(data) => self.synced_user_data = data,
            ConsensusRes::Error(e) => return Err(e.to_string()),
            _ => return Err("Unexpected response".into())
        }
        
        Ok(())
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