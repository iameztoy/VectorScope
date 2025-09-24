# VectorScope: Similarity Search with Embeddings

## Overview

**VectorScope** is a Google Earth Engine application that leverages Google’s Satellite Embedding V1 to map “pixels that look like your samples.” You can either draw sample points within the UI or load them from an existing Earth Engine asset. The app computes a cosine-similarity heat-map of 64-dimensional embeddings for any year between 2017 and 2025, allows threshold tuning, toggles the heat-map on/off, and exports a binary mask to your choice of projections (WGS 84, UTM, EPSG 3587).


## Features

- **AOI drawing**: define your area of interest with a single polygon or rectangle.  
- **Sample points**: draw your own points or load a point FeatureCollection asset.  
- **Year & threshold**: select year and similarity threshold (0.80–0.99).  
- **Heat-map & mask**: view continuous similarity, then generate a binary magenta mask above threshold.  
- **Export**: save the mask as an Earth Engine asset in WGS 84, UTM (auto-zone), or EPSG 3587.

## Usage

1. Open `code/main.js` in the Earth Engine Code Editor.  
2. Click **Run** to load the UI on the map.  
3. Draw your AOI (polygon or rectangle).  
4. Choose sample points by either:  
   - Drawing points in a new geometry layer, **or**  
   - Checking “Use sample points from asset” and entering your FeatureCollection ID.  
5. Select a year (default = 2020) and adjust the similarity threshold.  
6. Click **Run Analysis** to display the heat-map and mask.  
7. (Optional) Enter an asset ID, choose a projection, and click **Export Mask → Asset**.

8. ## More about the input Embeddings

Brown, C. F., Kazmierski, M. R., Pasquarella, V J., Rucklidge, W. J., Samsikova, M., Zhang, C., Shelhamer, E., Lahera, E., Wiles, O., Ilyushchenko, S., Gorelick, N., Zhang, L. L., Alj, S., Schechter, E., Askay, S., Guinan, O., Moore, R., Boukouvalas, A., & Kohli, P.(2025). AlphaEarth Foundations: An embedding field model for accurate and efficient global mapping from sparse label data. arXiv preprint arXiv.2507.22291. doi:10.48550/arXiv.2507.22291

https://medium.com/google-earth/ai-powered-pixels-introducing-googles-satellite-embedding-dataset-31744c1f4650

Code adapted from:
https://developers.google.com/earth-engine/tutorials/community/satellite-embedding-05-similarity-search?hl=es-419

## LICENSE

MIT License

Copyright (c) 2025 Iban Ameztoy

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
