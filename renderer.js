var shell = require('electron').shell;

window.openExternalLink = function (href) {
  shell.openExternal(href);
};

var wwd;
var previewLayer;

function windowLoaded() {
  var loadingInfo = document.getElementById("loading-info");

  loadingInfo.textContent = "Creating the virtual globe...";

  WorldWind.configuration.baseUrl = "./";

  wwd = new WorldWind.WorldWindow("scene");

  previewLayer = new WorldWind.RenderableLayer();
  wwd.addLayer(previewLayer);

  var getCapabilities = new XMLHttpRequest();

  getCapabilities.onload = function(e) {
    loadingInfo.textContent = "Creating the layers...";

    var eoxCapabilities = new WorldWind.WmtsCapabilities(this.response);

    var baseLayerCaps = eoxCapabilities.getLayer("terrain-light");
    var baseLayerConfig = WorldWind.WmtsLayer.formLayerConfiguration(baseLayerCaps);
    var baseLayer = new WorldWind.WmtsLayer(baseLayerConfig);

    var nameLayerCaps = eoxCapabilities.getLayer("overlay_base");
    var nameLayerConfig = WorldWind.WmtsLayer.formLayerConfiguration(nameLayerCaps);
    var nameLayer = new WorldWind.WmtsLayer(nameLayerConfig);

    wwd.addLayer(baseLayer);
    wwd.addLayer(nameLayer);

    wwd.addLayer(new WorldWind.AtmosphereLayer());
    wwd.addLayer(new WorldWind.StarFieldLayer());

    loadingInfo.textContent = "Ready :)";
    document.getElementById("loading").className = "ready";

    wwd.redraw();
  };

  getCapabilities.open("GET", "https://tiles.maps.eox.at/wmts/1.0.0/WMTSCapabilities.xml");
  getCapabilities.responseType = "document";
  getCapabilities.send();
  loadingInfo.textContent = "Getting the layer configurations...";

  var dragStack = 0;
  var dropZone = document.getElementById('drag');

  document.addEventListener('dragenter', function (e) {
    if(dragStack == 0) {
      dropZone.style.display = 'block';
    }

    dragStack++;
  });

  document.addEventListener('dragleave', function (e) {
    dragStack--;

    if(dragStack == 0) {
      dropZone.style.display = 'none';
    }
  });

  document.addEventListener('dragover', function (e) {
    e.preventDefault();
    e.stopPropagation();
  });

  document.addEventListener('drop', function (e) {
    e.preventDefault();
    e.stopPropagation();

    dragStack = 0;
    dropZone.style.display = 'none';

    if (previewLayer) {
      previewLayer.removeAllRenderables();
      var items = e.dataTransfer.items;
      for (var i = 0; i < items.length; i++) {
        if (items[i].kind == "file") {
          addFile(items[i].getAsFile());
        }
      }
    }
  });
}

function addFile(file) {
  var reader = new FileReader();

  if (file.type == 'application/json' || file.name.endsWith('.geojson')) {
    reader.onload = function() {
      var parser = new WorldWind.GeoJSONParser(reader.result);
      parser.load(function() {
        wwd.redraw();
      }, shapeConfigurationCallback, previewLayer);
    };
    reader.readAsText(file);

  } else if (file.type == 'application/vnd.google-earth.kml+xml') {
    reader.onload = function() {
      new WorldWind.KmlFile(reader.result).then(function(kml) {
        previewLayer.addRenderable(kml);
        wwd.redraw();
      });
    };
    reader.readAsDataURL(file);

  } else {
    console.log('Unknown file type: ' + file);
  }
}

function shapeConfigurationCallback(geometry, properties) {
  var configuration = {};
  configuration.attributes = new WorldWind.ShapeAttributes(null);
  configuration.attributes.interiorColor = new WorldWind.Color(
    0.375 + 0.5 * Math.random(),
    0.375 + 0.5 * Math.random(),
    0.375 + 0.5 * Math.random(),
    0.8
  );
  configuration.attributes.outlineColor = new WorldWind.Color(
    0.5 * configuration.attributes.interiorColor.red,
    0.5 * configuration.attributes.interiorColor.green,
    0.5 * configuration.attributes.interiorColor.blue,
    1.0
  );
  return configuration;
}

window.addEventListener("load", windowLoaded, false);
