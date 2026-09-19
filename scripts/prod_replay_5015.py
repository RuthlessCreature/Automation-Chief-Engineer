#!/usr/bin/env python3
import datetime as dt
import hashlib
import json
import os
import pathlib
import subprocess
import sys
import time
import urllib.error
import urllib.request
import uuid
from urllib.parse import quote

DB = "automation-chief-engineer-cloud"
BUCKET = "automation-chief-engineer-artifacts"
BASE = "https://zg.gaona.world"
TARGET_EMAIL = "test@test.com"
WORK = pathlib.Path("/tmp/ace-5015-replay")
WORK.mkdir(parents=True, exist_ok=True)

def safe_diag(stderr: str) -> str:
    lines = []
    for line in (stderr or "").splitlines():
        low = line.lower()
        if any(k in low for k in ("error", "forbidden", "unauthorized", "permission", "denied", "code")):
            lines.append(line[:500])
    return " | ".join(lines[-5:])[:1500]

def run(cmd, *, label, capture=True):
    p = subprocess.run(
        cmd,
        cwd=os.environ.get("GITHUB_WORKSPACE") or None,
        stdout=subprocess.PIPE if capture else None,
        stderr=subprocess.PIPE,
        text=True,
        env=os.environ.copy(),
    )
    if p.returncode != 0:
        diag = safe_diag(p.stderr)
        raise RuntimeError(f"{label} failed rc={p.returncode}" + (f": {diag}" if diag else ""))
    return p.stdout if capture else ""

def d1(sql: str):
    out = run(
        ["npx", "wrangler", "d1", "execute", DB, "--remote", "--json", "--command", sql],
        label="D1 query",
    )
    data = json.loads(out)
    if isinstance(data, list):
        for item in data:
            if isinstance(item, dict) and isinstance(item.get("results"), list):
                return item["results"]
    if isinstance(data, dict) and isinstance(data.get("results"), list):
        return data["results"]
    raise RuntimeError("Unexpected D1 JSON shape")

def sqlq(value: str) -> str:
    return "'" + value.replace("'", "''") + "'"

def http_json(method: str, path: str, session_id: str, payload=None):
    data = None
    headers = {
        "Cookie": f"ace_session={session_id}",
        "Accept": "application/json",
        "User-Agent": "ACE-5015-Production-Replay/1.0",
    }
    if payload is not None:
        data = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        headers["Content-Type"] = "application/json; charset=utf-8"
    req = urllib.request.Request(BASE + path, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            body = resp.read()
            parsed = json.loads(body.decode("utf-8")) if body else None
            return resp.status, parsed, dict(resp.headers)
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"HTTP {method} {path} failed status={e.code}: {body[:500]}")

def delete_session(session_id: str):
    try:
        d1(f"DELETE FROM sessions WHERE id = {sqlq(session_id)}")
    except Exception as e:
        print(f"warning: temporary session cleanup failed: {type(e).__name__}")

def r2_get(storage_key: str, dest: pathlib.Path):
    run(
        ["npx", "wrangler", "r2", "object", "get", f"{BUCKET}/{storage_key}", "--file", str(dest), "--remote"],
        label="R2 input download",
    )

def r2_put(storage_key: str, src: pathlib.Path, content_type: str, original_name: str):
    disposition = "attachment; filename*=UTF-8''" + quote(original_name, safe="")
    run(
        [
            "npx", "wrangler", "r2", "object", "put", f"{BUCKET}/{storage_key}",
            "--file", str(src), "--remote",
            "--content-type", content_type,
            "--content-disposition", disposition,
        ],
        label="R2 input upload",
    )

def r2_delete(storage_key: str):
    try:
        run(
            ["npx", "wrangler", "r2", "object", "delete", f"{BUCKET}/{storage_key}", "--remote"],
            label="R2 cleanup",
        )
    except Exception:
        pass

def sha256_file(path: pathlib.Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as fh:
        for chunk in iter(lambda: fh.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()

def main():
    # Select the historical source without emitting its prompt/title into public CI logs.
    source_rows = d1("""
SELECT t.id, t.owner_id, t.title, t.prompt, t.state, t.created_at, t.deleted_at
FROM tasks t
WHERE t.title LIKE '%5015%'
   OR t.prompt LIKE '%5015%'
   OR EXISTS (SELECT 1 FROM task_inputs i WHERE i.task_id = t.id AND i.original_name LIKE '%5015%')
   OR EXISTS (SELECT 1 FROM artifacts a WHERE a.task_id = t.id AND a.title LIKE '%5015%')
ORDER BY CASE WHEN t.state = 'PACKAGED' THEN 0 ELSE 1 END, t.created_at ASC
LIMIT 10
""")
    if not source_rows:
        raise RuntimeError("No production task matching 5015 was found")
    source = source_rows[0]
    source_id = source["id"]

    target_rows = d1(f"SELECT id, email, role FROM users WHERE email = {sqlq(TARGET_EMAIL)} LIMIT 1")
    if len(target_rows) != 1:
        raise RuntimeError("Target production test account was not found")
    target_user = target_rows[0]
    target_user_id = target_user["id"]

    input_rows = d1(
        "SELECT id, original_name, content_type, size_bytes, storage_key, sha256, intake_status "
        f"FROM task_inputs WHERE task_id = {sqlq(source_id)} "
        "AND intake_status = 'STAGED_FORMAT_VALIDATED' ORDER BY created_at ASC"
    )

    print(f"source_candidates={len(source_rows)}")
    print(f"source_selected_state={source.get('state')}")
    print(f"source_input_count={len(input_rows)}")
    print(f"target_role={target_user.get('role')}")

    # Pull and cryptographically verify every source input before mutating task state.
    local_inputs = []
    for idx, row in enumerate(input_rows, start=1):
        dest = WORK / f"input-{idx:03d}.bin"
        r2_get(row["storage_key"], dest)
        actual_sha = sha256_file(dest)
        if actual_sha.lower() != str(row["sha256"]).lower():
            raise RuntimeError(f"Source input SHA mismatch at index {idx}")
        if dest.stat().st_size != int(row["size_bytes"]):
            raise RuntimeError(f"Source input size mismatch at index {idx}")
        local_inputs.append((row, dest))

    # Create a short-lived production session for the explicitly authorized test account.
    session_id = str(uuid.uuid4())
    now = dt.datetime.now(dt.timezone.utc)
    expires = now + dt.timedelta(minutes=60)
    d1(
        "INSERT INTO sessions (id, user_id, expires_at, created_at) VALUES ("
        + ", ".join([
            sqlq(session_id),
            sqlq(target_user_id),
            sqlq(expires.isoformat().replace("+00:00", "Z")),
            sqlq(now.isoformat().replace("+00:00", "Z")),
        ])
        + ")"
    )
    os.environ["ACE_EPHEMERAL_SESSION_ID"] = session_id

    new_task_id = None
    uploaded_keys = []
    started = False
    try:
        title = "5015 | Golden-121 PROD rerun | 2026-09-19"
        status, create_body, _ = http_json(
            "POST",
            "/api/tasks",
            session_id,
            {"title": title, "prompt": source["prompt"]},
        )
        if status != 201 or not create_body or not create_body.get("task", {}).get("id"):
            raise RuntimeError("Production API did not create the replay task")
        new_task_id = create_body["task"]["id"]

        # Clone validated source inputs byte-for-byte. We use the same R2/D1
        # structure as the upload endpoint to preserve original Unicode filenames.
        for idx, (row, local_path) in enumerate(local_inputs, start=1):
            new_input_id = str(uuid.uuid4())
            new_key = f"tasks/{new_task_id}/inputs/{new_input_id}/{row['original_name']}"
            r2_put(new_key, local_path, row["content_type"], row["original_name"])
            uploaded_keys.append(new_key)
            created_at = dt.datetime.now(dt.timezone.utc).isoformat().replace("+00:00", "Z")
            d1(
                "INSERT INTO task_inputs "
                "(id, task_id, uploaded_by, original_name, content_type, size_bytes, storage_key, sha256, intake_status, created_at) VALUES ("
                + ", ".join([
                    sqlq(new_input_id),
                    sqlq(new_task_id),
                    sqlq(target_user_id),
                    sqlq(row["original_name"]),
                    sqlq(row["content_type"]),
                    str(int(row["size_bytes"])),
                    sqlq(new_key),
                    sqlq(row["sha256"]),
                    sqlq("STAGED_FORMAT_VALIDATED"),
                    sqlq(created_at),
                ])
                + ")"
            )
            d1(
                "INSERT INTO audit_events (id, task_id, actor_id, action, detail_json, created_at) VALUES ("
                + ", ".join([
                    sqlq(str(uuid.uuid4())),
                    sqlq(new_task_id),
                    sqlq(target_user_id),
                    sqlq("TASK_INPUT_CLONED_PROD_REPLAY"),
                    sqlq(json.dumps({"sourceTaskId": source_id, "sourceInputIndex": idx}, separators=(",", ":"))),
                    sqlq(created_at),
                ])
                + ")"
            )

        # Record source linkage without copying prompt or filenames into the audit detail.
        linked_at = dt.datetime.now(dt.timezone.utc).isoformat().replace("+00:00", "Z")
        d1(
            "INSERT INTO audit_events (id, task_id, actor_id, action, detail_json, created_at) VALUES ("
            + ", ".join([
                sqlq(str(uuid.uuid4())),
                sqlq(new_task_id),
                sqlq(target_user_id),
                sqlq("TASK_REPLAY_SOURCE_LINKED"),
                sqlq(json.dumps({"sourceTaskId": source_id, "inputCount": len(input_rows)}, separators=(",", ":"))),
                sqlq(linked_at),
            ])
            + ")"
        )

        status, start_body, _ = http_json("POST", f"/api/tasks/{new_task_id}/start", session_id, {})
        if status != 202 or not start_body or not start_body.get("accepted"):
            raise RuntimeError("Production API did not accept the replay workflow")
        started = True
        workflow_id = start_body.get("workflowId")

        print(f"new_task_id={new_task_id}")
        print(f"workflow_id={workflow_id}")
        print("replay_started=true")

        # Poll the formal task API until terminal.
        terminal = {"PACKAGED", "QUALITY_BLOCKED", "FAILED"}
        last_state = None
        deadline = time.time() + 55 * 60
        final_task = None
        while time.time() < deadline:
            _, body, _ = http_json("GET", f"/api/tasks/{new_task_id}", session_id)
            task = body["task"]
            state = task["state"]
            if state != last_state:
                print(f"task_state={state}")
                last_state = state
            if state in terminal:
                final_task = task
                break
            time.sleep(20)
        if final_task is None:
            raise RuntimeError("Replay task did not reach a terminal state within 55 minutes")

        print(f"final_state={final_task['state']}")
        print(f"final_quality_status={final_task.get('quality_status')}")
        if final_task.get("last_error_code"):
            print(f"last_error_code={final_task.get('last_error_code')}")

        if final_task["state"] != "PACKAGED":
            raise RuntimeError(f"Replay ended in {final_task['state']}")

        _, delivery_body, _ = http_json("GET", f"/api/tasks/{new_task_id}/delivery", session_id)
        delivery = delivery_body.get("delivery")
        if not delivery or delivery.get("status") != "FROZEN":
            raise RuntimeError("Replay reached PACKAGED without a FROZEN delivery")

        req = urllib.request.Request(
            BASE + f"/api/tasks/{new_task_id}/delivery/download",
            headers={
                "Cookie": f"ace_session={session_id}",
                "User-Agent": "ACE-5015-Production-Replay/1.0",
            },
            method="GET",
        )
        zip_path = WORK / "final.zip"
        with urllib.request.urlopen(req, timeout=120) as resp:
            expected_sha = resp.headers.get("X-Delivery-Sha256")
            with zip_path.open("wb") as out:
                while True:
                    chunk = resp.read(1024 * 1024)
                    if not chunk:
                        break
                    out.write(chunk)

        actual_zip_sha = sha256_file(zip_path)
        if expected_sha and expected_sha.lower() != actual_zip_sha.lower():
            raise RuntimeError("Downloaded delivery SHA does not match response header")
        if delivery.get("sha256") and delivery["sha256"].lower() != actual_zip_sha.lower():
            raise RuntimeError("Downloaded delivery SHA does not match delivery metadata")

        run(
            [sys.executable, "scripts/validate_r2_f10_golden_delivery.py", str(zip_path)],
            label="Golden-121 authoritative validator",
            capture=True,
        )

        print(f"delivery_sha256={actual_zip_sha}")
        print(f"delivery_artifact_count={delivery.get('artifact_count')}")
        print("golden_validator=PASS")
        print("production_replay=PASS")

    except Exception:
        # If creation happened but start never did, clean the draft and copied objects.
        if new_task_id and not started:
            for key in reversed(uploaded_keys):
                r2_delete(key)
            try:
                http_json("DELETE", f"/api/tasks/{new_task_id}", session_id)
            except Exception:
                pass
        raise
    finally:
        delete_session(session_id)

if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(f"::error::{type(exc).__name__}: {exc}")
        sys.exit(1)
