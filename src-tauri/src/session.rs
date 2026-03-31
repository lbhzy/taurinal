use std::collections::HashMap;
use std::sync::mpsc;
use std::sync::Mutex;

pub enum SessionCmd {
    Write(Vec<u8>),
    Resize { rows: u16, cols: u16 },
    Close,
}

pub struct SessionManager {
    senders: Mutex<HashMap<u32, mpsc::Sender<SessionCmd>>>,
    next_id: Mutex<u32>,
}

impl SessionManager {
    pub fn new() -> Self {
        Self {
            senders: Mutex::new(HashMap::new()),
            next_id: Mutex::new(1),
        }
    }

    pub fn next_id(&self) -> u32 {
        let mut id = self.next_id.lock().unwrap();
        let current = *id;
        *id += 1;
        current
    }

    pub fn register(&self, id: u32, sender: mpsc::Sender<SessionCmd>) {
        self.senders.lock().unwrap().insert(id, sender);
    }

    pub fn remove(&self, id: u32) {
        let mut senders = self.senders.lock().unwrap();
        if let Some(tx) = senders.remove(&id) {
            let _ = tx.send(SessionCmd::Close);
        }
    }

    pub fn send(&self, id: u32, cmd: SessionCmd) -> Result<(), String> {
        let senders = self.senders.lock().unwrap();
        if let Some(tx) = senders.get(&id) {
            tx.send(cmd).map_err(|e| format!("Session {} send error: {}", id, e))
        } else {
            Err(format!("Session {} not found", id))
        }
    }
}

#[tauri::command]
pub fn session_write(
    state: tauri::State<'_, SessionManager>,
    id: u32,
    data: String,
) -> Result<(), String> {
    state.send(id, SessionCmd::Write(data.into_bytes()))
}

#[tauri::command]
pub fn session_resize(
    state: tauri::State<'_, SessionManager>,
    id: u32,
    rows: u16,
    cols: u16,
) -> Result<(), String> {
    state.send(id, SessionCmd::Resize { rows, cols })
}

#[tauri::command]
pub fn session_close(state: tauri::State<'_, SessionManager>, id: u32) -> Result<(), String> {
    state.remove(id);
    Ok(())
}
