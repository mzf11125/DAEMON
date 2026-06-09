use daemon_policy::{Effect, PolicyCheckRequest, PolicyEngine};
use std::io::{Read, Write};
use std::net::{TcpListener, TcpStream};

const MAX_BODY_BYTES: usize = 64 * 1024;

fn handle(mut stream: TcpStream, engine: &PolicyEngine) {
    let mut buf = vec![0u8; MAX_BODY_BYTES];
    let read = match stream.read(&mut buf) {
        Ok(n) => n,
        Err(_) => return,
    };
    if read == 0 {
        let _ = write_json(&mut stream, "deny", Some("empty request"));
        return;
    }
    let body = match std::str::from_utf8(&buf[..read]) {
        Ok(s) => s,
        Err(_) => {
            let _ = write_json(&mut stream, "deny", Some("invalid utf-8"));
            return;
        }
    };
    let req: PolicyCheckRequest = match serde_json::from_str(body) {
        Ok(r) => r,
        Err(_) => {
            let _ = write_json(&mut stream, "deny", Some("invalid json"));
            return;
        }
    };
    if req.action.is_empty() || req.resource.is_empty() {
        let _ = write_json(&mut stream, "deny", Some("action and resource required"));
        return;
    }
    let decision = engine.evaluate_request(&req);
    let effect = match decision.effect {
        Effect::Allow => "allow",
        Effect::Deny => "deny",
    };
    let _ = write_json(&mut stream, effect, decision.reason.as_deref());
}

fn write_json(stream: &mut TcpStream, effect: &str, reason: Option<&str>) -> std::io::Result<()> {
    let body = serde_json::json!({ "effect": effect, "reason": reason });
    writeln!(stream, "{}", body)
}

fn main() {
    let yaml = std::env::var("POLICY_RULES_YAML").unwrap_or_else(|_| String::new());
    let engine = if yaml.trim().is_empty() {
        PolicyEngine::new()
    } else {
        PolicyEngine::load_yaml(&yaml).expect("policy rules")
    };
    let addr = std::env::var("POLICY_ENGINE_ADDR").unwrap_or_else(|_| "127.0.0.1:8082".into());
    let listener = TcpListener::bind(&addr).expect("bind");
    eprintln!("policy-server on {}", addr);
    for stream in listener.incoming().flatten() {
        handle(stream, &engine);
    }
}
