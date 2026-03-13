from __future__ import annotations

import logging
import os

from dotenv import load_dotenv
from langchain_openai import ChatOpenAI

logger = logging.getLogger(__name__)

load_dotenv()


class LLMService:
    @staticmethod
    def build(model_provider: str, model_name: str, temperature: float):
        provider = os.getenv("MODEL_PROVIDER", model_provider).lower()
        model = os.getenv("MODEL_NAME", model_name)
        temp = float(os.getenv("MODEL_TEMPERATURE", temperature))

        if provider in {"zai", "z.ai"}:
            api_key = os.getenv("ZAI_API_KEY")
            if not api_key:
                raise ValueError("ZAI_API_KEY is required when MODEL_PROVIDER is zai.")

            api_base = os.getenv("ZAI_API_BASE", "https://api.z.ai/api/paas/v4/")
            logger.info("LLMService using Z.AI base=%s model=%s", api_base, model)
            return ChatOpenAI(
                temperature=temp,
                model=model,
                openai_api_key=api_key,
                openai_api_base=api_base,
            )

        if provider in {"gradient", "digitalocean", "do"}:
            # DigitalOcean Serverless Inference is OpenAI-compatible.
            api_key = os.getenv("MODEL_ACCESS_KEY")
            if not api_key:
                raise ValueError(
                    "MODEL_ACCESS_KEY is required when MODEL_PROVIDER is gradient."
                )

            api_base = os.getenv("DO_INFERENCE_BASE_URL", "https://inference.do-ai.run/v1/")
            logger.info("LLMService using DigitalOcean Gradient base=%s model=%s", api_base, model)
            return ChatOpenAI(
                temperature=temp,
                model=model,
                openai_api_key=api_key,
                openai_api_base=api_base,
            )

        if provider == "openai":
            api_key = os.getenv("OPENAI_API_KEY")
            if not api_key:
                raise ValueError("OPENAI_API_KEY is required when MODEL_PROVIDER is openai.")

            api_base = os.getenv("OPENAI_API_BASE")
            kwargs = {
                "temperature": temp,
                "model": model,
                "openai_api_key": api_key,
            }
            if api_base:
                kwargs["openai_api_base"] = api_base

            logger.info("LLMService using OpenAI-compatible model=%s", model)
            return ChatOpenAI(**kwargs)

        raise ValueError(
            f"Unsupported MODEL_PROVIDER '{provider}'. Use one of: zai, gradient, openai."
        )
