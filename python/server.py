"""
FunctionGemma Backend - FastAPI server for AI inference.
Implements OpenAI-compatible /v1/chat/completions endpoint.
Initially uses Google Gemini API, with future support for local FunctionGemma model.
"""

import os
import time
import uuid
import json
import logging
from contextlib import asynccontextmanager
from typing import Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from models import ChatRequest, ChatResponse, ChatMessage, Choice, ToolCall, FunctionCall

# Load environment variables from .env file
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Global state
gemini_client = None
model_loaded = False
use_local_model = False  # Flag for future local model support

# Gemini model configuration
GEMINI_MODEL = "gemini-2.5-flash"  # Using stable model with function calling support
TEMPERATURE = 0.0  # Requirement 3.7: temperature=0.0 for deterministic responses
MAX_OUTPUT_TOKENS = 8192  # Context window support


def init_gemini_client():
    """Initialize the Google Gemini client."""
    global gemini_client, model_loaded
    
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        logger.warning("[Gemini] No GEMINI_API_KEY found in environment")
        return False
    
    try:
        from google import genai
        gemini_client = genai.Client(api_key=api_key)
        model_loaded = True
        logger.info(f"[Gemini] Client initialized successfully with model: {GEMINI_MODEL}")
        return True
    except Exception as e:
        logger.error(f"[Gemini] Failed to initialize client: {e}")
        return False


def convert_tools_to_gemini_format(tools: list) -> list:
    """Convert OpenAI-style tool definitions to Gemini function declarations."""
    if not tools:
        return []
    
    function_declarations = []
    for tool in tools:
        if tool.type == "function":
            func_decl = {
                "name": tool.function.name,
                "description": tool.function.description,
                "parameters": tool.function.parameters
            }
            function_declarations.append(func_decl)
    
    return function_declarations


def convert_messages_to_gemini_format(messages: list) -> list:
    """Convert OpenAI-style messages to Gemini content format."""
    contents = []
    
    for msg in messages:
        if msg.role == "system":
            # Gemini handles system prompts differently - prepend to first user message
            # or add as a user message with system context
            contents.append({
                "role": "user",
                "parts": [{"text": f"[System Instructions]: {msg.content}"}]
            })
        elif msg.role == "user":
            contents.append({
                "role": "user",
                "parts": [{"text": msg.content or ""}]
            })
        elif msg.role == "assistant":
            if msg.tool_calls:
                # Assistant message with tool calls
                parts = []
                if msg.content:
                    parts.append({"text": msg.content})
                for tc in msg.tool_calls:
                    parts.append({
                        "functionCall": {
                            "name": tc.function.name,
                            "args": json.loads(tc.function.arguments) if isinstance(tc.function.arguments, str) else tc.function.arguments
                        }
                    })
                contents.append({
                    "role": "model",
                    "parts": parts
                })
            else:
                contents.append({
                    "role": "model",
                    "parts": [{"text": msg.content or ""}]
                })
        elif msg.role == "tool":
            # Tool response - send as function response
            contents.append({
                "role": "user",
                "parts": [{
                    "functionResponse": {
                        "name": msg.tool_call_id or "unknown_tool",
                        "response": {"result": msg.content}
                    }
                }]
            })
    
    return contents


async def call_gemini_api(request: ChatRequest) -> ChatResponse:
    """Call the Gemini API and return an OpenAI-compatible response."""
    from google.genai import types
    
    # Convert messages to Gemini format
    contents = convert_messages_to_gemini_format(request.messages)
    
    # Build configuration
    config_params = {
        "temperature": request.temperature if request.temperature is not None else TEMPERATURE,
        "max_output_tokens": request.max_tokens or MAX_OUTPUT_TOKENS,
    }
    
    # Convert tools if provided (Requirement 3.8: auto-set tool_choice when tools provided)
    if request.tools:
        function_declarations = convert_tools_to_gemini_format(request.tools)
        if function_declarations:
            config_params["tools"] = [types.Tool(function_declarations=function_declarations)]
            # Requirement 3.8: tool_choice="auto" when tools provided
            if not request.tool_choice or request.tool_choice == "auto":
                config_params["tool_config"] = types.ToolConfig(
                    function_calling_config=types.FunctionCallingConfig(mode="AUTO")
                )
    
    config = types.GenerateContentConfig(**config_params)
    
    try:
        # Call Gemini API
        response = gemini_client.models.generate_content(
            model=GEMINI_MODEL,
            contents=contents,
            config=config
        )
        
        # Parse response
        response_id = f"chatcmpl-{uuid.uuid4().hex[:12]}"
        created_timestamp = int(time.time())
        
        # Extract content and tool calls from response
        response_content = None
        tool_calls = None
        finish_reason = "stop"
        
        if response.candidates and len(response.candidates) > 0:
            candidate = response.candidates[0]
            if candidate.content and candidate.content.parts:
                text_parts = []
                function_calls = []
                
                for part in candidate.content.parts:
                    if hasattr(part, 'text') and part.text:
                        text_parts.append(part.text)
                    if hasattr(part, 'function_call') and part.function_call:
                        fc = part.function_call
                        function_calls.append({
                            "name": fc.name,
                            "arguments": json.dumps(dict(fc.args)) if fc.args else "{}"
                        })
                
                if text_parts:
                    response_content = " ".join(text_parts)
                
                if function_calls:
                    tool_calls = []
                    for i, fc in enumerate(function_calls):
                        tool_calls.append(ToolCall(
                            id=f"call_{uuid.uuid4().hex[:8]}",
                            type="function",
                            function=FunctionCall(
                                name=fc["name"],
                                arguments=fc["arguments"]
                            )
                        ))
                    finish_reason = "tool_calls"
        
        # Build response message
        response_message = ChatMessage(
            role="assistant",
            content=response_content,
            tool_calls=tool_calls
        )
        
        return ChatResponse(
            id=response_id,
            object="chat.completion",
            created=created_timestamp,
            model=GEMINI_MODEL,
            choices=[
                Choice(
                    index=0,
                    message=response_message,
                    finish_reason=finish_reason
                )
            ]
        )
        
    except Exception as e:
        logger.error(f"[Gemini] API call failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler for startup/shutdown."""
    global model_loaded, use_local_model
    
    # Check if we should use local model (future support)
    model_path = os.environ.get("MODEL_PATH")
    if model_path and os.path.exists(model_path):
        logger.info(f"[FunctionGemma] Local model path configured: {model_path}")
        use_local_model = True
        # Local model loading will be implemented when shifting to local inference
        # For now, fall back to Gemini
        logger.info("[FunctionGemma] Local model support not yet implemented, using Gemini API")
        use_local_model = False
    
    # Initialize Gemini client
    if not use_local_model:
        if init_gemini_client():
            logger.info("[Gemini] Backend ready")
        else:
            logger.warning("[Gemini] Backend not initialized - check GEMINI_API_KEY")
    
    yield
    
    # Shutdown
    logger.info("[Backend] Shutting down...")


app = FastAPI(
    title="GoatedApp AI Backend",
    description="AI inference server for GoatedApp - supports Gemini API and future local inference",
    version="0.2.0",
    lifespan=lifespan
)

# Allow CORS for local Electron app
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health_check():
    """Health check endpoint for process management."""
    return {
        "status": "healthy",
        "model_loaded": model_loaded,
        "backend_type": "local" if use_local_model else "gemini"
    }


@app.post("/v1/chat/completions", response_model=ChatResponse)
async def chat_completions(request: ChatRequest):
    """
    OpenAI-compatible chat completions endpoint.
    
    Accepts messages, optional tools, and tool_choice.
    Returns a ChatResponse with the model's response.
    
    Requirements:
    - 3.4: Accept messages array, tools array, tool_choice
    - 3.7: temperature=0.0 for deterministic responses
    - 3.8: tool_choice="auto" when tools provided
    - 3.9: Return tool_calls array when model generates tool calls
    - 3.10: Return HTTP 500 if model not loaded
    - 3.11: Return HTTP 500 with exception message on inference failure
    """
    # Validate request has messages
    if not request.messages:
        raise HTTPException(status_code=422, detail="Messages array cannot be empty")
    
    # Requirement 3.10: Check if model is loaded
    if not model_loaded:
        raise HTTPException(status_code=500, detail="Model not loaded")
    
    # Log request (without PHI - just metadata)
    logger.info(f"[Request] messages={len(request.messages)}, tools={len(request.tools) if request.tools else 0}")
    
    # Requirement 3.8: Auto-set tool_choice when tools are provided
    effective_tool_choice = request.tool_choice
    if request.tools and not request.tool_choice:
        effective_tool_choice = "auto"
        logger.info("[Request] Auto-setting tool_choice='auto' since tools provided")
    
    try:
        if use_local_model:
            # Future: Local FunctionGemma inference
            raise HTTPException(status_code=500, detail="Local model inference not yet implemented")
        else:
            # Use Gemini API
            response = await call_gemini_api(request)
            
            # Log response metadata
            finish_reason = response.choices[0].finish_reason if response.choices else "unknown"
            has_tool_calls = response.choices[0].message.tool_calls is not None if response.choices else False
            logger.info(f"[Response] finish_reason={finish_reason}, has_tool_calls={has_tool_calls}")
            
            return response
            
    except HTTPException:
        raise
    except Exception as e:
        # Requirement 3.11: Return HTTP 500 with exception message
        logger.error(f"[Error] Inference failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    
    # Run on localhost only (Requirement 3.2)
    uvicorn.run(
        "server:app",
        host="127.0.0.1",
        port=8000,
        reload=False,
        log_level="info"
    )
