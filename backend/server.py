import json
import urllib.parse
from http.server import HTTPServer, BaseHTTPRequestHandler
from config import HOST, PORT
from lambda_handler import route_api_request

class HeatShieldHandler(BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        # Clean logging output
        print(f"[{self.log_date_time_string()}] {self.command} {self.path} -> {args[0]}")

    def do_OPTIONS(self):
        res = route_api_request("OPTIONS", self.path, {}, {})
        self.send_response(res["statusCode"])
        for k, v in res["headers"].items():
            self.send_header(k, v)
        self.end_headers()

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path
        query_params = {k: v[0] for k, v in urllib.parse.parse_qs(parsed.query).items()}
        res = route_api_request("GET", path, query_params, {})
        self.send_response(res["statusCode"])
        for k, v in res["headers"].items():
            self.send_header(k, v)
        self.end_headers()
        self.wfile.write(res["body"].encode("utf-8"))

    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path
        query_params = {k: v[0] for k, v in urllib.parse.parse_qs(parsed.query).items()}

        content_length = int(self.headers.get("Content-Length", 0))
        body_bytes = self.rfile.read(content_length) if content_length > 0 else b""
        body_json = {}
        if body_bytes:
            try:
                body_json = json.loads(body_bytes.decode("utf-8"))
            except Exception:
                pass

        res = route_api_request("POST", path, query_params, body_json)
        self.send_response(res["statusCode"])
        for k, v in res["headers"].items():
            self.send_header(k, v)
        self.end_headers()
        self.wfile.write(res["body"].encode("utf-8"))

def run_server(host: str = HOST, port: int = PORT):
    server_address = (host, port)
    httpd = HTTPServer(server_address, HeatShieldHandler)
    print(f"HeatShield Backend API running on http://{host}:{port}")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down HeatShield Backend API server.")
        httpd.server_close()

if __name__ == "__main__":
    run_server()
