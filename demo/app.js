import React from 'react';

import 'video.js/dist/video-js.css';  // must be at top so it can be overridden

import IIIFPlayer from '@Components/IIIFPlayer/IIIFPlayer';
import MediaPlayer from '@Components/MediaPlayer/MediaPlayer';
import StructuredNavigation from '@Components/StructuredNavigation/StructuredNavigation';
import Transcript from '@Components/Transcript/Transcript';
import MetadataDisplay from '@Components/MetadataDisplay/MetadataDisplay';
import SupplementalFiles from '@Components/SupplementalFiles/SupplementalFiles';
import AutoAdvanceToggle from '@Components/AutoAdvanceToggle/AutoAdvanceToggle';
import MarkersDisplay from '@Components/MarkersDisplay/MarkersDisplay';
import './app.scss';

const App = ({ manifestURL, startCanvasTime }) => {
  const [userURL, setUserURL] = React.useState(manifestURL);
  const [manifestUrl, setManifestUrl] = React.useState(manifestURL);
  const [canvasTime, setCanvasTime
  ] = React.useState(startCanvasTime);

  const tabValues = [
    { title: '詳細', ref: React.useRef(null) },
    { title: '文字起こし', ref: React.useRef(null) },
    { title: 'ファイル', ref: React.useRef(null) },
    { title: 'マーカー', ref: React.useRef(null) },
  ];

  React.useEffect(() => {
    setManifestUrl(manifestUrl);
  }, [manifestUrl]);

  const handleSubmit = (e) => {
    e.preventDefault();
    setManifestUrl(userURL);
  };

  const handleUserInput = (e) => {
    setManifestUrl();
    setUserURL(e.target.value);
    setCanvasTime(0);
  };

  return (
    <div className='ramp-demo'>
      <div className='ramp--details'>
        <h1>Ramp</h1>
        <p>IIIFを活用したインタラクティブなオーディオ/ビデオプレーヤーで、<a href="https://www.npmjs.com/package/@samvera/ramp" target="_blank">@samvera/ramp</a>ライブラリのコンポーネントを使用して構築されています。このプレーヤーは<em>IIIF Presentation 3.0マニフェスト</em>をサポートしています。プレーヤーで表示するための<em>公開</em>マニフェストのURLを入力してください。</p>
        <div className='ramp--form_container'>
          <form onSubmit={handleSubmit}>
            <div className='row'>
              <div className='col-1'>
                <label htmlFor="manifesturl" className="ramp-demo__manifest-input-label">マニフェストURL</label>
              </div>
              <div className='col-2'>
                <input type='url'
                  id='manifesturl'
                  name='manifesturl'
                  value={userURL}
                  onChange={handleUserInput}
                  placeholder='マニフェストURL'
                  className="ramp-demo__manifest-input" />
                <input type='submit' value='送信' className="ramp-demo__manifest-submit" />
              </div>
            </div>
          </form>
        </div>
      </div>
      <div className='ramp--player_container'>
        <IIIFPlayer
          manifestUrl={manifestUrl}
          startCanvasTime={canvasTime}
        >
          <div style={{ display: 'flex', width: '100%' }}>
            <div style={{ flex: 1, padding: '0 20px' }}>
              <MediaPlayer enableFileDownload={true} enablePlaybackRate={true} />
              <div style={{ padding: '20px 0' }}>
                <AutoAdvanceToggle />
                <StructuredNavigation />
              </div>
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '0 20px' }}>
              <Tabs tabValues={tabValues} manifestUrl={manifestUrl} />
            </div>
          </div>
        </IIIFPlayer>
      </div >
    </div >
  );
};


/*Reference: https://accessible-react.eevis.codes/components/tabs */
const Tabs = ({ tabValues, manifestUrl }) => {
  const [activeTab, setActiveTab] = React.useState(1);

  let tabs = [];

  const handleClick = (index) => {
    setActiveTab(index);
  };

  const handleNextTab = (firstTabInRound, nextTab, lastTabInRound) => {
    const tabToSelect =
      activeTab === lastTabInRound ? firstTabInRound : nextTab;
    setActiveTab(tabToSelect);
    tabValues[tabToSelect].ref.current.focus();
  };

  const handleKeyPress = (event) => {
    const tabCount = Object.keys(tabValues).length - 1;

    if (event.key === "ArrowLeft") {
      const last = tabCount;
      const next = activeTab - 1;
      handleNextTab(last, next, 0);
    }
    if (event.key === "ArrowRight") {
      const first = 0;
      const next = activeTab + 1;
      handleNextTab(first, next, tabCount);
    }
  };

  tabValues.map((t, index) => {
    tabs.push(
      <Tab
        key={index}
        id={t.title.toLowerCase()}
        tabPanelId={`${t.title.toLowerCase()}Tab`}
        index={index}
        handleChange={handleClick}
        activeTab={activeTab}
        title={t.title}
        tabRef={t.ref}
      />
    );
  });

  return (
    <section className="tabs-wrapper">
      <div className="switcher">
        <ul
          role="tablist"
          className="tablist switcher"
          aria-label="more Ramp components in tabs"
          onKeyDown={handleKeyPress}>
          {tabs}
        </ul>
      </div>
      <TabPanel id="detailsTab" tabId="details" tabIndex={0} activeTab={activeTab}>
        <MetadataDisplay showHeading={false} />
      </TabPanel>
      <TabPanel id="transcriptsTab" tabId="transcripts" tabIndex={1} activeTab={activeTab}>
        <Transcript
          playerID="iiif-media-player"
          manifestUrl={manifestUrl}
        />
      </TabPanel>
      <TabPanel id="filesTab" tabId="files" tabIndex={2} activeTab={activeTab}>
        <SupplementalFiles showHeading={false} />
      </TabPanel>
      <TabPanel id="markersTab" tabId="markers" tabIndex={3} activeTab={activeTab}>
        <MarkersDisplay showHeading={false} />
      </TabPanel>
    </section>
  );
};

const Tab = ({ id, tabPanelId, index, handleChange, activeTab, title, tabRef }) => {
  const handleClick = () => { handleChange(index); };
  return (
    <li role="presentation">
      <button
        role="tab"
        id={id}
        aria-selected={activeTab === index}
        aria-controls={tabPanelId}
        onClick={handleClick}
        tabIndex={activeTab === index ? 0 : -1}
        ref={tabRef}
      >
        {title}
      </button>
    </li>
  );
};

const TabPanel = ({ id, tabId, activeTab, tabIndex, children }) => {
  return (
    <section
      role="tabpanel"
      id={id}
      aria-labelledby={tabId}
      hidden={activeTab !== tabIndex}
      tabIndex={0}
      className="tabpanel"
    >
      {children}
    </section>
  );
};

export default App;
