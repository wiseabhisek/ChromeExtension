// Initialize an array to store the transcript script
let script = [];

// Initialize variables to keep track of the last span and speaker
let last_span = '';
let last_speaker = '';
let isRunning = true;

// Create a MutationObserver instance for transcript changes
const transcriptObserver = new MutationObserver((mutations) => {
  mutations.forEach((mutation) => {
    // Check if the mutation is related to the transcript
    if (mutation.target.classList && mutation.target.classList.contains('iTTPOb') && isRunning) {
      if (mutation.addedNodes.length) {
        const newNodes = mutation.addedNodes;
        const speaker = newNodes[0]?.parentNode?.parentNode?.parentNode?.querySelector('.zs7s8d.jxFHg')?.textContent;

        if (speaker) {
          // Delay processing by 10 seconds to ensure full transcript is loaded
          setTimeout(function () {
            if (newNodes.length) {
              if (last_speaker !== speaker) {
                script.push({ 'speaker': speaker, "script": newNodes["0"].innerText + "\r\n" });
                last_speaker = speaker;
              } else {
                var lastText = script.pop();
                lastText['script'] = lastText['script'] + newNodes["0"].innerText + "\r\n";
                script.push(lastText);
              }
            }
          }, 10000);
        }
      }
    }

    // Check for removed nodes
    for (const oldNode of mutation.removedNodes) {
      if (oldNode?.classList?.value === 'TBMuR bj4p3b') {
        lastConvo = script.shift();
        last_speaker = '';
        if (lastConvo) {
          lastConvo['Time'] = new Date().getTime();

          console.log({ "URL": document.URL, "Conversation": lastConvo });
          chrome.runtime.sendMessage({ originFile: 'content', destinationFile: 'background', command: 'sendConversation',
            "URL": document.URL.includes('?') ? document.URL.split('?')[0] : document.URL,
            "Conversation": lastConvo
          });
        }
      }
    }
  });
});

// Create a MutationObserver instance for detecting the meeting page
const divObserver = new MutationObserver(() => {
  // XPath to find the closed caption button
  const ccButtonXpath = '//button[@jsname="r8qRAd"]';
  const result = document.evaluate(ccButtonXpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
  const ccButton = result.singleNodeValue;

  if (ccButton) {
    // Click the closed caption button
    ccButton.click();
    console.log('ccButton found')

    // XPath to find the caption div
    const captionDivXpath = '//div[@class="iOzk7"]';
    const captionDivXpathResult = document.evaluate(captionDivXpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
    const captionDiv = captionDivXpathResult.singleNodeValue;

    // Configure MutationObserver to observe caption changes
    const config = {
      childList: true,
      subtree: true,
      attributes: false,
      characterData: false,
    };

    // Disconnect the divObserver since it's no longer needed
    divObserver.disconnect();
    console.log('The divObserver was disconnected');
    // Start observing transcript changes
    transcriptObserver.observe(captionDiv, config);

    captionDiv.parentNode.parentNode.style.height = '1px';
  } else {
    console.log('ccButton not found');
  }
});

// Define the target node for divObserver
const targetNode = document.body;
const config = { childList: true, subtree: true };

// Start observing changes in the target node
divObserver.observe(targetNode, config);
// Send a message to background.js when the content script is loaded
chrome.runtime.sendMessage({ from: 'content', command: 'contentScriptLoaded' });

// Listen for messages from popup.js
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.command === 'popupOpened') {
    // Handle the message from popup.js here
    console.log('Popup opened message received in content.js');
    
    // Send a message to popup.js
    chrome.runtime.sendMessage({ from: 'content', command: 'contentToPopup', data: 'Hello from content.js' });
  }
});

// Listen for messages from popup.js
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  console.log('Message received in content.js from popup.js', request);
  if (request.destinationFile === 'content' ) {
    if (request.originFile === 'popup') {
      if (request.command === 'startCaption') {
        //enter code for caption show
      } else if (request.command === 'stopCaption') {
        //enter code for caption hide
      } else if (request.command === 'startRecording') {
        isRunning = true;
      } else if (request.command === 'stopRecording') {
        isRunning = false;
      }
    }
  }
});