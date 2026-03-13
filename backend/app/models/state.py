from __future__ import annotations

from typing import Any, Dict, List, TypedDict


class WorkflowState(TypedDict):
    goal: str
    dataset_context: str
    conversation: List[Dict[str, str]]
    agent_outputs: Dict[str, str]
    final_report: str
    metadata: Dict[str, Any]
    supervisor_instruction: str
    supervisor_reasoning: str
    next_agent: str
    pending_agents: List[str]
    completed_agents: List[str]
