/**
 * © 2025 Iban Ameztoy — MIT License
 * See LICENSE file in repository root for full terms.
 */

/****************************************************************
 *  VectorScope: Similarity Search with Embeddings
 *  (Google Satellite Embeddings V1)
 ****************************************************************/

// v.01 Export issue fixed. GEE panel error fixed

Map.setOptions('SATELLITE');                                   // imagery view

/*********************  DRAWING TOOLS  *************************/
var tools = Map.drawingTools();
tools.setShown(true);
tools.setLinked(false);
tools.setDrawModes(['polygon', 'rectangle', 'point']);

/************************  CONTROL PANEL  **********************/
var panel = ui.Panel({
  style:{
    position:'top-left', width:'350px',
    height:'92vh',
    padding:'8px 8px 4px 8px',
    backgroundColor:'rgba(255,255,255,0.92)'
  }
});
panel.add(ui.Label({
  value:'VectorScope: Similarity Search with Embeddings',
  style:{fontSize:'16px', fontWeight:'bold'}
}));
panel.add(ui.Label(
  '1️⃣  Draw ONE AOI polygon/rectangle.\n' +
  '2️⃣  One or more sample points should be drawn in a NEW geometry layer, '+
  'separate from the AOI, **OR** supply an asset containing sample points.\n' +
  '3️⃣  Select year & threshold, then run your chosen analysis tab.'
));

/* ---------- status line ---------- */
var status = ui.Label('', {padding:'4px 0', color:'red'});
panel.add(status);

/* ---------- shared controls ---------- */
var years = ee.List.sequence(2017,2025).map(function(y){
              return ee.Number(y).format('%d');}).getInfo();
years.unshift('Select year');
var yearSelect = ui.Select({items:years, value:'Select year',
                            style:{width:'110px'}});
panel.add(ui.Panel([ui.Label('Year:'),yearSelect],
                   ui.Panel.Layout.Flow('horizontal')));
panel.add(ui.Label('Default = 2020 if left unchanged.',
                   {margin:'0 0 6px 40px', color:'#555'}));

/* ---------- tab selector ---------- */
var activeTab = 'similarity';
var tabsRow = ui.Panel({layout:ui.Panel.Layout.Flow('horizontal')});
var similarityTabButton = ui.Button({label:'Similarity'});
var unsupTabButton = ui.Button({label:'Unsupervised'});
var aboutTabButton = ui.Button({label:'About'});
tabsRow.add(similarityTabButton);
tabsRow.add(unsupTabButton);
tabsRow.add(aboutTabButton);
panel.add(tabsRow);

function setActiveTab(tabName){
  activeTab = tabName;
  similarityPanel.style().set('shown', tabName === 'similarity');
  unsupPanel.style().set('shown', tabName === 'unsupervised');
  aboutPanel.style().set('shown', tabName === 'about');
  similarityTabButton.style().set('fontWeight', tabName === 'similarity' ? 'bold' : 'normal');
  unsupTabButton.style().set('fontWeight', tabName === 'unsupervised' ? 'bold' : 'normal');
  aboutTabButton.style().set('fontWeight', tabName === 'about' ? 'bold' : 'normal');
}

similarityTabButton.onClick(function(){ setActiveTab('similarity'); });
unsupTabButton.onClick(function(){ setActiveTab('unsupervised'); });
aboutTabButton.onClick(function(){ setActiveTab('about'); });

/* ---------- similarity tab ---------- */
var similarityPanel = ui.Panel({style:{margin:'6px 0 0 0'}});

var thSlider = ui.Slider({min:0.80,max:0.99,step:0.005,value:0.92});
var thLabel  = ui.Label(thSlider.getValue().toFixed(3));
thSlider.onChange(function(v){thLabel.setValue(v.toFixed(3));});
similarityPanel.add(ui.Panel([ui.Label('Threshold:'),thSlider,thLabel],
                              ui.Panel.Layout.Flow('horizontal')));

similarityPanel.add(ui.Label('Sample points source:', {margin:'8px 0 2px 0'}));
var assetCheck = ui.Checkbox('Use sample points from asset', false);
var sampleAssetBox = ui.Textbox({placeholder:'users/your_name/samplePoints',
                                 disabled:true});
assetCheck.onChange(function(v){ sampleAssetBox.setDisabled(!v); });
similarityPanel.add(assetCheck);
sampleAssetBox.style().set('width','260px');
similarityPanel.add(sampleAssetBox);

var heatCheck = ui.Checkbox('Show similarity heat-map', true);
var embeddingCheck = ui.Checkbox('Show embedding RGB (bands 1-3)', true);
similarityPanel.add(heatCheck);
similarityPanel.add(embeddingCheck);

similarityPanel.add(ui.Button('Run Similarity Analysis', runSimilarityAnalysis));
similarityPanel.add(ui.Button('Clear Results', clearOutputs));

similarityPanel.add(ui.Label('Optional export of mask to Asset:', {margin:'8px 0 0 0'}));
var assetBox = ui.Textbox({placeholder:'users/your_name/mask2024'});
assetBox.style().set('width','220px');
similarityPanel.add(ui.Panel([ui.Label('Asset ID:'), assetBox],
                   ui.Panel.Layout.Flow('horizontal')));

var projSelect = ui.Select({
  items:['WGS 84 (EPSG 4326)','UTM (auto)','EPSG 3587'],
  value:'WGS 84 (EPSG 4326)', style:{width:'170px'}
});
similarityPanel.add(ui.Panel([ui.Label('Projection:'), projSelect],
                   ui.Panel.Layout.Flow('horizontal')));
similarityPanel.add(ui.Button('Export Mask → Asset', exportMask));

/* ---------- unsupervised tab ---------- */
var unsupPanel = ui.Panel({style:{shown:false, margin:'6px 0 0 0'}});
unsupPanel.add(ui.Label('Unsupervised classification (beta)',
                        {fontWeight:'bold'}));
unsupPanel.add(ui.Label(
  'Runs k-means directly on the embedding vectors for the selected year.\n' +
  'Use this tab to explore clusters, independent of sample points.'
));

var clusterSlider = ui.Slider({min:2, max:12, step:1, value:6});
var clusterLabel = ui.Label(clusterSlider.getValue().toFixed(0));
clusterSlider.onChange(function(v){ clusterLabel.setValue(v.toFixed(0)); });
unsupPanel.add(ui.Panel([ui.Label('Clusters (k):'), clusterSlider, clusterLabel],
                        ui.Panel.Layout.Flow('horizontal')));

var trainSampleSlider = ui.Slider({min:500, max:7000, step:250, value:2000});
var trainSampleLabel = ui.Label(trainSampleSlider.getValue().toFixed(0));
trainSampleSlider.onChange(function(v){ trainSampleLabel.setValue(v.toFixed(0)); });
unsupPanel.add(ui.Panel([ui.Label('Training samples:'), trainSampleSlider, trainSampleLabel],
                        ui.Panel.Layout.Flow('horizontal')));

unsupPanel.add(ui.Button('Run Unsupervised Classification', runUnsupervisedClassification));
unsupPanel.add(ui.Label(
  'Tip: this panel is now scrollable, so longer outputs/instructions remain readable.',
  {color:'#555', margin:'4px 0 0 0'}
));
unsupPanel.add(ui.Label(
  'Why training samples? K-means is unsupervised (no labels), but it still has\n'+
  'to estimate cluster centroids from a subset of embedding vectors. This\n'+
  'parameter controls how many random pixels are used to fit those centroids.',
  {color:'#333', margin:'6px 0 0 0'}
));
unsupPanel.add(ui.Label('', {margin:'0 0 20px 0'}));

/* ---------- about tab ---------- */
var aboutPanel = ui.Panel({style:{shown:false, margin:'6px 0 0 0'}});
aboutPanel.add(ui.Label(
  'About: similarity tab computes cosine similarity between each pixel’s 64-D '+
  'embedding and the mean embedding of sample points, then thresholds it.'
));
aboutPanel.add(ui.Label('————————————————————————————',
                   {margin:'2px 0', color:'#999'}));
aboutPanel.add(ui.Label(
  'Projection option: 4326 = lat/long (~10 m); “UTM” picks the zone from the '+
  'AOI centroid (good for small AOIs); EPSG 3587 (WGS 84 / Pseudo-Mercator — '+
  'Spherical Mercator).',
  {color:'#333'}
));
aboutPanel.add(ui.Label(
  'MIT License -  Copyright (c) 2025 Iban Ameztoy',
  {margin:'12px 0 0 0', color:'#777', fontSize:'10px'}
));
aboutPanel.add(ui.Label(
  'If you use this App or its code in your own projects, research, or '+
  'publications, please credit:\n\n' +
  'Iban Ameztoy, 2025. "VectorScope". Developed using Google Earth Engine.',
  {margin:'4px 0 0 0', color:'#777', fontSize:'10px'}
));
aboutPanel.add(ui.Label('', {margin:'0 0 28px 0'}));

panel.add(similarityPanel);
panel.add(unsupPanel);
panel.add(aboutPanel);

Map.add(panel);
setActiveTab('similarity');

/****************  HELPER FUNCTIONS  ***************************/
function flattenGeom(g){
  var t=g.type().getInfo();
  if(t==='GeometryCollection'){
    var out=[]; g.geometries().getInfo().forEach(function(d){
      out=out.concat(flattenGeom(ee.Geometry(d)));});
    return out;
  }
  return [g];
}

function getSelectedYear(){
  return (yearSelect.getValue()==='Select year') ? 2020 : parseInt(yearSelect.getValue(), 10);
}

function getYearMosaic(year, aoi){
  var start=ee.Date.fromYMD(year,1,1), end=start.advance(1,'year');
  return ee.ImageCollection('GOOGLE/SATELLITE_EMBEDDING/V1/ANNUAL')
      .filterDate(start,end).filterBounds(aoi).mosaic().clip(aoi);
}

function collectInputs(){
  var aoi=null, pts=[];
  tools.layers().forEach(function(layer){
    var geom=layer.getEeObject(); if(!geom)return;
    flattenGeom(geom).forEach(function(g){
      var t=g.type().getInfo();
      if((t==='Polygon'||t==='Rectangle'||t==='MultiPolygon')&&!aoi)aoi=g;
      else if(t==='Point') pts.push(ee.Feature(g));
      else if(t==='MultiPoint')
        g.coordinates().getInfo().forEach(function(c){
          pts.push(ee.Feature(ee.Geometry.Point(c)));});
    });});
  return {aoi:aoi, samples:ee.FeatureCollection(pts)};
}

/**********************  RUN ANALYSES  *************************/
var embeddingLayer, heatLayer, maskLayer, unsupLayer, lastMask, lastAoi;

function runSimilarityAnalysis(){
  status.setValue('');
  var drawn = collectInputs();
  if(!drawn.aoi){status.setValue('⚠️  Draw ONE AOI polygon.');return;}

  var sampleFC;
  if(assetCheck.getValue()){
    var path=sampleAssetBox.getValue();
    if(!path){status.setValue('⚠️  Enter asset ID for sample points.');return;}
    sampleFC = ee.FeatureCollection(path);
  } else {
    if(drawn.samples.size().getInfo()===0){
      status.setValue('⚠️  Add at least one drawn sample point.');return;}
    sampleFC = drawn.samples;
  }

  var yr = getSelectedYear();
  var thr=thSlider.getValue();
  var mosaic=getYearMosaic(yr, drawn.aoi);

  var bands=mosaic.bandNames();
  var samples=mosaic.sampleRegions({collection:sampleFC, scale:10});
  var dots=samples.map(function(f){
    var vec=ee.Image.constant(f.toArray(bands)).arrayFlatten([bands]);
    return mosaic.multiply(vec).reduce(ee.Reducer.sum()).rename('similarity');});

  var sim=ee.ImageCollection(dots).mean()
      .updateMask(mosaic.select(0).mask()).clip(drawn.aoi)
      .set({style:null, year:yr});
  var mask=sim.gt(thr).set({style:null, year:yr});

  clearOutputs();
  if (embeddingCheck.getValue()) {
    var rgbBands = mosaic.bandNames().slice(0, 3);
    var embeddingRgb = mosaic.select(rgbBands).unitScale(-1, 1).clamp(0, 1);
    embeddingLayer = Map.addLayer(embeddingRgb,
      {bands: rgbBands.getInfo(), min:0, max:1, gamma:1.2},
      'Embedding RGB ('+yr+')', true);
  }

  heatLayer=Map.addLayer(sim,
    {min:0,max:1,palette:['000004','2C105C','711F81','B63679',
                          'EE605E','FDAE78','FCFDBF','FFFFFF']},
    'Cosine similarity', heatCheck.getValue());
  maskLayer=Map.addLayer(mask.updateMask(mask),
    {palette:['magenta']}, 'Similarity > '+thr.toFixed(3));
  heatCheck.onChange(function(s){if(heatLayer)heatLayer.setShown(s);});
  Map.centerObject(drawn.aoi,11);

  lastMask=mask; lastAoi=drawn.aoi;
  status.setValue('Similarity analysis complete for '+yr+' — ready to export.');
}

function runUnsupervisedClassification(){
  status.setValue('');
  var drawn = collectInputs();
  if(!drawn.aoi){status.setValue('⚠️  Draw ONE AOI polygon.');return;}

  clearOutputs();
  var yr = getSelectedYear();
  var k = parseInt(clusterSlider.getValue(), 10);
  var trainN = parseInt(trainSampleSlider.getValue(), 10);
  var mosaic = getYearMosaic(yr, drawn.aoi);

  var training = mosaic.sample({
    region: drawn.aoi,
    scale: 10,
    numPixels: trainN,
    geometries: false,
    seed: 42
  });

  var clusterer = ee.Clusterer.wekaKMeans(k).train(training);
  var clustered = mosaic.cluster(clusterer).rename('cluster').clip(drawn.aoi);

  unsupLayer = Map.addLayer(clustered.randomVisualizer(), {},
                            'Unsupervised clusters (k='+k+', '+yr+')', true);
  Map.centerObject(drawn.aoi, 11);
  status.setValue('Unsupervised classification complete for '+yr+' with k='+k+'.');
}

/**************  EXPORT MASK TO ASSET  *************************/
function exportMask(){
  if(!lastMask){status.setValue('⚠️  Run similarity analysis first.');return;}
  var assetId=assetBox.getValue();
  if(!assetId){status.setValue('⚠️  Enter an Asset ID.');return;}

  var exportImage=lastMask.updateMask(lastMask).clip(lastAoi);
  var p={image:exportImage.toByte(), description:'similarity_mask_export',
         assetId:assetId, region:lastAoi, maxPixels:1e10,
         pyramidingPolicy:{'.default':'mode'}};

  var statusNote='';
  switch(projSelect.getValue()){
    case 'WGS 84 (EPSG 4326)':
      // Earth Engine expects `scale` in meters even for EPSG:4326, so this
      // keeps the requested export at a 10 m resolution while it performs the
      // degree conversion internally.
      p.crs='EPSG:4326'; p.scale=10;
      statusNote='Projection: WGS 84 (EPSG:4326) at 10 m scale.';
      break;
    case 'UTM (auto)':
      var centroid=lastAoi.centroid(100);
      var lon=centroid.coordinates().get(0).getInfo();
      var lat=centroid.coordinates().get(1).getInfo();
      var zone=Math.floor((lon+180)/6)+1;
      var epsg=(lat>=0?32600:32700)+zone;
      p.crs='EPSG:'+epsg; p.scale=10;
      statusNote='Projection: UTM zone '+zone+' (EPSG:'+epsg+') at 10 m scale.';
      break;
    case 'EPSG 3587':
      p.crs='EPSG:3587'; p.scale=10;
      statusNote='Projection: EPSG 3587 at 10 m scale.';
      break;
  }
  Export.image.toAsset(p);
  var message='Export task created → check “Tasks” tab.';
  if(statusNote) message+='\n'+statusNote;
  status.setValue(message);
}

/*******************  CLEAR OUTPUTS  ***************************/
function clearOutputs(){
  if(embeddingLayer) Map.remove(embeddingLayer);
  if(heatLayer) Map.remove(heatLayer);
  if(maskLayer) Map.remove(maskLayer);
  if(unsupLayer) Map.remove(unsupLayer);
  embeddingLayer=heatLayer=maskLayer=unsupLayer=lastMask=null;
  status.setValue('');
}
