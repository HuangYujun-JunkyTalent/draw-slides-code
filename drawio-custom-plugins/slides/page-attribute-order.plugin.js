// Writes the attributes of the <mxGraphModel> of every page in one order, whichever function of
// the draw.io editor writes the page.
//
// getGraphXml of the editor writes the page on screen, and saveViewState of the graph writes a
// page off screen whose cells changed, such as a page edited before a switch of pages or a page
// whose cells a merge of a rewritten file replaced.  The two functions write the attributes in two
// orders: saveViewState puts page second, after grid, and measureScale after adaptiveColors.  A
// save then moves attributes on pages that nobody edited, and git shows the section file as
// modified.  This plugin sorts the attributes of the node that each function writes into the order
// of getGraphXml, which the template and the section files of the decks hold.  An attribute that
// the order leaves out follows, in the order in which the function wrote it.
//
// The VS Code extension yujunhuang.drawslidescode loads the plugin from its own folder
// drawio-custom-plugins/slides/ for every drawing whose setting "drawSlidesCode.slides" is true,
// without asking.
Draw.loadPlugin(function (ui) {
  var ATTRIBUTE_ORDER = [
    'dx',
    'dy',
    'grid',
    'gridSize',
    'guides',
    'tooltips',
    'connect',
    'arrows',
    'fold',
    'page',
    'pageScale',
    'pageWidth',
    'pageHeight',
    'measureScale',
    'background',
    'backgroundGradient',
    'backgroundGradientDirection',
    'style',
    'backgroundImage',
    'math',
    'shadow',
    'adaptiveColors',
    'extFonts',
  ];

  function rankOf(name) {
    var rank = ATTRIBUTE_ORDER.indexOf(name);

    return rank < 0 ? ATTRIBUTE_ORDER.length : rank;
  }

  function sortAttributes(node) {
    var attributes = Array.prototype.map.call(node.attributes, function (attribute, position) {
      return { name: attribute.name, value: attribute.value, position: position };
    });
    attributes.sort(function (a, b) {
      return rankOf(a.name) - rankOf(b.name) || a.position - b.position;
    });
    attributes.forEach(function (attribute) {
      node.removeAttribute(attribute.name);
    });
    attributes.forEach(function (attribute) {
      node.setAttribute(attribute.name, attribute.value);
    });
  }

  var editor = ui.editor;
  var getGraphXml = editor.getGraphXml;

  editor.getGraphXml = function () {
    var node = getGraphXml.apply(this, arguments);
    sortAttributes(node);

    return node;
  };

  var graph = editor.graph;
  var saveViewState = graph.saveViewState;

  graph.saveViewState = function (viewState, node) {
    var result = saveViewState.apply(this, arguments);
    sortAttributes(node);

    return result;
  };
});
