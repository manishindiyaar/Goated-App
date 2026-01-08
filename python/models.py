"""
Pydantic models for the FunctionGemma Backend API.
Matches OpenAI API schema for /v1/chat/completions endpoint.
"""

from typing import Optional
from pydantic import BaseModel, Field


class FunctionDefinition(BaseModel):
    """Definition of a function that can be called by the model."""
    name: str
    description: str
    parameters: dict  # JSON Schema


class ToolDefinition(BaseModel):
    """Tool definition wrapper for function calling."""
    type: str = "function"
    function: FunctionDefinition


class FunctionCall(BaseModel):
    """A function call made by the model."""
    name: str
    arguments: str  # JSON string of arguments


class ToolCall(BaseModel):
    """A tool call made by the model."""
    id: str
    type: str = "function"
    function: FunctionCall


class ChatMessage(BaseModel):
    """A message in the chat conversation."""
    role: str  # 'user' | 'assistant' | 'system' | 'tool'
    content: Optional[str] = None
    tool_call_id: Optional[str] = None
    tool_calls: Optional[list[ToolCall]] = None


class ChatRequest(BaseModel):
    """Request body for /v1/chat/completions endpoint."""
    messages: list[ChatMessage]
    tools: Optional[list[ToolDefinition]] = None
    tool_choice: Optional[str] = None
    model: Optional[str] = "functiongemma"
    temperature: Optional[float] = 0.0
    max_tokens: Optional[int] = None


class Choice(BaseModel):
    """A choice in the chat completion response."""
    index: int
    message: ChatMessage
    finish_reason: str  # 'stop' | 'tool_calls'


class ChatResponse(BaseModel):
    """Response body for /v1/chat/completions endpoint."""
    id: str
    object: str = "chat.completion"
    created: int
    model: str
    choices: list[Choice]
