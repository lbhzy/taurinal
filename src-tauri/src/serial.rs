use serialport::{self, SerialPortType};
use std::io::{Read, Write};
use std::sync::mpsc;
use std::time::Duration;
use tauri::{AppHandle, Emitter};

use crate::session::{SessionCmd, SessionManager};

#[derive(serde::Serialize)]
pub struct SerialPortInfo {
    pub port_name: String,
    pub port_type: String,
}

#[tauri::command]
pub fn serial_list_ports() -> Result<Vec<SerialPortInfo>, String> {
    let ports = serialport::available_ports().map_err(|e| e.to_string())?;
    Ok(ports
        .into_iter()
        .map(|p| SerialPortInfo {
            port_name: p.port_name,
            port_type: match p.port_type {
                SerialPortType::UsbPort(_) => "USB".to_string(),
                SerialPortType::BluetoothPort => "Bluetooth".to_string(),
                SerialPortType::PciPort => "PCI".to_string(),
                SerialPortType::Unknown => "Unknown".to_string(),
            },
        })
        .collect())
}

#[tauri::command]
pub fn serial_connect(
    app: AppHandle,
    state: tauri::State<'_, SessionManager>,
    port_name: String,
    baud_rate: u32,
) -> Result<u32, String> {
    let port = serialport::new(&port_name, baud_rate)
        .timeout(Duration::from_millis(100))
        .open()
        .map_err(|e| format!("Failed to open serial port {}: {}", port_name, e))?;

    let mut reader = port
        .try_clone()
        .map_err(|e| format!("Failed to clone serial port: {}", e))?;

    let id = state.next_id();
    let (tx, rx) = mpsc::channel::<SessionCmd>();
    state.register(id, tx);

    // Writer thread
    let session_id = id;
    std::thread::spawn(move || {
        let mut port = port;
        while let Ok(cmd) = rx.recv() {
            match cmd {
                SessionCmd::Write(data) => {
                    if port.write_all(&data).is_err() || port.flush().is_err() {
                        break;
                    }
                }
                SessionCmd::Resize { .. } => {
                    // Serial ports don't support resize
                }
                SessionCmd::Close => break,
            }
        }
    });

    // Reader thread
    let app_handle = app.clone();
    std::thread::spawn(move || {
        let mut buf = [0u8; 4096];
        loop {
            match reader.read(&mut buf) {
                Ok(0) => break,
                Ok(n) => {
                    let data = String::from_utf8_lossy(&buf[..n]).to_string();
                    let _ = app_handle.emit(&format!("session-output-{}", session_id), &data);
                }
                Err(ref e) if e.kind() == std::io::ErrorKind::TimedOut => {
                    // Timeout is normal for serial, just continue
                    continue;
                }
                Err(_) => break,
            }
        }
        let _ = app_handle.emit(&format!("session-exit-{}", session_id), ());
    });

    Ok(id)
}
