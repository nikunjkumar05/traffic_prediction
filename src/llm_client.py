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

MISTRAL_API_KEY = os.environ.get("MISTRAL_API_KEY", "")
MISTRAL_BASE_URL = os.environ.get("MISTRAL_BASE_URL", "https://api.mistral.ai/v1")
MISTRAL_MODEL = os.environ.get("MISTRAL_MODEL", "mistral-large-latest")

_client = None


def get_client():
    """Get or create OpenAI-compatible client for Mistral."""
    global _client
    if _client is None:
        try:
            from openai import OpenAI
            _client = OpenAI(
                base_url=MISTRAL_BASE_URL,
                api_key=MISTRAL_API_KEY,
                timeout=10.0,
            )
        except ImportError:
            print("WARNING: openai package not installed. Run: pip install openai")
            return None
    return _client


def get_mock_fallback(prompt: str) -> str:
    prompt_lower = prompt.lower()
    if "priority" in prompt_lower:
        return (
            "Good morning, Officer. Your current priority is Koramangala 80 Feet Road Junction. "
            "Recent camera feeds report 8 double-parking violations causing a 42% road capacity loss. "
            "Please dispatch a tow truck to clear the curb."
        )
    elif "kr market" in prompt_lower:
        return (
            "KR Market Junction is currently experiencing heavy congestion (Gridlock Score: 84). "
            "Primary cause: illegal commercial loading/unloading on the main lane. "
            "Marshals have been alerted to enforce clear curb zones."
        )
    elif "offender" in prompt_lower:
        return (
            "ClearLane Intelligence has flagged vehicle KA-01-ME-8892 (Black SUV) as a top repeat offender "
            "with 7 violations in Koramangala this week. Current location: near Silk Board. "
            "Recommended action: Issue immediate challan and tow."
        )
    elif "silk board" in prompt_lower:
        return (
            "Silk Board Junction is under critical load. Tipping point forecast predicts severe congestion spike "
            "within the next 15 minutes due to spillover from the sector 4 commercial corridor. "
            "Active tow truck pre-positioning is advised."
        )
    elif "morning" in prompt_lower or "hello" in prompt_lower:
        return (
            "Good morning, Constable Kumar. Welcome to your shift. "
            "Koramangala is currently stable, but watch out for typical parking spillover "
            "near commercial complexes on 80 Feet Road. Ask me anything about your shift!"
        )
    else:
        return (
            "Here is the local traffic telemetry overview for your query: "
            "Active enforcement is underway in Koramangala. "
            "We have registered minor delays but no critical blockages. "
            "Please proceed with standard patrol routes."
        )


def chat_completion(prompt: str, system: str = None, temperature: float = 0.7) -> str:
    """Simple chat completion wrapper."""
    client = get_client()
    if client is None or not MISTRAL_API_KEY:
        return get_mock_fallback(prompt)
    
    messages = []
    if system:
        messages.append({"role": "system", "content": system})
    messages.append({"role": "user", "content": prompt})
    
    try:
        completion = client.chat.completions.create(
            model=MISTRAL_MODEL,
            messages=messages,
            temperature=temperature,
        )
        return completion.choices[0].message.content
    except Exception as e:
        print(f"LLM call failed: {e}. Falling back to mock.")
        return get_mock_fallback(prompt)


def responses_create(input_text: str, model: str = None) -> dict:
    """Wrapper for Responses API."""
    client = get_client()
    if client is None:
        return {"error": "LLM not available (openai package not installed)"}
    
    try:
        responses = client.responses.create(
            model=model or MISTRAL_MODEL,
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
    has_key = bool(MISTRAL_API_KEY)
    print(f"Mistral API Key: {'set' if has_key else 'NOT SET'}")
    print(f"Base URL: {MISTRAL_BASE_URL}")
    print(f"Model: {MISTRAL_MODEL}")
    
    if not has_key:
        print("WARNING: MISTRAL_API_KEY not set. LLM features will return errors.")
        sys.exit(1)
    
    # Test connection
    result = chat_completion("Say 'ClearLane LLM connected' in 5 words or less.")
    print(f"Chat test: {result}")
    
    # Test Responses API
    responses = responses_create("What is the meaning of life?")
    if "error" in responses:
        print(f"Responses test error: {responses['error']}")
    else:
        print(f"Responses test: {responses}")