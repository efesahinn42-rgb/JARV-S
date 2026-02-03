from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, JSONResponse
from pydantic import BaseModel
import os
import aiofiles
import whisper
import edge_tts
from pathlib import Path
from memory import MemoryManager
import groq
import asyncio
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create temp directory for audio files
TEMP_DIR = Path("backend/temp")
TEMP_DIR.mkdir(parents=True, exist_ok=True)

# Load Whisper model (base model for faster loading)
whisper_model = whisper.load_model("base")

# Groq API Client
GROQ_API_KEY = os.environ.get("GROQ_API_KEY", "")
groq_client = groq.Groq(api_key=GROQ_API_KEY) if GROQ_API_KEY else None

# Available models on Groq (Turkish support)
GROQ_MODEL = "llama-3.3-70b-versatile"  # Best for Turkish, very fast

class ChatRequest(BaseModel):
    message: str
    speak: bool = False

class SpeakRequest(BaseModel):
    text: str
    language: str = "tr"

# Memory Manager başlat
memory_manager = MemoryManager()

async def generate_response(message: str):
    """
    Generator that streams tokens from Groq (Llama 3).
    Also retrieves relevant context from memory.
    """
    # Hafızadan ilgili bağlamı al
    context = memory_manager.get_relevant_context(message)
    
    # Sistem promptunu bağlamla zenginleştir
    system_content = """Sen Jarvis'sin. Çok zeki, hafif esprili ve son derece yetenekli bir yapay zeka asistanısın. 
Kullanıcıyla samimi ve akıcı bir Türkçe ile konuş. Asla robotik cevaplar verme, bir insan gibi doğal ol. 
Cevapların kısa ve net olsun."""
    
    if context:
        system_content += f"\n\nGeçmiş konuşmalardan ilgili bağlam:\n{context}"
    
    messages = [
        {'role': 'system', 'content': system_content},
        {'role': 'user', 'content': message}
    ]
    
    # Try Groq first, fallback to Ollama
    if groq_client and GROQ_API_KEY:
        try:
            api_stream = groq_client.chat.completions.create(
                model=GROQ_MODEL,
                messages=messages,
                stream=True
            )

            full_response = ""
            for chunk in api_stream:
                content = chunk.choices[0].delta.content
                if content:
                    full_response += content
                    yield content
            
            # Etkileşimi hafızaya kaydet
            memory_manager.save_interaction(message, full_response)
            return
        except Exception as e:
            print(f"Groq API error: {e}")
            yield f"Error: Groq API hatası - {str(e)}"
            return
    
    # Fallback to Ollama if Groq not available
    try:
        import ollama
        api_stream = ollama.chat(
            model='gemma2', 
            messages=messages,
            stream=True
        )

        full_response = ""
        for chunk in api_stream:
            content = chunk['message']['content']
            if content:
                full_response += content
                yield content
        
        # Etkileşimi hafızaya kaydet
        memory_manager.save_interaction(message, full_response)
    except Exception as e:
        yield f"Error: {str(e)}"


async def generate_tts_audio(text: str, language: str = "tr") -> str:
    """
    Generate TTS audio using Edge TTS and return the file path.
    Uses Turkish voice: tr-TR-AhmetNeural
    """
    voice = "tr-TR-AhmetNeural" if language == "tr" else "en-US-GuyNeural"
    
    # Create temp file
    output_file = TEMP_DIR / f"tts_{os.urandom(8).hex()}.mp3"
    
    try:
        communicate = edge_tts.Communicate(text, voice)
        await communicate.save(str(output_file))
        return str(output_file)
    except Exception as e:
        # Fallback to English if Turkish fails
        if language == "tr":
            communicate = edge_tts.Communicate(text, "en-US-GuyNeural")
            await communicate.save(str(output_file))
            return str(output_file)
        raise e


@app.post("/chat")
def chat_endpoint(request: ChatRequest):
    """
    Streaming chat endpoint that returns tokens as they arrive.
    Optionally generates TTS audio when speak=True.
    """
    if request.speak:
        # Generate full response first, then TTS
        full_response = ""
        for chunk in generate_response(request.message):
            full_response += chunk
        
        # Generate TTS audio
        audio_path = asyncio.run(generate_tts_audio(full_response, "tr"))
        
        # Read audio file and return as base64
        import base64
        with open(audio_path, "rb") as f:
            audio_data = base64.b64encode(f.read()).decode()
        
        # Clean up temp file
        try:
            os.remove(audio_path)
        except:
            pass
        
        return JSONResponse(content={
            "response": full_response,
            "audio": audio_data,
            "audio_format": "audio/mp3"
        })
    
    return StreamingResponse(
        generate_response(request.message), 
        media_type="text/plain"
    )


@app.post("/chat/json")
async def chat_json_endpoint(request: ChatRequest):
    """
    Non-streaming chat endpoint for simple JSON responses.
    """
    full_response = ""
    async for chunk in generate_response(request.message):
        full_response += chunk
    
    return {"response": full_response}


@app.post("/transcribe")
async def transcribe_audio(file: UploadFile = File(...)):
    """
    Transcribe audio file to text using Whisper.
    Accepts multipart/form-data with audio file.
    """
    try:
        # Save uploaded file to temp
        temp_audio = TEMP_DIR / f"audio_{os.urandom(8).hex()}.wav"
        
        content = await file.read()
        async with aiofiles.open(temp_audio, "wb") as f:
            await f.write(content)
        
        # Transcribe using Whisper
        result = whisper_model.transcribe(str(temp_audio))
        transcribed_text = result["text"].strip()
        
        # Clean up temp file
        try:
            os.remove(temp_audio)
        except:
            pass
        
        return {"text": transcribed_text}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Transcription error: {str(e)}")


@app.post("/speak")
async def speak_endpoint(request: SpeakRequest):
    """
    Generate speech from text using Edge TTS.
    Returns streaming audio response.
    """
    try:
        # Generate TTS audio
        audio_path = await generate_tts_audio(request.text, request.language)
        
        # Return audio file as streaming response
        async def iterfile():
            async with aiofiles.open(audio_path, "rb") as f:
                while chunk := await f.read(1024 * 1024):  # 1MB chunks
                    yield chunk
        
        # Clean up temp file after sending
        def cleanup():
            try:
                os.remove(audio_path)
            except:
                pass
        
        import threading
        threading.Thread(target=cleanup).start()
        
        return StreamingResponse(
            iterfile(), 
            media_type="audio/mp3",
            headers={"Content-Disposition": f"attachment; filename=\"speech.mp3\""}
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"TTS error: {str(e)}")


@app.get("/health")
def health_check():
    return {"status": "online", "model": "groq-llama3" if (groq_client and GROQ_API_KEY) else "ollama-gemma2"}


@app.get("/memory/stats")
def memory_stats():
    """Get memory statistics."""
    try:
        return memory_manager.get_memory_stats()
    except Exception as e:
        return {"error": str(e)}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
