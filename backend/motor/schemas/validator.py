import json
from functools import lru_cache
from pathlib import Path
from typing import Any

import jsonschema
from jsonschema import Draft202012Validator

SCHEMAS_DIR = Path(__file__).parent


class SchemaValidator:
    def __init__(self) -> None:
        self._validators: dict[str, Draft202012Validator] = {}

    def _load(self, name: str) -> Draft202012Validator:
        if name not in self._validators:
            path = SCHEMAS_DIR / f"{name}.schema.json"
            with path.open(encoding="utf-8") as f:
                schema = json.load(f)
            self._validators[name] = Draft202012Validator(schema)
        return self._validators[name]

    def validate(self, name: str, data: Any) -> None:
        validator = self._load(name)
        errors = sorted(validator.iter_errors(data), key=lambda e: e.path)
        if errors:
            messages = "; ".join(f"{list(e.path)}: {e.message}" for e in errors[:5])
            raise jsonschema.ValidationError(f"Schema '{name}' inválido: {messages}")

    def is_valid(self, name: str, data: Any) -> bool:
        try:
            self.validate(name, data)
            return True
        except jsonschema.ValidationError:
            return False


@lru_cache
def get_validator() -> SchemaValidator:
    return SchemaValidator()
