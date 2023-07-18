import React from 'react';
import PropTypes from 'prop-types';
import 'lodash';
import TanscriptSelector from './TranscriptMenu/TranscriptSelector';
import { checkSrcRange, createTimestamp, getMediaFragment } from '@Services/utility-helpers';
import {
  checkManifestAnnotations,
  parseTranscriptData,
  TRANSCRIPT_TYPES,
  TRANSCRIPT_VALIDITY
} from '@Services/transcript-parser';
import './Transcript.scss';

const NO_TRANSCRIPTS_MSG = 'No valid Transcript(s) found, please check again.';
const INVALID_URL_MSG = 'Invalid URL for transcript, please check again.';

const Transcript = ({ playerID, transcripts }) => {
  const [canvasTranscripts, setCanvasTranscripts] = React.useState([]);
  const [transcript, _setTranscript] = React.useState([]);
  const [transcriptInfo, setTranscriptInfo] = React.useState({
    title: '',
    id: '',
    tUrl: '',
    tType: '',
    tFileExt: '',
    isMachineGen: false,
  });
  const [canvasIndex, _setCanvasIndex] = React.useState(0);
  const [isLoading, setIsLoading] = React.useState(true);
  const [errorMsg, setError] = React.useState('');
  const [noTranscript, setNoTranscript] = React.useState(false);

  let isMouseOver = false;
  // Setup refs to access state information within
  // event handler function
  const isMouseOverRef = React.useRef(isMouseOver);
  const setIsMouseOver = (state) => {
    isMouseOverRef.current = state;
    isMouseOver = state;
  };

  const isEmptyRef = React.useRef(false);
  const setIsEmpty = (e) => {
    isEmptyRef.current = e;
  };

  const canvasIndexRef = React.useRef();
  const setCanvasIndex = (c) => {
    canvasIndexRef.current = c;
    _setCanvasIndex(c);
  };

  // React refs array for each timed text value in the transcript
  let textRefs = React.useRef([]);
  const transcriptContainerRef = React.useRef();
  const transcriptRef = React.useRef();
  const setTranscript = (t) => {
    transcriptRef.current = t;
    _setTranscript(t);
  };
  let timedText = [];

  let player = null;

  React.useEffect(() => {
    setTimeout(function () {
      const domPlayer = document.getElementById(playerID);
      if (!domPlayer) {
        console.error(
          "Cannot find player, '" +
          playerID +
          "' on page. Transcript synchronization is disabled."
        );
      } else {
        player = domPlayer.children[0];
      }
      if (player) {
        observeCanvasChange(player);
        player.dataset['canvasindex']
          ? setCanvasIndex(player.dataset['canvasindex'])
          : setCanvasIndex(0);
        player.addEventListener('timeupdate', function (e) {
          if (e == null || e.target == null) {
            return;
          }
          const currentTime = e.target.currentTime;
          textRefs.current.map((tr) => {
            if (tr) {
              const start = tr.getAttribute('starttime');
              const end = tr.getAttribute('endtime');
              if (currentTime >= start && currentTime <= end) {
                !tr.classList.contains('active')
                  ? autoScrollAndHighlight(currentTime, tr)
                  : null;
              } else {
                // remove highlight
                tr.classList.remove('active');
              }
            }
          });
        });

        player.addEventListener('ended', function (e) {
          // render next canvas related transcripts
          setCanvasIndex(canvasIndex + 1);
        });
      }
    });
  });

  React.useEffect(() => {
    // Clean up state on component unmount
    return () => {
      setCanvasTranscripts([]);
      setTranscript([]);
      setTranscriptInfo({});
      setCanvasIndex();
      setNoTranscript(false);
      player = null;
      isMouseOver = false;
      timedText = [];
    };
  }, []);

  const fetchManifestData = React.useCallback(async (t) => {
    const data = await checkManifestAnnotations(t);
    // Check if a single item without transcript info is
    // listed to hide transcript selector from UI
    if (data?.length == 1 && data[0].validity != TRANSCRIPT_VALIDITY.transcript) {
      setIsEmpty(true);
    }
    setCanvasTranscripts(data);
    setStateVar(data[0]);
  }, []);

  React.useEffect(() => {
    let getCanvasT = (tr) => {
      return tr.filter((t) => t.canvasId == canvasIndex);
    };
    let getTItems = (tr) => {
      return getCanvasT(tr)[0].items;
    };
    /**
     * When transcripts prop is empty
     * OR the respective canvas doesn't have transcript data
     * OR canvas' transcript items list is empty
     */
    if (
      !transcripts?.length > 0 ||
      !getCanvasT(transcripts)?.length > 0 ||
      !getTItems(transcripts)?.length > 0
    ) {
      setIsLoading(false);
      setIsEmpty(true);
      setTranscript([]);
      setTranscriptInfo({ tType: TRANSCRIPT_TYPES.noTranscript });
      setError(NO_TRANSCRIPTS_MSG);
    } else {
      const cTrancripts = getCanvasT(transcripts);
      fetchManifestData(cTrancripts[0]);
    }
  }, [canvasIndex]);

  const observeCanvasChange = () => {
    // Select the node that will be observed for mutations
    const targetNode = player;

    // Options for the observer (which mutations to observe)
    const config = { attributes: true, childList: true, subtree: true };

    // Callback function to execute when mutations are observed
    const callback = function (mutationsList, observer) {
      // Use traditional 'for loops' for IE 11
      for (const mutation of mutationsList) {
        if (mutation.attributeName?.includes('src')) {
          const p =
            document.querySelector('video') || document.querySelector('audio');
          if (p) {
            setCanvasIndex(parseInt(p.dataset['canvasindex']));
          }
        }
      }
    };

    // Create an observer instance linked to the callback function
    const observer = new MutationObserver(callback);

    // Start observing the target node for configured mutations
    observer.observe(targetNode, config);
  };

  const selectTranscript = (selectedId) => {
    const selectedTranscript = canvasTranscripts.filter(function (tr) {
      return tr.id === selectedId;
    });
    setStateVar(selectedTranscript[0]);
  };

  const setStateVar = async (transcript) => {
    if (!transcript) {
      return;
    }

    const { id, title, url, validity, isMachineGen } = transcript;

    if (validity == TRANSCRIPT_VALIDITY.transcript) {
      // parse transcript data and update state variables
      await Promise.resolve(
        parseTranscriptData(url, canvasIndexRef.current)
      ).then(function (value) {
        if (value != null) {
          const { tData, tUrl, tType, tFileExt } = value;
          setTranscript(tData);
          setTranscriptInfo({ title, id, isMachineGen, tType, tUrl, tFileExt });

          if (tType === TRANSCRIPT_TYPES.invalid) {
            setError(INVALID_URL_MSG);
          } else if (tType === TRANSCRIPT_TYPES.noTranscript) {
            setError(NO_TRANSCRIPTS_MSG);
          }
        }
        setIsLoading(false);
        setNoTranscript(false);
      });
    } else {
      setTranscript([]);
      setIsLoading(false);
      setNoTranscript(true);

      if (validity == TRANSCRIPT_VALIDITY.noTranscript) {
        setError(NO_TRANSCRIPTS_MSG);
        setTranscriptInfo({ title, id, tUrl: url, tType: TRANSCRIPT_TYPES.noTranscript });
      } else {
        setError(INVALID_URL_MSG);
        setTranscriptInfo({ title, id, tUrl: url, tType: TRANSCRIPT_TYPES.invalid });
      }
    }

  };

  const autoScrollAndHighlight = (currentTime, tr) => {
    if (!tr) {
      return;
    }

    // Highlight clicked/current time's transcript text
    let textTopOffset = 0;
    const start = tr.getAttribute('starttime');
    const end = tr.getAttribute('endtime');
    if (!start || !end) {
      return;
    }
    if (currentTime >= start && currentTime <= end) {
      tr.classList.add('active');
      textTopOffset = tr.offsetTop;
    } else {
      tr.classList.remove('active');
    }

    // When using the transcript panel to scroll/select text
    // return without auto scrolling
    if (isMouseOverRef.current) {
      return;
    }

    // divide by 2 to vertically center the highlighted text
    transcriptContainerRef.current.scrollTop =
      textTopOffset -
      transcriptContainerRef.current.clientHeight / 2;
  };

  /**
   * Playable range in the player
   * @returns {Object}
   */
  const getPlayerDuration = () => {
    const duration = player.duration;
    let timeFragment = getMediaFragment(player.src, duration);
    if (timeFragment == undefined) {
      timeFragment = { start: 0, end: duration };
    }
    return timeFragment;
  };

  /**
   * Determine a transcript text line is within playable
   * range
   * @param {Object} ele target element from click event
   * @returns {Boolean}
   */
  const getIsClickable = (ele) => {
    const segmentRange = {
      start: Number(ele.getAttribute('starttime')),
      end: Number(ele.getAttribute('endtime')),
    };
    const playerRange = getPlayerDuration();
    const isInRange = checkSrcRange(segmentRange, playerRange);
    return isInRange;
  };

  /**
   * When clicked on a transcript text seek to the respective
   * timestamp in the player
   * @param {Object} e event for the click
   */
  const handleTranscriptTextClick = (e) => {
    e.preventDefault();

    /**
     * Disregard the click, which uses the commented out lines
     * or reset the player to the start time (the current functionality)
     * when clicked on a transcript line that is out of playable range.
     *  */
    // const parentEle = e.target.parentElement;
    // const isClickable = getIsClickable(parentEle);

    // if (isClickable) {
    if (player) {
      player.currentTime = e.currentTarget.getAttribute('starttime');
    }

    textRefs.current.map((tr) => {
      if (tr && tr.classList.contains('active')) {
        tr.classList.remove('active');
      }
    });
    e.currentTarget.classList.add('active');
    // }
  };

  /**
   * Update state based on mouse events - hover or not hover
   * @param {Boolean} state flag identifying mouse event
   */
  const handleMouseOver = (state) => {
    setIsMouseOver(state);
  };

  const buildSpeakerText = (t) => {
    let speakerText = '';
    if (t.speaker) {
      speakerText = `<u>${t.speaker}:</u> ${t.text}`;
    } else {
      speakerText = t.text;
    }
    return speakerText;
  };

  if (transcriptRef.current) {
    timedText = [];
    switch (transcriptInfo.tType) {
      case TRANSCRIPT_TYPES.doc:
        // when given a word document as a transcript
        timedText.push(
          <div
            data-testid="transcript_docs"
            dangerouslySetInnerHTML={{ __html: transcript[0] }}
          />
        );
        break;
      case TRANSCRIPT_TYPES.timedText:
        if (transcript.length > 0) {
          transcript.map((t, index) => {
            let line = (
              <div
                className="ramp--transcript_item"
                data-testid="transcript_item"
                key={`t_${index}`}
                ref={(el) => (textRefs.current[index] = el)}
                onClick={handleTranscriptTextClick}
                starttime={t.begin} // set custom attribute: starttime
                endtime={t.end} // set custom attribute: endtime
              >
                {t.begin && (
                  <span
                    className="ramp--transcript_time"
                    data-testid="transcript_time"
                    key={`ttime_${index}`}
                  >
                    <a href={'#'}>[{createTimestamp(t.begin, true)}]</a>
                  </span>
                )}

                <span
                  className="ramp--transcript_text"
                  data-testid="transcript_text"
                  key={`ttext_${index}`}
                  dangerouslySetInnerHTML={{ __html: buildSpeakerText(t) }}
                />
              </div>
            );
            timedText.push(line);
          });
        }
        break;
      case TRANSCRIPT_TYPES.plainText:
        timedText.push(
          <div
            data-testid="transcript_plain-text"
            key={0}
            dangerouslySetInnerHTML={{ __html: transcript }}
          />
        );
        break;
      case TRANSCRIPT_TYPES.invalid:
      case TRANSCRIPT_TYPES.noTranscript:
      default:
        // invalid transcripts
        timedText.push(
          <p key="no-transcript" id="no-transcript" data-testid="no-transcript">
            {errorMsg}
          </p>
        );
        break;
    }
  }

  if (!isLoading) {
    return (
      <div
        className="ramp--transcript_nav"
        data-testid="transcript_nav"
        key={transcriptInfo.title}
        onMouseOver={() => handleMouseOver(true)}
        onMouseLeave={() => handleMouseOver(false)}
      >
        {!isEmptyRef.current && (
          <div className="transcript_menu">
            <TanscriptSelector
              selectTranscript={selectTranscript}
              transcriptData={canvasTranscripts}
              transcriptInfo={transcriptInfo}
              noTranscript={noTranscript}
            />
          </div>
        )}
        <div
          className={`transcript_content ${transcriptRef.current ? '' : 'static'
            }`}
          ref={transcriptContainerRef}
          data-testid={`transcript_content_${transcriptInfo.tType}`}
        >
          {timedText}
        </div>
      </div>
    );
  } else {
    return null;
  }
};

Transcript.propTypes = {
  /** `id` attribute of the media player in the DOM */
  playerID: PropTypes.string.isRequired,
  /** A list of transcripts for respective canvases in the manifest */
  transcripts: PropTypes.arrayOf(
    PropTypes.shape({
      /** Index of the canvas in manifest, starts with zero */
      canvasId: PropTypes.number.isRequired,
      /** List of title and URI key value pairs for each individual transcript resource */
      items: PropTypes.arrayOf(
        PropTypes.shape({
          title: PropTypes.string,
          url: PropTypes.string,
        })
      ),
    })
  ).isRequired,
};

export default Transcript;
