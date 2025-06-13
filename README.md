The Video Script Generation & Voiceover System is designed as a full-stack application with distinct frontend and backend components, orchestrated by a powerful large language model.

Here's the approach to how the system operates:

**1. User Interaction (Frontend - React/Vite):**
The user begins by interacting with the React-based web application, built with Vite.
* They can either **input a video topic** directly into a text field or **upload a pre-written text file** containing their script.
* They also select desired **voice options** (fetched from the backend) and adjust **pacing** settings through the UI.

**2. Script Generation (Frontend -> LLM):**
* If the user provides a topic, the React frontend makes a direct API call to the **Gemini 2.0 Flash API**.
* The API request includes a detailed prompt that instructs the LLM to generate a structured video script. This script is formatted into a JSON object with sections like "Hook," "Introduction," "Body," "Conclusion," and "Call to Action," each containing "dialogue," "sceneDescription," and "brollSuggestions."
* The LLM processes the request and returns the structured script JSON to the frontend.
* The React app then parses and displays this generated script in a user-friendly format on the page.

**3. Voice Generation Request (Frontend -> Backend - Flask/Python):**
* Once a script is generated (or a text file is uploaded), the user can initiate voiceover generation.
* The React frontend sends an HTTP POST request to the **Flask backend** (`http://127.0.0.1:5000/api/generate_audio`).
* This request differs based on user choice:
    * **If using the generated script:** The combined "dialogue" text from all script sections is sent as a JSON payload, along with the `voice_id` and `pacing` settings.
    * **If using an uploaded file:** The content of the selected text file is sent as `multipart/form-data` with the `text_file` field, also including `voice_id` and `pacing` as form fields.

**4. Voice Synthesis & Audio Processing (Backend - Flask/Python):**
* The Flask backend (`tts.py`) receives the request.
* It extracts the text content and parameters (voice, pacing).
* It utilizes the **`edge-tts` Python library** to convert the received text into speech. The `pacing` parameter directly influences the speech rate in `edge-tts`.
* (Although currently disabled, if background music mixing were enabled, the `pydub` library would then be used to overlay a background music track onto the generated speech, adjusting volumes as needed).
* The final audio is saved as an `.mp3` file in a designated `generated_audio` directory on the server.

**5. Audio Delivery (Backend -> Frontend):**
* After successful audio generation, the Flask backend returns a JSON response to the frontend containing a URL to the newly created audio file (e.g., `/audio/final_audio_xxxxxx.mp3`).
* The React frontend receives this URL and dynamically updates the UI to display an audio player, allowing the user to listen to the generated voiceover.

This modular approach allows each component to specialize in its task (LLM for content, Flask for TTS and audio, React for UI), ensuring scalability and maintainability.
