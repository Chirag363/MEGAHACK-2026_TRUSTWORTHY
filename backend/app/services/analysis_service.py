from __future__ import annotations

import logging
import time
from pathlib import Path

from app.models.config import load_config
from app.services.agent_loader_service import AgentLoaderService
from app.services.dataset_tools_service import DatasetToolService
from app.services.llm_service import LLMService
from app.services.workflow_service import WorkflowService

logger = logging.getLogger(__name__)


class AnalysisService:
    def __init__(self, config_path: Path, agents_dir: Path):
        self._config_path = config_path
        self._agents_dir = agents_dir

    def run(
        self,
        goal: str,
        dataset_context: str,
        run_id: str = "n/a",
        dataset_path: str | None = None,
        dry_run: bool = False,
    ):
        started = time.perf_counter()
        logger.info("[run:%s] analysis started dry_run=%s", run_id, dry_run)

        config = load_config(self._config_path)
        config.agents = AgentLoaderService(self._agents_dir).merge_missing_agents(config.agents)

        llm = None
        if not dry_run:
            logger.info(
                "[run:%s] building LLM client provider=%s model=%s",
                run_id,
                config.runtime.model_provider,
                config.runtime.model_name,
            )
            llm = LLMService.build(
                model_provider=config.runtime.model_provider,
                model_name=config.runtime.model_name,
                temperature=config.runtime.temperature,
            )

        tools = []
        tool_service = None
        if dataset_path:
            tool_service = DatasetToolService(dataset_path)
            tools = tool_service.build_tools()
            logger.info("[run:%s] dataset tools initialized count=%s", run_id, len(tools))

        worker_names = [
            agent.name for agent in config.agents if agent.enabled and agent.name != "supervisor_agent"
        ]
        worker_order = WorkflowService.infer_worker_order(config=config, worker_names=worker_names)

        app = WorkflowService.build_graph(config=config, llm=llm, dry_run=dry_run, tools=tools)
        result = app.invoke(
            {
                "goal": goal,
                "dataset_context": dataset_context,
                "conversation": [],
                "agent_outputs": {},
                "final_report": "",
                "supervisor_instruction": "",
                "supervisor_reasoning": "",
                "next_agent": "supervisor_agent" if any(a.name == "supervisor_agent" for a in config.agents if a.enabled) else config.workflow.start,
                "pending_agents": worker_order,
                "completed_agents": [],
                "metadata": {
                    "config": str(self._config_path),
                    "dry_run": dry_run,
                    "agents_dir": str(self._agents_dir),
                    "run_id": run_id,
                    "worker_order": worker_order,
                    "dataset_path": dataset_path or "",
                },
            }
        )

        duration_ms = (time.perf_counter() - started) * 1000
        if tool_service:
            result["artifacts"] = tool_service.get_artifacts()
        logger.info("[run:%s] analysis finished in %.2f ms", run_id, duration_ms)
        return result
