import React from 'react';
import ReactDOM from 'react-dom';
import App from './app';
// import config from './config';

const manifestURL = () => {
  const params = new URLSearchParams(window.location.search);
  // let url = `${config.url}/manifests/${config.env}/lunchroom_manners.json`;
  let url = "https://nakamura196.github.io/ramp_data/demo/3571280/manifest.json"
  if (params.has('iiif-content')) {
    url = params.get('iiif-content');
  }
  return url;
};

const startCanvasTime = () => {
  const params = new URLSearchParams(window.location.search);
  if (params.has('t')) {
    return parseFloat(params.get('t'));
  }
  return 0;
}

ReactDOM.render(<App
  manifestURL={manifestURL()} startCanvasTime={startCanvasTime()}
/>, document.getElementById('root'));
