"""
LLM Client — ZenMux AI integration for ClearLane.

Used for:
- Personalized nudge messages for drivers
- Auto-generated enforcement reports
- Natural language query interface
"""

import os
from pathlib import Path

# Load from .env file
_env_path = Path(__file__).parent.parent / '.env'
if _env_path.exists():
    for line in _env_path.read_text().splitlines():
        line = line.strip()
        if line and not line.startswith('#') and '=' in line:
            key, value = line.split('=', 1)
            os.environ.setdefault(key.strip(), value.strip())

ZENMUX_API_KEY = os.environ.get("ZENMUX_API_KEY", "")
ZENMUX_BASE_URL = os.environ.get("ZENMUX_BASE_URL", "https://zenmux.ai/api/v1")
ZENMUX_MODEL = os.environ.get("ZENMUX_MODEL", "z-ai/glm-5.2-free")

_client = None


def get_client():
    """Get or create OpenAI-compatible client."""
    global _client
    if _client is None:
        try:
            from openai import OpenAI
            _client = OpenAI(
                base_url=ZENMUX_BASE_URL,
                api_key=ZENMUX_API_KEY,
            )
        except ImportError:
            print("WARNING: openai package not installed. Run: pip install openai")
            return None
    return _client


def chat_completion(prompt: str, system: str = None, temperature: float = 0.7) -> str:
    """Simple chat completion wrapper."""
    client = get_client()
    if client is None:
        return "LLM not available (openai package not installed)"
    
    messages = []
    if system:
        messages.append({"role": "system", "content": system})
    messages.append({"role": "user", "content": prompt})
    
    try:
        completion = client.chat.completions.create(
            model=ZENMUX_MODEL,
            messages=messages,
            temperature=temperature,
        )
        return completion.choices[0].message.content
    except Exception as e:
        return f"LLM error: {e}"


def responses_create(input_text: str, model: str = None) -> dict:
    """Wrapper for Responses API."""
    client = get_client()
    if client is None:
        return {"error": "LLM not available (openai package not installed)"}
    
    try:
        responses = client.responses.create(
            model=model or ZENMUX_MODEL,
            input=input_text,
        )
        return responses
    except Exception as e:
        return {"error": f"LLM error: {e}"}


def generate_nudge_message(
    violation_type: str,
    vehicle_type: str,
    location: str,
    impact_score: float,
    approach: str = "loss_aversion",
) -> str:
    """Generate personalized nudge message for driver."""
    system = """You are a traffic enforcement message generator for Bengaluru Traffic Police.
Generate short, actionable messages (max 160 chars) for drivers parking illegally.
Be direct, not preachy. Use the specified psychological approach."""
    
    prompt = f"""Generate a {approach} nudge message for:
- Violation: {violation_type}
- Vehicle: {vehicle_type}
- Location: {location}
- Impact Score: {impact_score}/100

Format: Just the message text, nothing else."""
    
    return chat_completion(prompt, system=system, temperature=0.8)


def generate_enforcement_report(
    junction: str,
    violations: int,
    capacity_loss: float,
    economic_impact: float,
) -> str:
    """Generate natural language enforcement report."""
    system = """You are a traffic analysis report generator for BTP officers.
Write concise, actionable reports in plain English. No jargon."""
    
    prompt = f"""Generate a 3-line enforcement summary:
- Junction: {junction}
- Violations today: {violations}
- Road capacity loss: {capacity_loss}%
- Economic impact: ₹{economic_impact:,.0f}

Format: Brief, actionable, officer-friendly."""
    
    return chat_completion(prompt, system=system, temperature=0.5)


def query_clearlane(question: str, context: str = None) -> str:
    """Natural language query interface for ClearLane data."""
    system = """You are ClearLane, a traffic intelligence assistant for Bengaluru.
Answer questions about parking violations, congestion, and enforcement.
Be concise and data-driven."""
    
    prompt = question
    if context:
        prompt = f"Context: {context}\n\nQuestion: {question}"
    
    return chat_completion(prompt, system=system, temperature=0.3)


if __name__ == '__main__':
    api_key_display = ZENMUX_API_KEY or ""
    print(f"ZenMux API Key: {api_key_display[:10]}...")
    print(f"Base URL: {ZENMUX_BASE_URL}")
    print(f"Model: {ZENMUX_MODEL}")
    
    # Test connection
    result = chat_completion("Say 'ClearLane LLM connected' in 5 words or less.")
    print(f"Chat test: {result}")
    
    # Test Responses API
    responses = responses_create("What is the meaning of life?")
    if "error" in responses:
        print(f"Responses test error: {responses['error']}")
    else:
        print(f"Responses test: {responses}")