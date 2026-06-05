use daemon_policy::{Effect, PolicyCheckRequest, PolicyEngine};
use std::io::{Read, Write};
use std::net::{TcpListener, TcpStream};

const MAX_BODY_BYTES: usize = 64 * 1024;

fn load_engine() -> PolicyEngine {
    let yaml = std::env::var("POLICY_RULES_YAML").unwrap_or_else(|_| String::new());
    if yaml.trim().is_empty() {
        PolicyEngine::new()
    } else {
        PolicyEngine::load_yaml(&yaml).expect("policy rules")
    }
}

fn write_http_response(
    stream: &mut TcpStream,
    status: u16,
    reason: &str,
    body: &str,
) -> std::io::Result<()> {
    let response = format!(
        "HTTP/1.1 {status} {reason}\r\nContent-Type: application/json\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{body}",
        body.len()
    );
    stream.write_all(response.as_bytes())
}

fn handle_check(stream: &mut TcpStream, body: &str, engine: &PolicyEngine) {
    let req: PolicyCheckRequest = match serde_json::from_str(body) {
        Ok(r) => r,
        Err(_) => {
            let _ = write_http_response(
                stream,
                400,
                "Bad Request",
                r#"{"effect":"deny","reason":"invalid json"}"#,
            );
            return;
        }
    };
    if req.action.is_empty() || req.resource.is_empty() {
        let _ = write_http_response(
            stream,
            400,
            "Bad Request",
            r#"{"effect":"deny","reason":"action and resource required"}"#,
        );
        return;
    }
    let decision = engine.evaluate_request(&req);
    let effect = match decision.effect {
        Effect::Allow => "allow",
        Effect::Deny => "deny",
    };
    let json = serde_json::json!({ "effect": effect, "reason": decision.reason });
    let _ = write_http_response(stream, 200, "OK", &json.to_string());
}

fn handle_connection(mut stream: TcpStream, engine: &PolicyEngine) {
    let mut buf = vec![0u8; MAX_BODY_BYTES];
    let read = match stream.read(&mut buf) {
        Ok(n) => n,
        Err(_) => return,
    };
    if read == 0 {
        return;
    }
    let request = match std::str::from_utf8(&buf[..read]) {
        Ok(s) => s,
        Err(_) => {
            let _ = write_http_response(
                &mut stream,
                400,
                "Bad Request",
                r#"{"effect":"deny","reason":"invalid utf-8"}"#,
            );
            return;
        }
    };
    let mut lines = request.split("\r\n");
    let request_line = lines.next().unwrap_or("");
    let parts: Vec<&str> = request_line.split_whitespace().collect();
    if parts.len() < 2 {
        let _ = write_http_response(
            &mut stream,
            400,
            "Bad Request",
            r#"{"effect":"deny","reason":"malformed request"}"#,
        );
        return;
    }
    let method = parts[0];
    let path = parts[1];
    let mut content_length: usize = 0;
    for line in lines.by_ref() {
        if line.is_empty() {
            break;
        }
        let lower = line.to_ascii_lowercase();
        if let Some(rest) = lower.strip_prefix("content-length:") {
            content_length = rest.trim().parse().unwrap_or(0);
        }
    }
    if method != "POST" || path != "/check" {
        let _ = write_http_response(
            &mut stream,
            404,
            "Not Found",
            r#"{"effect":"deny","reason":"not found"}"#,
        );
        return;
    }
    let header_end = request.find("\r\n\r\n").map(|i| i + 4).unwrap_or(read);
    let body_start = header_end.min(read);
    let available = read.saturating_sub(body_start);
    if content_length > MAX_BODY_BYTES || content_length > available {
        let _ = write_http_response(
            &mut stream,
            413,
            "Payload Too Large",
            r#"{"effect":"deny","reason":"body too large"}"#,
        );
        return;
    }
    let body = &request[body_start..body_start + content_length];
    handle_check(&mut stream, body, engine);
}

fn main() {
    let engine = load_engine();
    let addr =
        std::env::var("POLICY_ENGINE_HTTP_ADDR").unwrap_or_else(|_| "127.0.0.1:8082".into());
    let listener = TcpListener::bind(&addr).expect("bind policy-http-server");
    eprintln!("policy-http-server on {}", addr);
    for stream in listener.incoming().flatten() {
        handle_connection(stream, &engine);
    }
}
