from __future__ import annotations

from pathlib import Path
from typing import List

import yaml
from pydantic import BaseModel, Field


class AgentConfig(BaseModel):
    name: str
    role: str
    objective: str
    prompt_template: str
    enabled: bool = True


class WorkflowConfig(BaseModel):
    start: str
    end: str
    edges: List[List[str]] = Field(default_factory=list)


class RuntimeConfig(BaseModel):
    model_provider: str = "gradient"
    model_name: str = "openai-gpt-oss-120b"
    temperature: float = 0.3


class AppConfig(BaseModel):
    runtime: RuntimeConfig = RuntimeConfig()
    workflow: WorkflowConfig
    agents: List[AgentConfig]


def load_config(config_path: str | Path) -> AppConfig:
    with Path(config_path).expanduser().open("r", encoding="utf-8") as f:
        payload = yaml.safe_load(f)
    return AppConfig.model_validate(payload)
