#!/usr/bin/env python3
"""
tools/jina-fastpath/server.py
정적 서버: worktree와 사이트 폴더, 스튜디오 자산을 함께 서빙.
127.0.0.1 빈 포트에 바인딩하고 PID를 출력/기록한다.
"""

import argparse
import os
import sys
import mimetypes
from http.server import ThreadingHTTPServer, BaseHTTPRequestHandler
from pathlib import Path

WORKTREE_DIR = Path("/var/home/luke/alpha-adk/.agents/work/nva-jina-fastpath").resolve()
SITE_DIR = Path("/var/home/luke/alpha-adk/.agents/work/nva-jina-fastpath-site").resolve()
STUDIO_ASSETS_DIR = Path("/var/home/luke/alpha-adk/projects/naia-land-worktrees/r12-template-web/public/assets/nva-preview").resolve()
VIEWER_DIR = Path("/var/home/luke/alpha-adk/projects/naia-video-avatar/src/main").resolve()

mimetypes.add_type("application/javascript", ".js")
mimetypes.add_type("application/javascript", ".mjs")
mimetypes.add_type("application/json", ".json")
mimetypes.add_type("video/webm", ".webm")
mimetypes.add_type("audio/wav", ".wav")
mimetypes.add_type("application/octet-stream", ".nva")
mimetypes.add_type("application/octet-stream", ".bin")

class CustomHandler(BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        # 조용한 로깅
        pass

    def do_HEAD(self):
        self._serve_file(send_body=False)

    def do_GET(self):
        self._serve_file(send_body=True)

    def _resolve_path(self, path_str: str) -> Path | None:
        path_str = path_str.split("?", 1)[0].split("#", 1)[0]
        # URL 디코딩
        from urllib.parse import unquote
        path_str = unquote(path_str)

        if path_str.startswith("/data/"):
            rel = path_str[len("/data/"):]
            target = (SITE_DIR / "data" / rel).resolve()
            if target.is_relative_to(SITE_DIR / "data") and target.is_file():
                return target
        elif path_str.startswith("/videos/"):
            rel = path_str[len("/videos/"):]
            target = (SITE_DIR / "videos" / rel).resolve()
            if target.is_relative_to(SITE_DIR / "videos") and target.is_file():
                return target
        elif path_str.startswith("/studio-assets/"):
            rel = path_str[len("/studio-assets/"):]
            target = (STUDIO_ASSETS_DIR / rel).resolve()
            if target.is_relative_to(STUDIO_ASSETS_DIR) and target.is_file():
                return target
        elif path_str.startswith("/viewer/"):
            rel = path_str[len("/viewer/"):]
            target = (VIEWER_DIR / rel).resolve()
            if target.is_relative_to(VIEWER_DIR) and target.is_file():
                return target
        elif path_str.startswith("/.agy-work/"):
            rel = path_str[len("/.agy-work/"):]
            target = (WORKTREE_DIR / ".agy-work" / rel).resolve()
            if target.is_relative_to(WORKTREE_DIR / ".agy-work") and target.is_file():
                return target
        elif path_str.startswith("/src/"):
            rel = path_str[len("/src/"):]
            target = (WORKTREE_DIR / "src" / rel).resolve()
            if target.is_relative_to(WORKTREE_DIR / "src") and target.is_file():
                return target
        elif path_str.startswith("/tools/"):
            rel = path_str[len("/tools/"):]
            target = (WORKTREE_DIR / "tools" / rel).resolve()
            if target.is_relative_to(WORKTREE_DIR / "tools") and target.is_file():
                return target
        elif path_str == "/" or path_str == "/index.html":
            target = (SITE_DIR / "index.html").resolve()
            if target.is_file():
                return target
            target = (WORKTREE_DIR / "tools" / "jina-fastpath" / "record-composed.html").resolve()
            if target.is_file():
                return target
        else:
            # 기본적으로 worktree 및 tools/jina-fastpath에서 검색
            rel = path_str.lstrip("/")
            t1 = (WORKTREE_DIR / "tools" / "jina-fastpath" / rel).resolve()
            if t1.is_relative_to(WORKTREE_DIR / "tools" / "jina-fastpath") and t1.is_file():
                return t1
            t2 = (WORKTREE_DIR / rel).resolve()
            if t2.is_relative_to(WORKTREE_DIR) and t2.is_file():
                return t2
            t3 = (SITE_DIR / rel).resolve()
            if t3.is_relative_to(SITE_DIR) and t3.is_file():
                return t3

        return None

    def _serve_file(self, send_body=True):
        target = self._resolve_path(self.path)
        if not target or not target.exists():
            self.send_response(404)
            self.send_header("Content-Type", "text/plain; charset=utf-8")
            self.end_headers()
            if send_body:
                self.wfile.write(b"404 Not Found")
            return

        file_size = target.stat().st_size
        mime_type, _ = mimetypes.guess_type(str(target))
        if not mime_type:
            mime_type = "application/octet-stream"

        range_header = self.headers.get("Range")
        if range_header and range_header.startswith("bytes="):
            # Range request 처리
            try:
                ranges = range_header[len("bytes="):].split("-")
                start = int(ranges[0]) if ranges[0] else 0
                end = int(ranges[1]) if len(ranges) > 1 and ranges[1] else file_size - 1
                if start >= file_size or end >= file_size or start > end:
                    raise ValueError("Invalid range")
                
                content_length = end - start + 1
                self.send_response(206)
                self.send_header("Content-Type", mime_type)
                self.send_header("Content-Range", f"bytes {start}-{end}/{file_size}")
                self.send_header("Content-Length", str(content_length))
                self.send_header("Accept-Ranges", "bytes")
                self.send_header("Access-Control-Allow-Origin", "*")
                self.end_headers()

                if send_body:
                    with open(target, "rb") as f:
                        f.seek(start)
                        remaining = content_length
                        while remaining > 0:
                            chunk = f.read(min(65536, remaining))
                            if not chunk:
                                break
                            self.wfile.write(chunk)
                            remaining -= len(chunk)
                return
            except Exception:
                self.send_response(416)
                self.send_header("Content-Range", f"bytes */{file_size}")
                self.end_headers()
                return

        # 일반 200 OK
        self.send_response(200)
        self.send_header("Content-Type", mime_type)
        self.send_header("Content-Length", str(file_size))
        self.send_header("Accept-Ranges", "bytes")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()

        if send_body:
            with open(target, "rb") as f:
                while True:
                    chunk = f.read(65536)
                    if not chunk:
                        break
                    self.wfile.write(chunk)

def main():
    parser = argparse.ArgumentParser(description="Jina Fastpath Static Server")
    parser.add_argument("--port", type=int, default=0, help="Port to bind (0 for automatic)")
    parser.add_argument("--pid-file", type=str, default="", help="File to write PID to")
    args = parser.parse_args()

    # 녹화 Chrome 이 큰 .nva 범위 응답 연결을 붙잡아도 다른 요청이 막히지 않게 요청마다 스레드로 처리한다(A3 재녹화 25분 멈춤).
    ThreadingHTTPServer.daemon_threads = True
    server = ThreadingHTTPServer(("127.0.0.1", args.port), CustomHandler)
    actual_port = server.server_port
    pid = os.getpid()

    if args.pid_file:
        pid_path = Path(args.pid_file)
        pid_path.parent.mkdir(parents=True, exist_ok=True)
        pid_path.write_text(str(pid), encoding="utf-8")

    print(f"SERVER_PORT={actual_port}", flush=True)
    print(f"SERVER_PID={pid}", flush=True)

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()
        if args.pid_file and Path(args.pid_file).is_file():
            try:
                Path(args.pid_file).unlink()
            except Exception:
                pass

if __name__ == "__main__":
    main()
