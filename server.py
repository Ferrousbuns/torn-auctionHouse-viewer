import http.server
import socketserver
import os

PORT = 8000
# Target file provided by user on Desktop
CSV_PATH = r"C:\Users\Ferrousbuns\Desktop\AuctionHouseData\masterFile.csv"

class CustomHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # Prevent caching for ALL files so development updates are visible immediately
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()

    def do_GET(self):
        # Intercept requests for /data.csv and serve the master file
        if self.path.startswith('/data.csv'):
            if os.path.exists(CSV_PATH):
                self.send_response(200)
                self.send_header('Content-type', 'text/csv')
                file_size = os.path.getsize(CSV_PATH)
                self.send_header('Content-Length', str(file_size))
                self.end_headers()
                
                with open(CSV_PATH, 'rb') as f:
                    self.wfile.write(f.read())
            else:
                self.send_error(404, f"File not found: {CSV_PATH}")
        else:
            # Fallback to normal SimpleHTTPRequestHandler behavior for all other files
            super().do_GET()

if __name__ == '__main__':
    # Add a fallback for socket binding issues simply by allowing reuse
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(("", PORT), CustomHandler) as httpd:
        print(f"Serving at http://localhost:{PORT}")
        print(f"Proxying /data.csv to => {CSV_PATH}")
        httpd.serve_forever()
