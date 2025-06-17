import React, { useState, useEffect } from 'react';
import './App.css';

// Main App component
const App = () => {
  const [topic, setTopic] = useState('');
  const [script, setScript] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [duration, setDuration] = useState(3); // Default duration in minutes

  const [voiceOptions, setVoiceOptions] = useState([]);
  const [selectedVoice, setSelectedVoice] = useState('');
  const [pacing, setPacing] = useState(0); // Default pacing
  const [audioUrl, setAudioUrl] = useState('');
  const [audioLoading, setAudioLoading] = useState(false);
  const [audioError, setAudioError] = useState('');

  const [selectedFile, setSelectedFile] = useState(null);
  const [useUploadedFile, setUseUploadedFile] = useState(false); // Toggle for using uploaded file

  // Fetch voice options from the backend when the component mounts
  useEffect(() => {
    const fetchVoices = async () => {
      try {
        // IMPORTANT: Ensure your Flask backend is running on http://127.0.0.1:5000
        const response = await fetch('http://127.0.0.1:5000/api/voices');
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const voices = await response.json();
        setVoiceOptions(voices);
        if (voices.length > 0) {
          setSelectedVoice(voices[0].id); // Select the first voice by default
        }
      } catch (err) {
        console.error("Error fetching voices:", err);
        // Fallback to mock voices if backend is not available (for demonstration)
        const mockVoices = [
          { id: 'en-US-JennyNeural', name: 'Jenny (US, Female)' },
          { id: 'en-US-GuyNeural', name: 'Guy (US, Male)' },
          { id: 'en-GB-SoniaNeural', name: 'Sonia (UK, Female)' },
        ];
        setVoiceOptions(mockVoices);
        if (mockVoices.length > 0) {
          setSelectedVoice(mockVoices[0].id);
        }
        setAudioError('Failed to load voice options from backend. Using mock voices.');
      }
    };
    fetchVoices();
  }, []);

  // Function to call the Gemini API for script generation
  const generateScript = async () => {
    if (!topic.trim()) {
      setError('Please enter a topic to generate a script.');
      return;
    }

    setLoading(true);
    setError('');
    setScript(null); // Clear previous script
    setAudioUrl(''); // Clear previous audio
    setAudioError('');
    setSelectedFile(null); // Clear any selected file when generating a new script
    setUseUploadedFile(false); // Reset toggle

    try {
      const prompt = `Generate a video script for a video about "${topic}". The script should be structured with a clear Hook, an Introduction, a Body with at least two main points, a Conclusion, and a Call to Action (CTA). For each section, provide a 'heading', 'dialogue', 'sceneDescription' (visuals/actions), and 'brollSuggestions' (list of B-roll footage ideas). Ensure the script is engaging and suitable for a ${duration} minute video. Adjust the content length and depth accordingly.`;

      let chatHistory = [];
      chatHistory.push({ role: "user", parts: [{ text: prompt }] });

      const response = await fetch('http://127.0.0.1:5000/api/generate_script', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          topic,
          duration,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate script');
      }

      const data = await response.json();
      setScript(data);
    } catch (err) {
      console.error("Error generating script:", err);
      setError('Failed to generate script. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handler for file selection
  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file && file.type === 'text/plain') {
      setSelectedFile(file);
      setUseUploadedFile(true); // Automatically switch to using uploaded file
      setAudioError(''); // Clear any previous audio error
    } else {
      setSelectedFile(null);
      setUseUploadedFile(false);
      // Using a custom message box instead of alert()
      alert('Please select a valid text (.txt) file.');
    }
  };

  // Function to generate audio
  const generateAudio = async () => {
    setAudioLoading(true);
    setAudioError('');
    setAudioUrl('');

    let headers;

    if (useUploadedFile && selectedFile) {
      // If using an uploaded file, read its content and send as FormData
      const reader = new FileReader();
      reader.onload = async (e) => {
        const fileContent = e.target.result;
        const formData = new FormData();
        formData.append('text_file', new Blob([fileContent], { type: 'text/plain' }), selectedFile.name);
        formData.append('voice_id', selectedVoice);
        formData.append('pacing', pacing);

        try {
          const response = await fetch('http://127.0.0.1:5000/api/generate_audio', {
            method: 'POST',
            body: formData // FormData automatically sets Content-Type to multipart/form-data
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`Backend error: ${errorData.error || response.statusText}`);
          }

          const result = await response.json();
          setAudioUrl(`http://127.0.0.1:5000${result.audio_url}`);
          console.log("Audio generated successfully from file.");
        } catch (err) {
          console.error("Error generating audio from file:", err);
          setAudioError(`Failed to generate audio from file: ${err.message}. Ensure backend is running.`);
        } finally {
          setAudioLoading(false);
        }
      };
      reader.onerror = () => {
        setAudioError('Failed to read the file.');
        setAudioLoading(false);
      };
      reader.readAsText(selectedFile);
    } else {
      // If not using an uploaded file, or no file is selected, use the generated script's dialogue
      if (!script) {
        setAudioError('Please generate a script first or upload a text file.');
        setAudioLoading(false);
        return;
      }
      const dialogueText = script.sections.map(s => s.dialogue).join('\n\n'); // Combine all dialogue

      const requestBody = JSON.stringify({
        text: dialogueText,
        voice_id: selectedVoice,
        pacing: pacing
      });
      headers = { 'Content-Type': 'application/json' };

      try {
        const response = await fetch('http://127.0.0.1:5000/api/generate_audio', {
          method: 'POST',
          headers: headers,
          body: requestBody
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(`Backend error: ${errorData.error || response.statusText}`);
        }

        const result = await response.json();
        setAudioUrl(`http://127.0.0.1:5000${result.audio_url}`);
        console.log("Audio generated successfully from script.");
      } catch (err) {
        console.error("Error generating audio from script:", err);
        setAudioError(`Failed to generate audio from script: ${err.message}. Ensure backend is running.`);
      } finally {
        setAudioLoading(false);
      }
    }
  };


  // Main application render
  return (
    <div className="container">
      <header className="app-header">
        <h1 className="app-title">AI Script Generator</h1>
        <p className="app-description">
          Generate professional video scripts and convert them to speech with our AI-powered tool
        </p>
      </header>

      <main className="main-content">
        <div className="input-group">
          <label htmlFor="topic" className="input-label">Video Topic</label>
          <input
            type="text"
            id="topic"
            className="text-input"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="Enter your video topic..."
          />
        </div>

        <div className="input-group">
          <div className="duration-slider">
            <label htmlFor="duration" className="input-label">Video Duration</label>
            <input
              type="range"
              id="duration"
              className="range-input"
              min="1"
              max="10"
              step="1"
              value={duration}
              onChange={(e) => setDuration(parseInt(e.target.value))}
            />
            <div className="duration-display">
              <span>1 min</span>
              <span className="duration-value">{duration} minutes</span>
              <span>10 min</span>
            </div>
          </div>
        </div>

        <div className="toggle-container">
          <label className="input-label">
            <input
              type="checkbox"
              checked={useUploadedFile}
              onChange={() => setUseUploadedFile(!useUploadedFile)}
            />
            Use uploaded script file
          </label>
        </div>

        {useUploadedFile && (
          <div className="file-input-container">
            <label htmlFor="scriptFile" className="input-label">Upload Script File</label>
            <input
              type="file"
              id="scriptFile"
              className="text-input"
              onChange={(e) => setSelectedFile(e.target.files[0])}
              accept=".txt"
            />
          </div>
        )}

        <div className="input-group">
          <label htmlFor="voice" className="input-label">Select Voice</label>
          <select
            id="voice"
            className="select-input"
            value={selectedVoice}
            onChange={(e) => setSelectedVoice(e.target.value)}
          >
            {voiceOptions.map((voice) => (
              <option key={voice.id} value={voice.id}>
                {voice.name}
              </option>
            ))}
          </select>
        </div>

        <div className="input-group">
          <label htmlFor="pacing" className="input-label">
            Speech Pacing: {pacing}%
          </label>
          <input
            type="range"
            id="pacing"
            className="range-input"
            min="-50"
            max="50"
            value={pacing}
            onChange={(e) => setPacing(parseInt(e.target.value))}
          />
        </div>

        <button
          className="button"
          onClick={generateScript}
          disabled={loading || (!topic && !useUploadedFile)}
        >
          {loading ? <div className="loading-spinner"></div> : 'Generate Script'}
        </button>

        {error && <div className="error-message">{error}</div>}

        {script && (
          <div className="script-output">
            <h2>{script.title}</h2>
            <div className="sections-container">
              {script.sections.map((section, index) => (
                <div key={index} className="section-card">
                  <h3 className="section-heading">{section.heading}</h3>
                  <p>{section.dialogue}</p>
                  <p><strong>Scene:</strong> {section.sceneDescription}</p>
                  {section.brollSuggestions && (
                    <>
                      <strong>B-roll Suggestions:</strong>
                      <ul className="broll-list">
                        {section.brollSuggestions.map((suggestion, i) => (
                          <li key={i} className="broll-item">{suggestion}</li>
                        ))}
                      </ul>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {script && !audioLoading && !audioUrl && (
          <button
            className="button"
            onClick={generateAudio}
            style={{ marginTop: '1rem' }}
          >
            Generate Audio
          </button>
        )}

        {audioLoading && (
          <div className="loading-spinner" style={{ margin: '1rem auto' }}></div>
        )}

        {audioError && <div className="error-message">{audioError}</div>}

        {audioUrl && (
          <audio controls className="audio-player" src={audioUrl}>
            Your browser does not support the audio element.
          </audio>
        )}
      </main>
    </div>
  );
}

export default App;
