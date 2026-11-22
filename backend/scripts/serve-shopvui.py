# Serves the ShopVui storefront (like `python -m http.server`) but with Cache-Control: no-cache,
# so browsers revalidate JS/CSS on every load (304 when unchanged) instead of running a stale cached copy.
import functools
import http.server
import pathlib

HERE = pathlib.Path(__file__).resolve().parent.parent
ROOT = HERE.parent / 'frontend'  # storefront lives next to backend/


class Handler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-cache')
        super().end_headers()


if __name__ == '__main__':
    server = http.server.ThreadingHTTPServer(('127.0.0.1', 8000), functools.partial(Handler, directory=str(ROOT)))
    print('ShopVui http://127.0.0.1:8000 (no-cache)')
    server.serve_forever()
