// The order of the attributes of <mxGraphModel> that the draw.io editor of the submodule writes,
// with the plugins of the view position and of the attribute order, driven headless through the
// browser of the build.
const assert = require("node:assert/strict");
const { after, test } = require("node:test");
const { loadTsModule } = require("../loadTsModule");
const { page, drawing } = require("./deckHelpers");
const { serveEditor } = require("./editorServer");

const browser = loadTsModule("deck/deckBrowser.ts");

/** The attributes of a page of the template of a deck, in the order of getGraphXml of draw.io. */
const MODEL =
	'grid="0" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="1920" pageHeight="1080" background="#FFFFFF" math="1" shadow="0"';

const browserStarts = browser.launchBrowser().then(
	(launched) => launched,
	() => undefined
);

after(async () => {
	await (await browserStarts)?.close();
});

/** A cell that the rewrite of the file adds. */
const ADDED =
	'<mxCell id="added" value="added" style="text;html=1;" vertex="1" parent="1"><mxGeometry x="100" y="100" width="200" height="100" as="geometry" /></mxCell>';

/** The names of the attributes of each <mxGraphModel> of the XML of a file. */
function attributeNames(xml) {
	return [...xml.matchAll(/<mxGraphModel ([^>]*)>/g)].map(([, attributes]) =>
		[...attributes.matchAll(/([\w:]+)="/g)].map(([, name]) => name)
	);
}

test("a page off screen whose cells a merge of a rewritten file replaced keeps the order of the attributes of the page on screen", async (t) => {
	const launched = await browserStarts;
	if (launched === undefined) {
		t.skip("no headless browser starts on this machine");
		return;
	}
	const server = await serveEditor();
	t.after(() => server.close());
	const baseUrl = `http://127.0.0.1:${server.address().port}`;
	const editorPage = await launched.newPage({ viewport: { width: 1400, height: 900 } });
	t.after(() => editorPage.close());

	// Without offline=1, draw.io installs Draw.loadPlugin, and stealth=1 keeps it off the network.
	await editorPage.goto(
		`${baseUrl}/index.html?embed=1&proto=json&spin=0&stealth=1&pwa=0&lang=en&dev=0&ui=kennedy`
	);
	await editorPage.waitForFunction(() => typeof window.Draw === "object" && window.Draw.loadPlugin);
	for (const plugin of ["view-position.plugin.js", "page-attribute-order.plugin.js"]) {
		await editorPage.addScriptTag({ url: `${baseUrl}/slides/${plugin}` });
	}
	await editorPage.addScriptTag({
		content: "Draw.loadPlugin(function (ui) { window.testUi = ui; });",
	});
	await editorPage.waitForFunction(() => window.testUi !== undefined);

	const file = drawing(page("first-1", "", MODEL), page("second-1", "", MODEL));
	// The script that rewrites the file while the editor holds it open changes the second page.
	const rewritten = drawing(page("first-1", "", MODEL), page("second-1", ADDED, MODEL));
	const saved = await editorPage.evaluate(
		([data, rewrittenData]) =>
			new Promise((resolve, reject) => {
				const ui = window.testUi;
				ui.fileLoaded(new LocalFile(ui, data, "deck.drawio", true));
				ui.getCurrentFile().mergeFile(
					new LocalFile(ui, rewrittenData),
					() => resolve(mxUtils.getXml(ui.getXmlFileData())),
					reject
				);
			}),
		[file, rewritten]
	);

	const [first, second] = attributeNames(saved);
	assert.match(saved, /<mxCell id="added"/);
	assert.deepEqual(first, attributeNames(file)[0]);
	assert.deepEqual(second, first);
});
