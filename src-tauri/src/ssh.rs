use ssh2::Session;
use std::io::{Read, Write};
use std::net::TcpStream;
use std::sync::mpsc;
use std::time::Duration;
use tauri::{AppHandle, Emitter};

use crate::session::{SessionCmd, SessionManager};

#[tauri::command]
pub fn ssh_connect(
    app: AppHandle,
    state: tauri::State<'_, SessionManager>,
    host: String,
    port: u16,
    username: String,
    auth_method: String,
    password: Option<String>,
    key_path: Option<String>,
    rows: u16,
    cols: u16,
) -> Result<u32, String> {
    let addr = format!("{}:{}", host, port);
    let tcp = TcpStream::connect(&addr).map_err(|e| format!("TCP connect failed: {}", e))?;

    let mut sess = Session::new().map_err(|e| format!("SSH session error: {}", e))?;
    sess.set_tcp_stream(tcp);
    sess.handshake()
        .map_err(|e| format!("SSH handshake failed: {}", e))?;

    match auth_method.as_str() {
        "password" => {
            let pwd = password.ok_or("Password required")?;
            sess.userauth_password(&username, &pwd)
                .map_err(|e| format!("SSH password auth failed: {}", e))?;
        }
        "key" => {
            let key = key_path.ok_or("Key path required")?;
            sess.userauth_pubkey_file(
                &username,
                None,
                std::path::Path::new(&key),
                password.as_deref(),
            )
            .map_err(|e| format!("SSH key auth failed: {}", e))?;
        }
        _ => return Err(format!("Unknown auth method: {}", auth_method)),
    }

    if !sess.authenticated() {
        return Err("SSH authentication failed".to_string());
    }

    let mut channel = sess
        .channel_session()
        .map_err(|e| format!("SSH channel error: {}", e))?;

    channel
        .request_pty("xterm-256color", None, Some((cols as u32, rows as u32, 0, 0)))
        .map_err(|e| format!("SSH pty request failed: {}", e))?;

    channel
        .shell()
        .map_err(|e| format!("SSH shell request failed: {}", e))?;

    let id = state.next_id();
    let (tx, rx) = mpsc::channel::<SessionCmd>();
    state.register(id, tx);

    // SSH session + channel are not Send, so we handle everything in one dedicated thread.
    // We use non-blocking mode to poll reads while checking for write commands.
    sess.set_blocking(false);

    let app_handle = app.clone();
    let session_id = id;

    std::thread::spawn(move || {
        let _sess = sess; // keep session alive
        let mut channel = channel;
        let mut buf = [0u8; 4096];

        loop {
            // Check for incoming commands (non-blocking)
            match rx.try_recv() {
                Ok(SessionCmd::Write(data)) => {
                    // Temporarily set blocking for write
                    _sess.set_blocking(true);
                    let _ = channel.write_all(&data);
                    let _ = channel.flush();
                    _sess.set_blocking(false);
                }
                Ok(SessionCmd::Resize { rows, cols }) => {
                    _sess.set_blocking(true);
                    let _ = channel.request_pty_size(cols as u32, rows as u32, None, None);
                    _sess.set_blocking(false);
                }
                Ok(SessionCmd::Close) => {
                    let _ = channel.send_eof();
                    let _ = channel.close();
                    break;
                }
                Err(mpsc::TryRecvError::Empty) => {}
                Err(mpsc::TryRecvError::Disconnected) => break,
            }

            // Try to read output (non-blocking)
            match channel.read(&mut buf) {
                Ok(0) => {
                    if channel.eof() {
                        break;
                    }
                }
                Ok(n) => {
                    let data = String::from_utf8_lossy(&buf[..n]).to_string();
                    let _ = app_handle.emit(&format!("session-output-{}", session_id), &data);
                }
                Err(ref e) if e.kind() == std::io::ErrorKind::WouldBlock => {
                    // No data available, sleep briefly to avoid busy-looping
                    std::thread::sleep(Duration::from_millis(10));
                }
                Err(_) => break,
            }

            if channel.eof() {
                break;
            }
        }

        let _ = app_handle.emit(&format!("session-exit-{}", session_id), ());
    });

    Ok(id)
}
