import requests
import os

# Ensure the backend is running at this address
AUDIO_GENERATION_URL = "http://127.0.0.1:5000/api/generate_audio"

# Path to your text file
file_path = "healthy_diet_script.txt"

# Ensure the file exists
if not os.path.exists(file_path):
    print(f"Error: The file '{file_path}' was not found. Please create it in the same directory as this script.")
    exit()

# Open the file in binary read mode
with open(file_path, 'rb') as f:
    # Prepare the files dictionary for the requests.post call
    # 'text_file' here must match the key your Flask backend expects (request.files['text_file'])
    files = {
        'text_file': (os.path.basename(file_path), f, 'text/plain')
    }

    # Prepare the data (form fields for voice_id and pacing)
    data = {
        'voice_id': 'en-US-GuyNeural',
        'pacing': '10'
    }

    try:
        # Send the POST request
        response = requests.post(AUDIO_GENERATION_URL, files=files, data=data)
        response.raise_for_status()  # Raise an exception for HTTP errors (4xx or 5xx)

        # Parse and print the JSON response from the backend
        result = response.json()
        print("Audio generation successful!")
        print(f"Audio URL: {result.get('audio_url')}")

    except requests.exceptions.RequestException as e:
        print(f"An error occurred: {e}")
        if response is not None:
            print(f"Server response content: {response.text}")  # Print raw response text for debugging
