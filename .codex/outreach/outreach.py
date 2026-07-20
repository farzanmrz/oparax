#!/usr/bin/env python3
"""Deterministic state store for Oparax customer-discovery outreach."""

from __future__ import annotations

import argparse
import base64
import binascii
import fcntl
import json
import os
import re
import sys
import tempfile
from collections import Counter, defaultdict
from contextlib import contextmanager
from pathlib import Path
from typing import Any, Iterator


ROOT = Path(__file__).resolve().parent
DEFAULT_RECORDS = ROOT / "records.json"
DEFAULT_CONFIG = ROOT / "config.json"
ALLOWED_STATES = {"c_new", "x_av", "x_done", "x_unav", "l_done", "c_inv"}
QUEUE_STATES = {
    "check": "c_new",
    "send": "x_av",
    "lean": "x_done",
    "recheck": "x_unav",
}
TRANSITIONS = {
    "c_new": {"x_av", "x_unav", "c_inv"},
    "x_av": {"x_done", "x_unav", "c_inv"},
    "x_done": {"l_done"},
    # An x_unav record is already known to have failed one availability check.
    # Its recheck must either recover to x_av or become c_inv; it cannot remain
    # in the recheck queue indefinitely.
    "x_unav": {"x_av", "c_inv"},
    "l_done": set(),
    "c_inv": set(),
}
HANDLE_RE = re.compile(r"^@[A-Za-z0-9_]{1,15}$")


class OutreachError(Exception):
    pass


def canonical_handle(value: str) -> str:
    handle = value.strip()
    if not handle.startswith("@"):
        handle = f"@{handle}"
    if not HANDLE_RE.fullmatch(handle):
        raise OutreachError(f"Invalid X handle: {value!r}")
    return handle


def handle_key(value: str) -> str:
    return canonical_handle(value).casefold()


def load_json(path: Path) -> dict[str, Any]:
    try:
        with path.open("r", encoding="utf-8") as stream:
            value = json.load(stream)
    except FileNotFoundError as exc:
        raise OutreachError(f"Missing data file: {path}") from exc
    except json.JSONDecodeError as exc:
        raise OutreachError(f"Invalid JSON in {path}: {exc}") from exc
    if not isinstance(value, dict):
        raise OutreachError(f"Expected a JSON object in {path}")
    return value


@contextmanager
def store_lock(records_path: Path, exclusive: bool) -> Iterator[None]:
    lock_path = records_path.with_suffix(records_path.suffix + ".lock")
    lock_path.parent.mkdir(parents=True, exist_ok=True)
    with lock_path.open("a+", encoding="utf-8") as stream:
        fcntl.flock(stream.fileno(), fcntl.LOCK_EX if exclusive else fcntl.LOCK_SH)
        try:
            yield
        finally:
            fcntl.flock(stream.fileno(), fcntl.LOCK_UN)


def atomic_write(path: Path, value: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    descriptor, temporary_name = tempfile.mkstemp(prefix=f".{path.name}.", dir=path.parent)
    try:
        with os.fdopen(descriptor, "w", encoding="utf-8") as stream:
            json.dump(value, stream, ensure_ascii=False, indent=2)
            stream.write("\n")
            stream.flush()
            os.fsync(stream.fileno())
        os.replace(temporary_name, path)
    except Exception:
        try:
            os.unlink(temporary_name)
        except FileNotFoundError:
            pass
        raise


def config_for(path: Path) -> dict[str, Any]:
    config = load_json(path)
    if config.get("version") != 1 or not isinstance(config.get("verticals"), dict):
        raise OutreachError("Unsupported or malformed outreach config")
    return config


def records_for(path: Path) -> dict[str, Any]:
    store = load_json(path)
    if store.get("version") != 1 or not isinstance(store.get("records"), list):
        raise OutreachError("Unsupported or malformed outreach records")
    return store


def rendered_message(config: dict[str, Any], vertical: str, first_name: str) -> str:
    vertical_config = config["verticals"].get(vertical)
    if not isinstance(vertical_config, dict) or not isinstance(vertical_config.get("template"), str):
        raise OutreachError(f"No active outreach template for vertical: {vertical}")
    name = first_name.strip()
    if not name:
        raise OutreachError("first_name cannot be blank")
    template = vertical_config["template"]
    if template.count("[name]") != 1:
        raise OutreachError(f"Template for {vertical} must contain [name] exactly once")
    return template.replace("[name]", name)


def validate_store(store: dict[str, Any], config: dict[str, Any]) -> None:
    seen: set[str] = set()
    for index, record in enumerate(store["records"], start=1):
        if not isinstance(record, dict):
            raise OutreachError(f"Record {index} is not an object")
        handle = canonical_handle(str(record.get("handle", "")))
        key = handle.casefold()
        if key in seen:
            raise OutreachError(f"Duplicate handle: {handle}")
        seen.add(key)
        if record.get("state") not in ALLOWED_STATES:
            raise OutreachError(f"Invalid state for {handle}: {record.get('state')!r}")
        if not isinstance(record.get("vertical"), str) or not record["vertical"].strip():
            raise OutreachError(f"Missing vertical for {handle}")

        state = record["state"]
        if state == "x_av":
            for field in ("display_name", "first_name", "message", "leanspark_contact"):
                if not isinstance(record.get(field), str) or not record[field].strip():
                    raise OutreachError(f"{handle} in x_av is missing {field}")
            expected = rendered_message(config, record["vertical"], record["first_name"])
            if record["message"] != expected:
                raise OutreachError(f"Prepared message drift for {handle}")
        if state in {"x_done", "l_done"}:
            for field in ("display_name", "leanspark_contact"):
                if not isinstance(record.get(field), str) or not record[field].strip():
                    raise OutreachError(f"{handle} in {state} is missing {field}")


def find_record(store: dict[str, Any], handle: str) -> dict[str, Any]:
    key = handle_key(handle)
    for record in store["records"]:
        if handle_key(record["handle"]) == key:
            return record
    raise OutreachError(f"Unknown handle: {handle}")


def next_record(store: dict[str, Any], queue: str) -> dict[str, Any] | None:
    source_state = QUEUE_STATES[queue]
    for record in store["records"]:
        if record["state"] == source_state:
            if queue in {"check", "recheck"}:
                return {"handle": record["handle"], "vertical": record["vertical"]}
            if queue == "send":
                return {"handle": record["handle"], "message": record["message"]}
            return {"handle": record["handle"], "contact": record["leanspark_contact"]}
    return None


def queue_count(store: dict[str, Any], queue: str) -> int:
    source_state = QUEUE_STATES[queue]
    return sum(record["state"] == source_state for record in store["records"])


def queue_records(store: dict[str, Any], queue: str) -> list[dict[str, Any]]:
    source_state = QUEUE_STATES[queue]
    records: list[dict[str, Any]] = []
    for record in store["records"]:
        if record["state"] != source_state:
            continue
        item = {"handle": record["handle"], "vertical": record["vertical"]}
        for field in ("display_name", "first_name"):
            if isinstance(record.get(field), str) and record[field].strip():
                item[field] = record[field]
        records.append(item)
    return records


def decode_batch(encoded: str) -> list[dict[str, Any]]:
    try:
        raw = base64.b64decode(encoded, validate=True).decode("utf-8")
        value = json.loads(raw)
    except (binascii.Error, UnicodeDecodeError, json.JSONDecodeError) as exc:
        raise OutreachError("Invalid base64 JSON batch") from exc
    if not isinstance(value, list) or not all(isinstance(item, dict) for item in value):
        raise OutreachError("Batch must be a JSON array of objects")
    return value


def apply_check_batch(
    store: dict[str, Any],
    config: dict[str, Any],
    queue: str,
    results: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    if queue not in {"check", "recheck"}:
        raise OutreachError("Check batches support only check or recheck queues")

    expected_state = QUEUE_STATES[queue]
    seen: set[str] = set()
    resolved: list[dict[str, Any]] = []
    for item in results:
        handle = canonical_handle(str(item.get("handle", "")))
        key = handle_key(handle)
        if key in seen:
            raise OutreachError(f"Duplicate handle in batch: {handle}")
        seen.add(key)

        record = find_record(store, handle)
        if record["state"] != expected_state:
            raise OutreachError(
                f"Unexpected batch state for {record['handle']}: {record['state']} (expected {expected_state})"
            )

        outcome = item.get("outcome")
        if outcome == "available":
            display_name = item.get("display_name") or record.get("display_name")
            first_name = item.get("first_name") or record.get("first_name")
            result = resolve_record(store, config, handle, "x_av", display_name, first_name)
        elif outcome == "unavailable":
            target_state = "x_unav" if queue == "check" else "c_inv"
            result = resolve_record(store, config, handle, target_state, None, None)
        elif outcome == "invalid":
            result = resolve_record(store, config, handle, "c_inv", None, None)
        else:
            raise OutreachError(f"Invalid batch outcome for {handle}: {outcome!r}")
        resolved.append(result)
    return resolved


def resolve_record(
    store: dict[str, Any],
    config: dict[str, Any],
    handle: str,
    target_state: str,
    display_name: str | None,
    first_name: str | None,
) -> dict[str, Any]:
    record = find_record(store, handle)
    current = record["state"]
    if target_state not in TRANSITIONS[current]:
        raise OutreachError(f"Invalid transition for {record['handle']}: {current} -> {target_state}")

    if target_state == "x_av":
        if not display_name or not display_name.strip() or not first_name or not first_name.strip():
            raise OutreachError("x_av requires --display-name and --first-name")
        clean_display_name = display_name.strip()
        clean_first_name = first_name.strip()
        record.update(
            display_name=clean_display_name,
            first_name=clean_first_name,
            message=rendered_message(config, record["vertical"], clean_first_name),
            leanspark_contact=f"{clean_display_name} ({record['handle']})",
        )

    record["state"] = target_state
    return record


def add_record(store: dict[str, Any], vertical: str, handle: str) -> dict[str, Any]:
    normalized = canonical_handle(handle)
    if any(handle_key(record["handle"]) == normalized.casefold() for record in store["records"]):
        raise OutreachError(f"Handle already exists: {normalized}")
    record = {"handle": normalized, "vertical": vertical.strip(), "state": "c_new"}
    if not record["vertical"]:
        raise OutreachError("vertical cannot be blank")
    store["records"].append(record)
    return record


def status_markdown(store: dict[str, Any]) -> str:
    grouped: dict[str, Counter[str]] = defaultdict(Counter)
    for record in store["records"]:
        grouped[record["vertical"]][record["state"]] += 1

    headers = ["Vertical", "Total", "New", "Ready", "DMed", "Unavailable", "Invalid", "Lean pending", "Lean logged"]
    lines = ["| " + " | ".join(headers) + " |", "|" + "|".join(["---"] * len(headers)) + "|"]

    def row(label: str, counts: Counter[str]) -> list[str]:
        total = sum(counts.values())
        dmed = counts["x_done"] + counts["l_done"]
        return [
            label,
            str(total),
            str(counts["c_new"]),
            str(counts["x_av"]),
            str(dmed),
            str(counts["x_unav"]),
            str(counts["c_inv"]),
            str(counts["x_done"]),
            str(counts["l_done"]),
        ]

    overall: Counter[str] = Counter()
    preferred = ["football", "nba", "nfl", "politics"]
    ordered = preferred + sorted(set(grouped) - set(preferred))
    for vertical in ordered:
        if vertical in grouped:
            overall.update(grouped[vertical])
            lines.append("| " + " | ".join(row(vertical, grouped[vertical])) + " |")
    lines.append("| " + " | ".join(row("TOTAL", overall)) + " |")
    return "\n".join(lines)


def print_json(value: Any) -> None:
    json.dump(value, sys.stdout, ensure_ascii=False, indent=2)
    sys.stdout.write("\n")


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--records", type=Path, default=DEFAULT_RECORDS)
    parser.add_argument("--config", type=Path, default=DEFAULT_CONFIG)
    subparsers = parser.add_subparsers(dest="command", required=True)

    next_parser = subparsers.add_parser("next", help="Return the next record for a workflow")
    next_parser.add_argument("queue", choices=tuple(QUEUE_STATES))

    count_parser = subparsers.add_parser("count", help="Return the remaining count for a workflow")
    count_parser.add_argument("queue", choices=tuple(QUEUE_STATES))

    batch_parser = subparsers.add_parser("batch", help="Return every record for a workflow queue")
    batch_parser.add_argument("queue", choices=tuple(QUEUE_STATES))

    apply_batch_parser = subparsers.add_parser("apply-check-batch", help="Apply one browser check result batch")
    apply_batch_parser.add_argument("queue", choices=("check", "recheck"))
    apply_batch_parser.add_argument("payload", help="Base64-encoded JSON result array")

    resolve_parser = subparsers.add_parser("resolve", help="Apply one validated state transition")
    resolve_parser.add_argument("handle")
    resolve_parser.add_argument("state", choices=("x_av", "x_done", "x_unav", "l_done", "c_inv"))
    resolve_parser.add_argument("--display-name")
    resolve_parser.add_argument("--first-name")

    add_parser = subparsers.add_parser("add", help="Add one new contact")
    add_parser.add_argument("vertical")
    add_parser.add_argument("handle")

    subparsers.add_parser("status", help="Render deterministic outreach totals")
    subparsers.add_parser("validate", help="Validate configuration and all records")
    return parser


def main() -> int:
    args = build_parser().parse_args()
    try:
        config = config_for(args.config)
        if args.command in {"next", "count", "batch", "status", "validate"}:
            with store_lock(args.records, exclusive=False):
                store = records_for(args.records)
                validate_store(store, config)
                if args.command == "next":
                    print_json({"record": next_record(store, args.queue)})
                elif args.command == "count":
                    print_json({"queue": args.queue, "remaining": queue_count(store, args.queue)})
                elif args.command == "batch":
                    print_json({"queue": args.queue, "records": queue_records(store, args.queue)})
                elif args.command == "status":
                    print(status_markdown(store))
                else:
                    print(f"valid: {len(store['records'])} records")
            return 0

        with store_lock(args.records, exclusive=True):
            store = records_for(args.records)
            validate_store(store, config)
            if args.command == "resolve":
                result = resolve_record(
                    store,
                    config,
                    args.handle,
                    args.state,
                    args.display_name,
                    args.first_name,
                )
            elif args.command == "apply-check-batch":
                result = apply_check_batch(store, config, args.queue, decode_batch(args.payload))
            else:
                result = add_record(store, args.vertical, args.handle)
            validate_store(store, config)
            atomic_write(args.records, store)
            print_json({"record": result})
        return 0
    except OutreachError as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
