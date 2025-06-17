import json
import os # <--- NEW IMPORT: For accessing environment variables
import google.generativeai as genai # <--- NEW IMPORT: Google Generative AI client library
from google.generativeai.types import GenerationConfig # <--- NEW IMPORT: For structured output configuration

def generate_video_script_llm(topic: str, duration: int = 3, output_filename: str = None) -> dict | None:
    """
    Generates a video script for a given topic using the Gemini 2.0 Flash model
    and optionally saves the output to a text file. This version uses the
    'google-generativeai' library and fetches the API key from an environment variable.

    Args:
        topic (str): The topic for which to generate the video script.
        output_filename (str, optional): The name of the file to save the script to.
                                        If None, the script is not saved to a file.

    Returns:
        dict | None: The generated video script as a dictionary, or None if an error occurred.
    """
    # --- Configure Gemini API ---
    # This configuration must happen before you try to use the GenerativeModel.
    # It's ideal to set GEMINI_API_KEY as an environment variable before running your script/app.
    # E.g., in PowerShell: $env:GEMINI_API_KEY="YOUR_ACTUAL_GEMINI_API_KEY"
    # Or in Bash/Zsh: export GEMINI_API_KEY="YOUR_ACTUAL_GEMINI_API_KEY"
    api_key_from_env = os.environ.get("GEMINI_API_KEY")

    if not api_key_from_env:
        print("Error: GEMINI_API_KEY environment variable not set. Please set it before running.")
        return None

    genai.configure(api_key=api_key_from_env) # <--- API KEY CONFIGURATION

    model_name = "gemini-2.0-flash" # Model name as a string
    model = genai.GenerativeModel(model_name) # <--- Model initialization

    # Construct the detailed prompt for the LLM.
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

    # Define the generation configuration using GenerationConfig from the library
    generation_config = GenerationConfig(
        response_mime_type="application/json",
        response_schema={
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
    )

    try:
        # Use the GenerativeModel's generate_content method
        response = model.generate_content(
            prompt,
            generation_config=generation_config
        )

        # The response.text directly gives you the structured JSON string
        json_string = response.text

        # The library should typically handle markdown stripping if response_mime_type is set,
        # but the explicit strip below is kept for robustness just in case.
        cleaned_json_string = json_string.strip()
        if cleaned_json_string.startswith("```json"):
            cleaned_json_string = cleaned_json_string[len("```json"):].strip()
            if cleaned_json_string.endswith("```"):
                cleaned_json_string = cleaned_json_string[:-len("```")].strip()

        parsed_script = json.loads(cleaned_json_string)

        if output_filename:
            with open(output_filename, 'w', encoding='utf-8') as f:
                json.dump(parsed_script, f, indent=2, ensure_ascii=False)
            print(f"Video script successfully saved to '{output_filename}'")

        return parsed_script
    except Exception as err:
        print(f"An error occurred during Gemini API call: {err}")
        # More specific error handling could be added for different genai exceptions
        return None

# --- Example Usage ---
if __name__ == "__main__":
    # IMPORTANT: Set your GEMINI_API_KEY environment variable before running this script
    # For example, in PowerShell: $env:GEMINI_API_KEY="YOUR_ACTUAL_GEMINI_API_KEY"
    # For example, in CMD: set GEMINI_API_KEY=YOUR_ACTUAL_GEMINI_API_KEY
    # For example, in Bash/Zsh: export GEMINI_API_KEY="YOUR_ACTUAL_GEMINI_API_KEY"

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
