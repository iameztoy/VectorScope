
/**
 * © 2025 Iban Ameztoy — MIT License
 * See LICENSE file in repository root for full terms.
 */

/****************************************************************
 *  VectorScope: Similarity Search with Embeddings
 *  (Google Satellite Embeddings V1)
 ****************************************************************/

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
  '3️⃣  Select year & threshold, then “Run Analysis”.'
));

/* ---------- status line ---------- */
var status = ui.Label('', {padding:'4px 0', color:'red'});
panel.add(status);

/* ---------- year selector ---------- */
var years = ee.List.sequence(2017,2025).map(function(y){
              return ee.Number(y).format('%d');}).getInfo();
years.unshift('Select year');
var yearSelect = ui.Select({items:years, value:'Select year',
                            style:{width:'110px'}});
panel.add(ui.Panel([ui.Label('Year:'),yearSelect],
                   ui.Panel.Layout.Flow('horizontal')));
panel.add(ui.Label('Default = 2020 if left unchanged.',
                   {margin:'0 0 6px 40px', color:'#555'}));

/* ---------- threshold slider ---------- */
var thSlider = ui.Slider({min:0.80,max:0.99,step:0.005,value:0.92});
var thLabel  = ui.Label(thSlider.getValue().toFixed(3));
thSlider.onChange(function(v){thLabel.setValue(v.toFixed(3));});
panel.add(ui.Panel([ui.Label('Threshold:'),thSlider,thLabel],
                   ui.Panel.Layout.Flow('horizontal')));

/* ---------- sample-source widgets ---------- */
panel.add(ui.Label('Sample points source:', {margin:'8px 0 2px 0'}));
var assetCheck = ui.Checkbox('Use sample points from asset', false);
var sampleAssetBox = ui.Textbox({placeholder:'users/your_name/samplePoints',
                                 disabled:true});
assetCheck.onChange(function(v){ sampleAssetBox.setDisabled(!v); });
panel.add(assetCheck);
sampleAssetBox.style().set('width','260px');
panel.add(sampleAssetBox);

/* ---------- heat-map toggle ---------- */
var heatCheck = ui.Checkbox('Show similarity heat-map', true);
panel.add(heatCheck);

var heatLayer, maskLayer, lastMask, lastAoi;
var heatLayerShown = heatCheck.getValue();
heatCheck.onChange(function(show){
  heatLayerShown = show;
  if(heatLayer) heatLayer.setShown(show);
});

/* ---------- run / clear buttons ---------- */
panel.add(ui.Button('Run Analysis', runAnalysis));
panel.add(ui.Button('Clear Results', clearOutputs));

/* ---------- export widgets ---------- */
panel.add(ui.Label('Optional export of mask to Asset:', {margin:'8px 0 0 0'}));
var assetBox = ui.Textbox({placeholder:'users/your_name/mask2024'});
assetBox.style().set('width','220px');
panel.add(ui.Panel([ui.Label('Asset ID:'), assetBox],
                   ui.Panel.Layout.Flow('horizontal')));

var projSelect = ui.Select({
  items:['WGS 84 (EPSG 4326)','UTM (auto)','EPSG 3587'],
  value:'WGS 84 (EPSG 4326)', style:{width:'170px'}
});
panel.add(ui.Panel([ui.Label('Projection:'), projSelect],
                   ui.Panel.Layout.Flow('horizontal')));
panel.add(ui.Button('Export Mask → Asset', exportMask));

/* ---------- about & credit ---------- */
panel.add(ui.Label(
  'About: computes a cosine-similarity heat-map between each pixel’s 64-D '+
  'embedding and the mean embedding of your sample points, then thresholds it '+
  'to mark “pixels that look like the samples.”'
));
panel.add(ui.Label('————————————————————————————',
                   {margin:'2px 0', color:'#999'}));
panel.add(ui.Label(
  'Projection option: 4326 = lat/long (~10 m); “UTM” picks the zone from the '+
  'AOI centroid (good for small AOIs); EPSG 3587 (WGS 84 / Pseudo-Mercator — '+
  'Spherical Mercator).',
  {color:'#333'}
));
panel.add(ui.Label(
  'MIT License -  Copyright (c) 2025 Iban Ameztoy',
  {margin:'12px 0 0 0', color:'#777', fontSize:'10px'}
));
panel.add(ui.Label(
  'If you use this App or its code in your own projects, research, or '+
  'publications, please credit:\n\n' +
  'Iban Ameztoy, 2025. "VectorScope". Developed using Google Earth Engine.',
  {margin:'4px 0 0 0', color:'#777', fontSize:'10px'}
));
Map.add(panel);

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

/**********************  RUN ANALYSIS  *************************/
function runAnalysis(){
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

  var yr=(yearSelect.getValue()==='Select year')?2020:parseInt(yearSelect.getValue(),10);
  var thr=thSlider.getValue();
  var start=ee.Date.fromYMD(yr,1,1), end=start.advance(1,'year');

  var mosaic=ee.ImageCollection('GOOGLE/SATELLITE_EMBEDDING/V1/ANNUAL')
      .filterDate(start,end).filterBounds(drawn.aoi).mosaic().clip(drawn.aoi);

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
  heatLayer=Map.addLayer(sim,
    {min:0,max:1,palette:['000004','2C105C','711F81','B63679',
                          'EE605E','FDAE78','FCFDBF','FFFFFF']},
    'Cosine similarity', heatLayerShown);
  heatLayer.setShown(heatLayerShown);
  maskLayer=Map.addLayer(mask.updateMask(mask),
    {palette:['magenta']}, 'Similarity > '+thr.toFixed(3));
  Map.centerObject(drawn.aoi,11);

  lastMask=mask; lastAoi=drawn.aoi;
  status.setValue('Analysis complete — ready to export.');
}

/**************  EXPORT MASK TO ASSET  *************************/
function exportMask(){
  if(!lastMask){status.setValue('⚠️  Run analysis first.');return;}
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
  if(statusNote) message+="\n"+statusNote;
  status.setValue(message);
}

/*******************  CLEAR OUTPUTS  ***************************/
function clearOutputs(){
  if(heatLayer) Map.remove(heatLayer);
  if(maskLayer) Map.remove(maskLayer);
  heatLayer=maskLayer=lastMask=lastAoi=null;
  status.setValue('');
}
