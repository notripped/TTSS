import React, { useState, useEffect } from 'react';

// Main App component
const App = () => {
  const [topic, setTopic] = useState('');
  const [script, setScript] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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
      const prompt = `Generate a video script for a video about "${topic}". The script should be structured with a clear Hook, an Introduction, a Body with at least two main points, a Conclusion, and a Call to Action (CTA). For each section, provide a 'heading', 'dialogue', 'sceneDescription' (visuals/actions), and 'brollSuggestions' (list of B-roll footage ideas). Ensure the script is engaging and suitable for a 2-3 minute video.

      Please provide the output in a JSON format matching the following schema:
      {
        "type": "OBJECT",
        "properties": {
          "title": { "type": "STRING" },
          "videoLength": { "type": "STRING", "description": "e.g., '2-3 minutes', '5 minutes'" },
          "sections": {
            "type": "ARRAY",
            "items": {
              "type": "OBJECT",
              "properties": {
                "type": { "type": "STRING", "enum": ["Hook", "Introduction", "Body", "Conclusion", "Call to Action"] },
                "heading": { "type": "STRING" },
                "dialogue": { "type": "STRING" },
                "sceneDescription": { "type": "STRING", "description": "Visuals/actions during this section" },
                "brollSuggestions": {
                  "type": "ARRAY",
                  "items": { "type": "STRING" },
                  "description": "Suggestions for B-roll footage"
                }
              },
              "required": ["type", "heading", "dialogue", "sceneDescription"]
            }
          }
        },
        "required": ["title", "sections"]
      }
      `;

      let chatHistory = [];
      chatHistory.push({ role: "user", parts: [{ text: prompt }] });

      const payload = {
        contents: chatHistory,
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: {
            type: "OBJECT",
            properties: {
              "title": { "type": "STRING" },
              "videoLength": { "type": "STRING", "description": "e.g., '2-3 minutes', '5 minutes'" },
              "sections": {
                "type": "ARRAY",
                "items": {
                  "type": "OBJECT",
                  "properties": {
                    "type": { "type": "STRING", "enum": ["Hook", "Introduction", "Body", "Conclusion", "Call to Action"] },
                    "heading": { "type": "STRING" },
                    "dialogue": { "type": "STRING" },
                    "sceneDescription": { "type": "STRING", "description": "Visuals/actions during this section" },
                    "brollSuggestions": {
                      "type": "ARRAY",
                      "items": { "type": "STRING" },
                      "description": "Suggestions for B-roll footage"
                    }
                  },
                  "required": ["type", "heading", "dialogue", "sceneDescription"]
                }
              }
            },
            "required": ["title", "sections"]
          }
        }
      };

      const apiKey = "AIzaSyBJXSadUPf3M0J7reB9BmyLc_dKC30bhf0"; // Canvas will provide this in runtime. Do not add API key validation.
      const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const result = await response.json();

      if (result.candidates && result.candidates.length > 0 &&
          result.candidates[0].content && result.candidates[0].content.parts &&
          result.candidates[0].content.parts.length > 0) {
        const jsonString = result.candidates[0].content.parts[0].text;
        const parsedScript = JSON.parse(jsonString);
        setScript(parsedScript);
      } else {
        setError('Failed to generate script: Unexpected response structure from LLM.');
      }
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
    <div className="min-h-screen bg-gradient-to-br from-purple-800 to-indigo-900 text-white p-6 font-sans antialiased">
      <script src="https://cdn.tailwindcss.com"></script>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet" />
      <style>{`
        body { font-family: 'Inter', sans-serif; }
        .card {
          background: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(10px);
          border-radius: 1.5rem;
          border: 1px solid rgba(255, 255, 255, 0.2);
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .btn {
          @apply px-6 py-3 rounded-xl font-semibold transition-all duration-300 ease-in-out;
          @apply bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-75;
        }
        .input-field {
          /* Updated for black background and white text in dropdown */
          @apply w-full p-3 rounded-lg bg-black text-white border border-gray-600 focus:border-purple-500 focus:ring focus:ring-purple-500 focus:ring-opacity-50;
        }
        .toggle-switch {
          position: relative;
          display: inline-block;
          width: 60px;
          height: 34px;
        }
        .toggle-switch input {
          opacity: 0;
          width: 0;
          height: 0;
        }
        .slider {
          position: absolute;
          cursor: pointer;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: #ccc;
          transition: .4s;
          border-radius: 34px;
        }
        .slider:before {
          position: absolute;
          content: "";
          height: 26px;
          width: 26px;
          left: 4px;
          bottom: 4px;
          background-color: white;
          transition: .4s;
          border-radius: 50%;
        }
        input:checked + .slider {
          background-color: #8B5CF6; /* Purple-500 */
        }
        input:focus + .slider {
          box-shadow: 0 0 1px #8B5CF6;
        }
        input:checked + .slider:before {
          transform: translateX(26px);
        }
        /* Specific style for dropdown options for better visibility on dark background */
        .input-field option {
          background-color: #000; /* Black background for options */
          color: #fff; /* White text for options */
        }
      `}</style>

      <div className="container mx-auto max-w-4xl py-12">
        <h1 className="text-5xl font-extrabold text-center mb-10 leading-tight">
          🎥 Video Script <span className="text-purple-400">Gen</span>
        </h1>

        {/* Input Section */}
        <div className="card p-8 mb-8">
          <h2 className="text-2xl font-bold mb-4">Topic Input</h2>
          <input
            type="text"
            className="input-field mb-4 text-gray-100" // Note: text-gray-100 is overwritten by text-white in .input-field
            placeholder="Enter your video topic (e.g., 'Benefits of AI in daily life')"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            disabled={loading}
          />
          <button
            onClick={generateScript}
            className="btn w-full"
            disabled={loading}
          >
            {loading ? 'Generating Script...' : 'Generate Script'}
          </button>
          {error && <p className="text-red-400 mt-4 text-center">{error}</p>}
        </div>

        {/* Script Display */}
        {script && (
          <div className="card p-8 mb-8">
            <h2 className="text-3xl font-bold text-purple-300 mb-6">{script.title}</h2>
            <p className="text-sm text-gray-300 mb-6">Estimated Length: {script.videoLength}</p>

            {script.sections.map((section, index) => (
              <div key={index} className="mb-8 p-6 bg-gray-800 rounded-xl border border-gray-700">
                <h3 className="text-xl font-semibold mb-3 text-purple-200">{section.type}: {section.heading}</h3>
                <p className="text-gray-200 mb-3 leading-relaxed">{section.dialogue}</p>
                <p className="text-gray-400 text-sm italic mb-2">
                  <span className="font-medium text-gray-300">Scene:</span> {section.sceneDescription}
                </p>
                {section.brollSuggestions && section.brollSuggestions.length > 0 && (
                  <p className="text-gray-400 text-sm italic">
                    <span className="font-medium text-gray-300">B-roll:</span> {section.brollSuggestions.join(', ')}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Voice Generation Section */}
        <div className="card p-8">
          <h2 className="text-2xl font-bold mb-4">Generate Voiceover</h2>

          <div className="flex items-center justify-between mb-6">
            <span className="text-gray-200">Use Uploaded File for Audio:</span>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={useUploadedFile}
                onChange={(e) => {
                  setUseUploadedFile(e.target.checked);
                  // Clear selected file if turning off file upload, or vice-versa
                  if (!e.target.checked) setSelectedFile(null);
                }}
              />
              <span className="slider"></span>
            </label>
          </div>

          {useUploadedFile ? (
            <div className="mb-4">
              <label className="block text-gray-300 text-sm font-bold mb-2" htmlFor="text-file-upload">
                Upload Text File (.txt):
              </label>
              <input
                type="file"
                id="text-file-upload"
                accept=".txt"
                onChange={handleFileChange}
                className="input-field text-gray-100 file:mr-4 file:py-2 file:px-4
                         file:rounded-full file:border-0
                         file:text-sm file:font-semibold
                         file:bg-purple-50 file:text-purple-700
                         hover:file:bg-purple-100"
                disabled={audioLoading}
              />
              {selectedFile && (
                <p className="text-gray-400 text-sm mt-2">Selected: {selectedFile.name}</p>
              )}
            </div>
          ) : (
            <p className="text-gray-400 mb-4">Using dialogue from generated script.</p>
          )}

          <label className="block text-gray-300 text-sm font-bold mb-2" htmlFor="voice-select">
            Select Voice:
          </label>
          <select
            id="voice-select"
            className="input-field mb-4" /* Applied input-field class for black background, text-white already in it */
            value={selectedVoice}
            onChange={(e) => setSelectedVoice(e.target.value)}
            disabled={audioLoading}
          >
            {voiceOptions.map(voice => (
              <option key={voice.id} value={voice.id}>{voice.name}</option>
            ))}
          </select>

          <label className="block text-gray-300 text-sm font-bold mb-2" htmlFor="pacing-slider">
            Pacing: {pacing}%
          </label>
          <input
            type="range"
            id="pacing-slider"
            min="-50"
            max="100"
            step="1"
            value={pacing}
            onChange={(e) => setPacing(parseInt(e.target.value))}
            className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer mb-6"
            disabled={audioLoading}
          />

          <button
            onClick={generateAudio}
            className="btn w-full"
            disabled={audioLoading || (useUploadedFile && !selectedFile) || (!useUploadedFile && !script)}
          >
            {audioLoading ? 'Generating Audio...' : 'Generate Voiceover'}
          </button>
          {audioError && <p className="text-red-400 mt-4 text-center">{audioError}</p>}
          {audioUrl && (
            <div className="mt-6 flex flex-col items-center">
              <h4 className="text-xl font-semibold mb-3 text-purple-200">Listen to Voiceover</h4>
              <audio controls src={audioUrl} className="w-full max-w-md">
                Your browser does not support the audio element.
              </audio>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default App;
