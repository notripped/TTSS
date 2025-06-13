import json
import requests # For making HTTP requests to the Gemini API

def generate_video_script_llm(topic: str, output_filename: str = None) -> dict | None:
    """
    Generates a video script for a given topic using the Gemini 2.0 Flash model
    and optionally saves the output to a text file.

    Args:
        topic (str): The topic for which to generate the video script.
        output_filename (str, optional): The name of the file to save the script to.
                                        If None, the script is not saved to a file.

    Returns:
        dict | None: The generated video script as a dictionary, or None if an error occurred.
    """

    # Define the API endpoint for the Gemini 2.0 Flash model.
    # IMPORTANT: Replace "YOUR_GEMINI_API_KEY_HERE" with your actual Gemini API key
    # from your user variable.
    api_key = "AIzaSyBJXSadUPf3M0J7reB9BmyLc_dKC30bhf0" # <--- PLACE YOUR GEMINI API KEY HERE
    api_url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={api_key}"

    # Construct the detailed prompt for the LLM.
    # The prompt explicitly asks for a specific JSON structure for the video script.
    prompt = f"""
    Generate a concise video script for a video about "{topic}".
    Generate the script that it should contain different sections and keep them in different paragraphs. They should all be connected to each other with a hook, an introduction, body, and a conclusion.
    Do not keep any kind of headings or anything such as that just plain description   
    Ensure the script is engaging and suitable for the video (e.g., 6-7 minutes).
    Keep the length of the script upto 5-6 minutes.
    Please provide the output in a JSON format matching the following schema:
    {{
      "type": "OBJECT",
      "properties": {{
        "title": {{ "type": "STRING", "description": "Title of the video script" }},
        "videoLength": {{ "type": "STRING", "description": "Estimated video length, e.g., '2-3 minutes'" }},
        "sections": {{
          "type": "ARRAY",
          "items": {{
            "type": "OBJECT",
            "properties": {{
              "type": {{ "type": "STRING", "enum": ["Hook", "Introduction", "Body", "Conclusion", "Call to Action"] }},
              "heading": {{ "type": "STRING" }},
              "dialogue": {{ "type": "STRING" }},
              "sceneDescription": {{ "type": "STRING", "description": "Visuals/actions during this section" }},
              "brollSuggestions": {{
                "type": "ARRAY",
                "items": {{ "type": "STRING" }},
                "description": "Suggestions for B-roll footage"
              }}
            }},
            "required": ["type", "heading", "dialogue", "sceneDescription"]
          }}
        }}
      }},
      "required": ["title", "videoLength", "sections"]
    }}
    """

    # Prepare the payload for the API request.
    # The `generationConfig` is crucial for requesting a structured JSON response.
    payload = {
        "contents": [
            {"role": "user", "parts": [{"text": prompt}]}
        ],
        "generationConfig": {
            "responseMimeType": "application/json",
            "responseSchema": {
                "type": "OBJECT",
                "properties": {
                    "title": {"type": "STRING"},
                    "videoLength": {"type": "STRING"},
                    "sections": {
                        "type": "ARRAY",
                        "items": {
                            "type": "OBJECT",
                            "properties": {
                                "type": {"type": "STRING", "enum": ["Hook", "Introduction", "Body", "Conclusion", "Call to Action"]},
                                "heading": {"type": "STRING"},
                                "dialogue": {"type": "STRING"},
                                "sceneDescription": {"type": "STRING"},
                                "brollSuggestions": {
                                    "type": "ARRAY",
                                    "items": {"type": "STRING"}
                                }
                            },
                            "required": ["type", "heading", "dialogue", "sceneDescription"]
                        }
                    }
                },
                "required": ["title", "videoLength", "sections"]
            }
        }
    }

    headers = {
        'Content-Type': 'application/json'
    }

    try:
        # Make the POST request to the Gemini API.
        response = requests.post(api_url, headers=headers, data=json.dumps(payload))
        response.raise_for_status() # Raise an HTTPError for bad responses (4xx or 5xx)

        result = response.json()

        # Extract and parse the JSON response.
        if result.get("candidates") and len(result["candidates"]) > 0 and \
           result["candidates"][0].get("content") and \
           result["candidates"][0]["content"].get("parts") and \
           len(result["candidates"][0]["content"]["parts"]) > 0:

            json_string = result["candidates"][0]["content"]["parts"][0]["text"]
            # The LLM might return the JSON string embedded in markdown, e.g., "```json\n{...}\n```"
            # We need to strip these markdown tags if present.
            if json_string.strip().startswith("```json"):
                json_string = json_string.strip()[len("```json"):].strip()
                if json_string.endswith("```"):
                    json_string = json_string[:-len("```")].strip()

            parsed_script = json.loads(json_string)

            if output_filename:
                with open(output_filename, 'w', encoding='utf-8') as f:
                    # Write the formatted JSON to the file
                    json.dump(parsed_script, f, indent=2, ensure_ascii=False)
                print(f"Video script successfully saved to '{output_filename}'")

            return parsed_script
        else:
            print("Error: Unexpected response structure from LLM.")
            return None
    except requests.exceptions.HTTPError as http_err:
        print(f"HTTP error occurred: {http_err} - {response.text}")
        return None
    except json.JSONDecodeError as json_err:
        print(f"JSON decoding error: {json_err} - Response text: {response.text}")
        return None
    except Exception as err:
        print(f"An unexpected error occurred: {err}")
        return None

# --- Example Usage ---
if __name__ == "__main__":
    example_topic = "The Future of Quantum Computing"
    output_file_1 = "quantum_computing_script.txt"
    print(f"Generating script for topic: '{example_topic}' and saving to '{output_file_1}'...")
    script = generate_video_script_llm(example_topic, output_file_1)

    if script:
        print("\n--- Generated Video Script ---")
        print(f"Title: {script.get('title', 'N/A')}")
        print(f"Estimated Length: {script.get('videoLength', 'N/A')}\n")

        for i, section in enumerate(script.get('sections', [])):
            print(f"Section {i+1}: {section.get('type', 'Unknown Type')} - {section.get('heading', 'N/A')}")
            print(f"  Dialogue: {section.get('dialogue', 'N/A')}")
            print(f"  Scene Description: {section.get('sceneDescription', 'N/A')}")
            broll = section.get('brollSuggestions')
            if broll:
                print(f"  B-roll Suggestions: {', '.join(broll)}")
            print("-" * 30)
    else:
        print("\nFailed to generate a video script.")

    print("\n")

    example_topic_2 = "Benefits of a Healthy Diet"
    output_file_2 = "healthy_diet_script.txt"
    print(f"Generating script for topic: '{example_topic_2}' and saving to '{output_file_2}'...")
    script_2 = generate_video_script_llm(example_topic_2, output_file_2)

    if script_2:
        print("\n--- Generated Video Script ---")
        print(f"Title: {script_2.get('title', 'N/A')}")
        print(f"Estimated Length: {script_2.get('videoLength', 'N/A')}\n")

        for i, section in enumerate(script_2.get('sections', [])):
            print(f"Section {i+1}: {section.get('type', 'Unknown Type')} - {section.get('heading', 'N/A')}")
            print(f"  Dialogue: {section.get('dialogue', 'N/A')}")
            print(f"  Scene Description: {section.get('sceneDescription', 'N/A')}")
            broll = section.get('brollSuggestions')
            if broll:
                print(f"  B-roll Suggestions: {', '.join(broll)}")
            print("-" * 30)
    else:
        print("\nFailed to generate a video script.")