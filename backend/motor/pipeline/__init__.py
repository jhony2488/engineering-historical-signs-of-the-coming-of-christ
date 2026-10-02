"""Pipeline diário — importe submódulos diretamente (ex.: motor.pipeline.orchestrator)."""

__all__ = ["DailyOrchestrator"]


def __getattr__(name: str):
    if name == "DailyOrchestrator":
        from motor.pipeline.orchestrator import DailyOrchestrator

        return DailyOrchestrator
    raise AttributeError(f"module {__name__!r} has no attribute {name!r}")
