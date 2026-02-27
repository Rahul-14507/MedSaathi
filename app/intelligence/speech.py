import os
import azure.cognitiveservices.speech as speechsdk
from dotenv import load_dotenv

load_dotenv()

def generate_audio(text, language):
    """
    Generates an mp3 audio stream from text using Azure Cognitive Services Speech.
    Uses high-quality vernacular neural voices.
    Returns the audio data as bytes.
    """
    speech_key = os.getenv("AZURE_SPEECH_KEY")
    speech_region = os.getenv("AZURE_SPEECH_REGION")

    if not speech_key or not speech_region:
        raise ValueError("Azure Speech API keys not found in environment variables.")

    speech_config = speechsdk.SpeechConfig(subscription=speech_key, region=speech_region)

    # Map language selection to specific neural voice
    if language.lower() == "hindi":
        speech_config.speech_synthesis_voice_name = "hi-IN-MadhurNeural"
    elif language.lower() == "telugu":
        speech_config.speech_synthesis_voice_name = "te-IN-ShrutiNeural"
    else:
        # Default fallback to English if chosen or unknown
        speech_config.speech_synthesis_voice_name = "en-IN-NeerjaNeural"

    # Set output format to mp3
    speech_config.set_speech_synthesis_output_format(speechsdk.SpeechSynthesisOutputFormat.Audio16Khz32KBitRateMonoMp3)

    # We want to pull the audio stream into memory, not default speaker
    pull_stream = speechsdk.audio.PullAudioOutputStream()
    stream_config = speechsdk.audio.AudioOutputConfig(stream=pull_stream)
    
    speech_synthesizer = speechsdk.SpeechSynthesizer(speech_config=speech_config, audio_config=stream_config)

    result = speech_synthesizer.speak_text_async(text).get()

    if result.reason == speechsdk.ResultReason.SynthesizingAudioCompleted:
        return result.audio_data
    elif result.reason == speechsdk.ResultReason.Canceled:
        cancellation_details = result.cancellation_details
        print(f"Speech synthesis canceled: {cancellation_details.reason}")
        if cancellation_details.reason == speechsdk.CancellationReason.Error:
            print(f"Error details: {cancellation_details.error_details}")
        raise RuntimeError(f"Failed to synthesize audio: {cancellation_details.error_details}")
    
    return None
