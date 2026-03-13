from __future__ import annotations

import json
import logging
import re
from typing import Any, Callable, Dict

from langchain_core.messages import HumanMessage, SystemMessage, ToolMessage
from langgraph.graph import END, START, StateGraph

from app.models.config import AgentConfig, AppConfig
from app.models.state import WorkflowState

logger = logging.getLogger(__name__)


class WorkflowService:
    @staticmethod
    def _wants_report_format(goal: str) -> bool:
        text = (goal or "").lower()
        report_hints = [
            "report",
            "business intelligence report",
            "executive summary",
            "detailed analysis",
            "full analysis",
            "comprehensive",
            "appendix",
        ]
        return any(hint in text for hint in report_hints)

    @staticmethod
    def _extract_text(content: Any) -> str:
        if isinstance(content, str):
            return content
        if isinstance(content, list):
            chunks = []
            for item in content:
                if isinstance(item, dict):
                    text = item.get("text")
                    if text:
                        chunks.append(str(text))
                else:
                    chunks.append(str(item))
            return "\n".join(chunks).strip()
        return str(content)

    @staticmethod
    def infer_worker_order(config: AppConfig, worker_names: list[str]) -> list[str]:
        if not worker_names:
            return []

        incoming: Dict[str, int] = {name: 0 for name in worker_names}
        adjacency: Dict[str, str] = {}

        for from_node, to_node in config.workflow.edges:
            if from_node in worker_names and to_node in worker_names:
                adjacency[from_node] = to_node
                incoming[to_node] = incoming.get(to_node, 0) + 1

        starts = [name for name in worker_names if incoming.get(name, 0) == 0]
        ordered: list[str] = []

        for start in starts:
            current = start
            visited = set()
            while current in worker_names and current not in visited and current not in ordered:
                ordered.append(current)
                visited.add(current)
                current = adjacency.get(current, "")

        for name in worker_names:
            if name not in ordered:
                ordered.append(name)

        return ordered

    @staticmethod
    def _render_prompt(template: str, values: dict[str, str]) -> str:
        class SafeDict(dict):
            def __missing__(self, key):
                return ""

        return template.format_map(SafeDict(values))

    @staticmethod
    def _invoke_agent_with_tools(agent: AgentConfig, llm, rendered_prompt: str, tools, run_id: str) -> str:
        llm_with_tools = llm.bind_tools(tools)
        tool_lookup = {tool.name: tool for tool in tools}

        messages = [
            SystemMessage(
                content=(
                    f"You are {agent.role}. Use tools whenever numerical or factual dataset evidence is needed. "
                    "Never invent metrics."
                )
            ),
            HumanMessage(content=rendered_prompt),
        ]

        max_tool_rounds = 6
        for _ in range(max_tool_rounds):
            ai_msg = llm_with_tools.invoke(messages)
            messages.append(ai_msg)

            tool_calls = getattr(ai_msg, "tool_calls", None) or []
            if not tool_calls:
                return WorkflowService._extract_text(ai_msg.content)

            for tool_call in tool_calls:
                tool_name = tool_call.get("name", "unknown")
                tool_id = tool_call.get("id") or f"{tool_name}_call"
                args = tool_call.get("args", {})
                logger.info("[run:%s] agent tool call: %s -> %s", run_id, agent.name, tool_name)

                tool_fn = tool_lookup.get(tool_name)
                if not tool_fn:
                    tool_output = f"Tool '{tool_name}' is not available."
                else:
                    try:
                        tool_output = tool_fn.invoke(args)
                    except Exception as exc:  # noqa: BLE001
                        logger.exception("[run:%s] tool failed: %s", run_id, tool_name)
                        tool_output = f"Tool '{tool_name}' failed: {exc}"

                messages.append(ToolMessage(content=str(tool_output), tool_call_id=tool_id))

        return "Tool loop limit reached. Returning partial analysis."

    @staticmethod
    def _build_worker_node(
        agent: AgentConfig,
        llm,
        tools,
        dry_run: bool,
        on_agent_event: Callable[[str, str], None] | None = None,
    ) -> Callable[[WorkflowState], WorkflowState]:
        def node(state: WorkflowState) -> WorkflowState:
            run_id = str(state.get("metadata", {}).get("run_id", "n/a"))
            logger.info("[run:%s] agent start: %s", run_id, agent.name)
            if on_agent_event:
                on_agent_event("agent_start", agent.name)

            prior_outputs = "\n\n".join(
                f"{name}:\n{output}" for name, output in state["agent_outputs"].items()
            )
            prompt = WorkflowService._render_prompt(
                agent.prompt_template,
                {
                    "role": agent.role,
                    "objective": agent.objective,
                    "goal": state["goal"],
                    "dataset_context": state["dataset_context"],
                    "prior_outputs": prior_outputs or "No prior agent outputs yet.",
                    "supervisor_instruction": state.get("supervisor_instruction", ""),
                },
            )

            if dry_run:
                content = f"[DRY-RUN] {agent.name} executed with supervisor instruction: {state.get('supervisor_instruction', '')}"
            elif tools:
                content = WorkflowService._invoke_agent_with_tools(agent=agent, llm=llm, rendered_prompt=prompt, tools=tools, run_id=run_id)
            else:
                response = llm.invoke(
                    [
                        SystemMessage(content=f"You are {agent.role}."),
                        HumanMessage(content=prompt),
                    ]
                )
                content = WorkflowService._extract_text(response.content)

            updated_outputs = dict(state["agent_outputs"])
            updated_outputs[agent.name] = content

            conversation = list(state["conversation"])
            conversation.append({"agent": agent.name, "content": content})

            pending = [item for item in state.get("pending_agents", []) if item != agent.name]
            completed = list(state.get("completed_agents", []))
            if agent.name not in completed:
                completed.append(agent.name)

            if on_agent_event:
                on_agent_event("agent_done", agent.name)
            logger.info("[run:%s] agent complete: %s output_chars=%s", run_id, agent.name, len(content))
            return {
                **state,
                "agent_outputs": updated_outputs,
                "conversation": conversation,
                "pending_agents": pending,
                "completed_agents": completed,
            }

        return node

    @staticmethod
    def _parse_supervisor_decision(
        raw: str,
        worker_names: list[str],
        pending: list[str],
    ) -> tuple[str, str, str, list[str]]:
        fallback = pending[0] if pending else "FINISH"
        instruction = "Proceed with your objective using tools and provide evidence-backed output."
        reason = "Fallback decision used."
        planned_agents = list(pending)

        cleaned = raw.strip()
        if cleaned.startswith("```"):
            cleaned = cleaned.strip("`")

        start = cleaned.find("{")
        end = cleaned.rfind("}")
        if start == -1 or end == -1 or end <= start:
            next_agent_match = re.search(r"next_agent\s*[:=]\s*['\"]?([a-zA-Z0-9_\-]+)", cleaned, re.IGNORECASE)
            planned_agents_match = re.search(r"planned_agents\s*[:=]\s*\[(.*?)\]", cleaned, re.IGNORECASE)
            instruction_match = re.search(r"instruction\s*[:=]\s*['\"]?(.+)", cleaned, re.IGNORECASE)
            reason_match = re.search(r"reason\s*[:=]\s*['\"]?(.+)", cleaned, re.IGNORECASE)

            next_agent = next_agent_match.group(1).strip() if next_agent_match else fallback
            if next_agent not in worker_names and next_agent != "FINISH":
                next_agent = fallback

            if planned_agents_match:
                raw_planned = planned_agents_match.group(1)
                extracted = [part.strip().strip("'\"") for part in raw_planned.split(",") if part.strip()]
                sanitized = [name for name in extracted if name in worker_names]
                if sanitized:
                    planned_agents = [name for name in pending if name in sanitized]

            if instruction_match:
                instruction = instruction_match.group(1).strip().strip('"') or instruction
            if reason_match:
                reason = reason_match.group(1).strip().strip('"') or reason

            return next_agent, instruction, reason, planned_agents

        try:
            parsed = json.loads(cleaned[start : end + 1])
        except json.JSONDecodeError:
            return fallback, instruction, reason, planned_agents

        next_agent = str(parsed.get("next_agent", fallback)).strip()
        if next_agent not in worker_names and next_agent != "FINISH":
            next_agent = fallback

        planned_raw = parsed.get("planned_agents", planned_agents)
        if isinstance(planned_raw, list):
            sanitized = [str(name).strip() for name in planned_raw if str(name).strip() in worker_names]
            if sanitized:
                planned_agents = [name for name in pending if name in sanitized]

        instruction = str(parsed.get("instruction", instruction)).strip() or instruction
        reason = str(parsed.get("reason", reason)).strip() or reason
        return next_agent, instruction, reason, planned_agents

    @staticmethod
    def _build_supervisor_node(
        supervisor: AgentConfig,
        worker_agents: dict[str, AgentConfig],
        llm,
        dry_run: bool,
        on_token: Callable[[str], None] | None = None,
    ) -> Callable[[WorkflowState], WorkflowState]:
        worker_names = list(worker_agents.keys())

        def node(state: WorkflowState) -> WorkflowState:
            run_id = str(state.get("metadata", {}).get("run_id", "n/a"))

            pending = list(state.get("pending_agents", []))
            completed = list(state.get("completed_agents", []))
            if not pending and not completed:
                pending = list(state.get("metadata", {}).get("worker_order", worker_names))
            conversation = list(state["conversation"])

            worker_catalog = "\n".join(
                f"- {name}: role={worker_agents[name].role}; objective={worker_agents[name].objective}"
                for name in worker_names
            )
            output_snapshot = "\n\n".join(
                f"{name}:\n{content}" for name, content in state["agent_outputs"].items()
            ) or "No worker outputs yet."

            if not pending:
                next_agent = "FINISH"
                instruction = "Finalize final report."
                reason = "All worker agents completed."
            elif dry_run:
                next_agent = pending[0]
                instruction = f"Run {next_agent} and report findings with dataset evidence."
                reason = "Dry-run sequential dispatch."
            else:
                supervisor_prompt = (
                    f"You are {supervisor.role}.\n"
                    f"Objective: {supervisor.objective}\n\n"
                    f"User request:\n{state['goal']}\n\n"
                    f"Dataset context:\n{state['dataset_context']}\n\n"
                    f"Available worker agents:\n{worker_catalog}\n\n"
                    f"Pending agents: {pending}\n"
                    f"Completed agents: {completed}\n\n"
                    f"Current worker outputs:\n{output_snapshot}\n\n"
                    "ROUTING RULES:\n"
                    "1. First, judge the nature of the user request.\n"
                    "2. If it is casual conversation, a greeting, small talk, or a general question that "
                    "does not require dataset analysis, route ONLY to casual_convo_agent (if available in "
                    "the worker list) and then FINISH. Skip all analysis agents entirely.\n"
                    "3. If it is a data analysis, business intelligence, or dataset-related request, "
                    "route to the relevant analysis agents. Do NOT involve casual_convo_agent.\n"
                    "4. Do NOT dispatch every worker by default.\n"
                    "5. If the goal is already satisfied by current outputs, choose FINISH immediately.\n"
                    "6. Infer the minimum required subset of workers from the request and current outputs.\n\n"
                    "Decide the next step. Respond as strict JSON with keys: "
                    "planned_agents (array of worker names), next_agent (worker name or FINISH), instruction, reason."
                )
                supervisor_response = llm.invoke(
                    [
                        SystemMessage(content=f"You are {supervisor.role}."),
                        HumanMessage(content=supervisor_prompt),
                    ]
                )
                next_agent, instruction, reason, planned_agents = WorkflowService._parse_supervisor_decision(
                    raw=WorkflowService._extract_text(supervisor_response.content),
                    worker_names=worker_names,
                    pending=pending,
                )

                if planned_agents:
                    pending = [name for name in pending if name in planned_agents]
                    if not pending:
                        next_agent = "FINISH"
                        reason = "Planned worker subset completed or not applicable."

                if next_agent != "FINISH" and next_agent not in pending:
                    next_agent = pending[0] if pending else "FINISH"

                if next_agent in completed:
                    next_agent = pending[0] if pending else "FINISH"

            if next_agent == "FINISH":
                if dry_run:
                    final_report = "[DRY-RUN] Supervisor finalized report from worker outputs."
                else:
                    casual_output = state["agent_outputs"].get("casual_convo_agent")
                    non_casual_outputs = {
                        k: v for k, v in state["agent_outputs"].items() if k != "casual_convo_agent"
                    }

                    if casual_output and not non_casual_outputs:
                        # Casual conversation path — surface the agent's reply directly.
                        if on_token:
                            on_token(casual_output)
                        final_report = casual_output
                    else:
                        wants_report = WorkflowService._wants_report_format(state["goal"])
                        if wants_report:
                            format_instruction = (
                                "Return a clear report with sections: Executive Summary, Key Findings, Risks, and Recommendations."
                            )
                        else:
                            format_instruction = (
                                "Return a concise direct answer to the user's exact question. "
                                "Do not force a business-report format. "
                                "Use short plain language and at most 4 bullets when helpful."
                            )

                        final_prompt = (
                            f"You are {supervisor.role}.\n"
                            f"Business goal:\n{state['goal']}\n\n"
                            f"Dataset context:\n{state['dataset_context']}\n\n"
                            f"Worker outputs:\n{output_snapshot}\n\n"
                            f"{format_instruction}"
                        )
                        if on_token:
                            # Stream the final report token-by-token.
                            chunks: list[str] = []
                            for chunk in llm.stream(
                                [
                                    SystemMessage(content=f"You are {supervisor.role}."),
                                    HumanMessage(content=final_prompt),
                                ]
                            ):
                                text = WorkflowService._extract_text(chunk.content)
                                if text:
                                    on_token(text)
                                    chunks.append(text)
                            final_report = "".join(chunks)
                        else:
                            final_response = llm.invoke(
                                [
                                    SystemMessage(content=f"You are {supervisor.role}."),
                                    HumanMessage(content=final_prompt),
                                ]
                            )
                            final_report = WorkflowService._extract_text(final_response.content)

                logger.info("[run:%s] supervisor finalized report", run_id)
                conversation.append(
                    {
                        "agent": supervisor.name,
                        "content": f"Supervisor decision: FINISH\nReason: {reason}",
                    }
                )
                conversation.append({"agent": supervisor.name, "content": final_report})
                return {
                    **state,
                    "conversation": conversation,
                    "supervisor_instruction": "",
                    "supervisor_reasoning": reason,
                    "next_agent": "FINISH",
                    "final_report": final_report,
                    "pending_agents": [],
                    "completed_agents": completed,
                }

            directive = (
                f"Supervisor decision: route to {next_agent}\n"
                f"Reason: {reason}\n"
                f"Instruction: {instruction}"
            )
            conversation.append({"agent": supervisor.name, "content": directive})
            logger.info("[run:%s] supervisor dispatch: %s", run_id, directive)
            return {
                **state,
                "conversation": conversation,
                "supervisor_instruction": instruction,
                "supervisor_reasoning": reason,
                "next_agent": next_agent,
                "pending_agents": pending,
                "completed_agents": completed,
            }

        return node

    @classmethod
    def build_graph(
        cls,
        config: AppConfig,
        llm,
        dry_run: bool = False,
        tools=None,
        on_token: Callable[[str], None] | None = None,
        on_agent_event: Callable[[str, str], None] | None = None,
    ):
        graph = StateGraph(WorkflowState)
        enabled_agents: Dict[str, AgentConfig] = {
            agent.name: agent for agent in config.agents if agent.enabled
        }

        supervisor = enabled_agents.get("supervisor_agent")
        if supervisor:
            worker_agents = {name: agent for name, agent in enabled_agents.items() if name != supervisor.name}
            worker_names = list(worker_agents.keys())
            logger.info("workflow mode=supervisor workers=%s", worker_names)

            graph.add_node(
                supervisor.name,
                cls._build_supervisor_node(
                    supervisor=supervisor,
                    worker_agents=worker_agents,
                    llm=llm,
                    dry_run=dry_run,
                    on_token=on_token,
                ),
            )

            for worker_name, worker in worker_agents.items():
                graph.add_node(
                    worker_name,
                    cls._build_worker_node(
                        agent=worker,
                        llm=llm,
                        tools=tools,
                        dry_run=dry_run,
                        on_agent_event=on_agent_event,
                    ),
                )

            graph.add_edge(START, supervisor.name)

            branch_map = {worker_name: worker_name for worker_name in worker_agents.keys()}
            branch_map["FINISH"] = END

            graph.add_conditional_edges(
                supervisor.name,
                lambda state: state["next_agent"],
                branch_map,
            )

            for worker_name in worker_agents.keys():
                graph.add_edge(worker_name, supervisor.name)

            return graph.compile()

        nodes = enabled_agents
        logger.info("workflow mode=sequential nodes=%s", list(nodes.keys()))
        for agent_name, agent in nodes.items():
            graph.add_node(
                agent_name,
                cls._build_worker_node(
                    agent=agent,
                    llm=llm,
                    tools=tools,
                    dry_run=dry_run,
                    on_agent_event=on_agent_event,
                ),
            )

        graph.add_edge(START, config.workflow.start)
        for from_node, to_node in config.workflow.edges:
            graph.add_edge(from_node, to_node)

        graph.add_edge(config.workflow.end, END)
        return graph.compile()
