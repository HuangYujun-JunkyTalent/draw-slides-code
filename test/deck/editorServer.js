// A server of the editor of the submodule draw.io and of the plugins of the slides, which the tests
// of the editor open in the browser of the build.
const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");
const { extensionRoot } = require("./deckHelpers");

const WEBAPP = path.join(extensionRoot, "drawio", "src", "main", "webapp");
const PLUGINS = path.join(extensionRoot, "drawio-custom-plugins", "slides");
const TYPES = {
	".html": "text/html",
	".js": "text/javascript",
	".css": "text/css",
	".svg": "image/svg+xml",
	".png": "image/png",
	".json": "application/json",
	".xml": "application/xml",
	".txt": "text/plain",
};

/** A server of the files of draw.io and of the plugins of the slides, on a free port. */
function serveEditor() {
	const server = http.createServer((request, response) => {
		const url = new URL(request.url, "http://localhost");
		const [root, relative] = url.pathname.startsWith("/slides/")
			? [PLUGINS, url.pathname.slice("/slides/".length)]
			: [WEBAPP, url.pathname.slice(1) || "index.html"];
		const file = path.resolve(root, decodeURIComponent(relative));
		if (!file.startsWith(root) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
			response.writeHead(404);
			response.end();
			return;
		}
		response.writeHead(200, {
			"Content-Type": TYPES[path.extname(file)] ?? "application/octet-stream",
		});
		fs.createReadStream(file).pipe(response);
	});
	return new Promise((resolve) =>
		server.listen(0, "127.0.0.1", () => resolve(server))
	);
}


module.exports = { serveEditor };
