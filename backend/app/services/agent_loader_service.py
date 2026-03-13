from __future__ import annotations

from pathlib import Path
from typing import Iterable, List

import yaml

from app.models.config import AgentConfig


class AgentLoaderService:
    def __init__(self, agents_root: str | Path):
        self.agents_root = Path(agents_root)

    def load_profiles(self) -> List[AgentConfig]:
        profiles: List[AgentConfig] = []

        for profile_path in sorted(self.agents_root.glob("*/profile.yaml")):
            with profile_path.open("r", encoding="utf-8") as f:
                payload = yaml.safe_load(f)
            profiles.append(AgentConfig.model_validate(payload))

        return profiles

    def merge_missing_agents(self, current_agents: Iterable[AgentConfig]) -> List[AgentConfig]:
        current = {agent.name: agent for agent in current_agents}

        for profile_agent in self.load_profiles():
            current.setdefault(profile_agent.name, profile_agent)

        return list(current.values())
