#!/usr/bin/env python3
import csv
import datetime as dt
import hashlib
import io
import json
import os
import pathlib
import subprocess
import sys
import time
import urllib.error
import urllib.request
import uuid
import zipfile

DB = "automation-chief-engineer-cloud"
BASE = "https://zg.gaona.world"
TARGET_EMAIL = "test@test.com"
TASK_ID = "43abb382-b774-4104-b38e-caee6cdfda44"
WORK = pathlib.Path("/tmp/ace-5015-rework")
WORK.mkdir(parents=True, exist_ok=True)

def safe_diag(stderr: str) -> str:
    lines = []
    for line in (stderr or "").splitlines():
        low = line.lower()
        if any(k in low for k in ("error", "forbidden", "unauthorized", "permission", "denied", "code")):
            lines.append(line[:500])
    return " | ".join(lines[-5:])[:1500]

def run(cmd, *, label):
    p = subprocess.run(
        cmd,
        cwd=os.environ.get("GITHUB_WORKSPACE") or None,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        env=os.environ.copy(),
    )
    if p.returncode != 0:
        diag = safe_diag(p.stderr)
        raise RuntimeError(f"{label} failed rc={p.returncode}" + (f": {diag}" if diag else ""))
    return p.stdout

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
        "User-Agent": "ACE-5015-Production-Rework/1.0",
    }
    if payload is not None:
        data = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        headers["Content-Type"] = "application/json; charset=utf-8"
    req = urllib.request.Request(BASE + path, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            raw = resp.read()
            body = json.loads(raw.decode("utf-8")) if raw else None
            return resp.status, body, dict(resp.headers)
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"HTTP {method} {path} failed status={e.code}: {body[:500]}")

def sha256_file(path: pathlib.Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as fh:
        for chunk in iter(lambda: fh.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()

def cleanup_session(session_id: str):
    try:
        d1(f"DELETE FROM sessions WHERE id = {sqlq(session_id)}")
    except Exception as exc:
        print(f"warning=session_cleanup_failed:{type(exc).__name__}")

def verify_no_product_cad_zip(zip_path: pathlib.Path):
    with zipfile.ZipFile(zip_path) as zf:
        names = [n.replace("\\", "/") for n in zf.namelist() if not n.endswith("/")]
        if len(names) != 121:
            raise RuntimeError(f"ZIP file count mismatch: {len(names)}")
        roots = {n.split("/", 1)[0] for n in names if "/" in n}
        if len(roots) != 1:
            raise RuntimeError("ZIP root count mismatch")
        root = next(iter(roots))
        rel = [n[len(root)+1:] if n.startswith(root + "/") else n for n in names]
        product = [p for p in rel if p.startswith("02_产品CAD与视图/")]
        forbidden = [p for p in product if p.lower().endswith((".step", ".stp", ".stl", ".brep"))]
        if forbidden:
            raise RuntimeError("No-CAD mode unexpectedly contains product CAD files")
        required = {
            "02_产品CAD与视图/PRODUCT_CAD_NOT_PROVIDED.md",
            "02_产品CAD与视图/product_cad_status.json",
            "02_产品CAD与视图/bottom_NO_PRODUCT_CAD.svg",
            "02_产品CAD与视图/front_NO_PRODUCT_CAD.svg",
            "02_产品CAD与视图/isometric_NO_PRODUCT_CAD.svg",
            "02_产品CAD与视图/right_NO_PRODUCT_CAD.svg",
            "02_产品CAD与视图/top_NO_PRODUCT_CAD.svg",
            "02_产品CAD与视图/scope_boundary_NO_PRODUCT_CAD.svg",
        }
        if set(product) != required:
            raise RuntimeError("No-CAD evidence layout mismatch")
        status = json.loads(zf.read(root + "/02_产品CAD与视图/product_cad_status.json").decode("utf-8"))
        if status.get("status") != "NO_PRODUCT_CAD_PROVIDED":
            raise RuntimeError("No-CAD status marker mismatch")
        if status.get("customerProductCadProvided") is not False:
            raise RuntimeError("No-CAD customerProductCadProvided must be false")
        if status.get("generatedProductCad") is not False:
            raise RuntimeError("No-CAD generatedProductCad must be false")
        manifest = json.loads(zf.read(root + "/05_交付清单/交付清单.json").decode("utf-8"))
        rows = manifest.get("files")
        if not isinstance(rows, list) or len(rows) != 119:
            raise RuntimeError("Manifest payload count mismatch")
        product_rows = [r for r in rows if str(r.get("Relative Path", "")).startswith("02_产品CAD与视图/")]
        if len(product_rows) != 8:
            raise RuntimeError("Manifest no-CAD product row count mismatch")
        for row in product_rows:
            if row.get("Status") != "NO_PRODUCT_CAD":
                raise RuntimeError("Manifest no-CAD Status mismatch")
            if row.get("Validation Result") != "SOURCE_CAD_NOT_PROVIDED":
                raise RuntimeError("Manifest no-CAD Validation Result mismatch")

def main():
    user_rows = d1(f"SELECT id, role FROM users WHERE email = {sqlq(TARGET_EMAIL)} LIMIT 1")
    if len(user_rows) != 1:
        raise RuntimeError("Target production test account was not found")
    user_id = user_rows[0]["id"]

    task_rows = d1(
        "SELECT id, owner_id, state, quality_status, deleted_at "
        f"FROM tasks WHERE id = {sqlq(TASK_ID)} LIMIT 1"
    )
    if len(task_rows) != 1:
        raise RuntimeError("Target task was not found")
    task = task_rows[0]
    if task.get("owner_id") != user_id:
        raise RuntimeError("Target task is not owned by the target production test account")
    if task.get("deleted_at") is not None:
        raise RuntimeError("Target task is deleted")
    if task.get("state") != "QUALITY_BLOCKED":
        raise RuntimeError(f"Expected QUALITY_BLOCKED before rework, got {task.get('state')}")

    input_rows = d1(
        "SELECT COUNT(*) AS total, "
        "SUM(CASE WHEN lower(original_name) LIKE '%.step' OR lower(original_name) LIKE '%.stp' OR lower(original_name) LIKE '%.stl' THEN 1 ELSE 0 END) AS cad "
        f"FROM task_inputs WHERE task_id = {sqlq(TASK_ID)}"
    )
    total_inputs = int(input_rows[0].get("total") or 0)
    cad_inputs = int(input_rows[0].get("cad") or 0)
    if cad_inputs != 0:
        raise RuntimeError(f"Expected zero product CAD inputs for historical 5015 replay, got {cad_inputs}")
    print(f"pre_rework_inputs_total={total_inputs}")
    print(f"pre_rework_product_cad_inputs={cad_inputs}")

    session_id = str(uuid.uuid4())
    now = dt.datetime.now(dt.timezone.utc)
    expires = now + dt.timedelta(minutes=90)
    d1(
        "INSERT INTO sessions (id, user_id, expires_at, created_at) VALUES ("
        + ", ".join([
            sqlq(session_id),
            sqlq(user_id),
            sqlq(expires.isoformat().replace("+00:00", "Z")),
            sqlq(now.isoformat().replace("+00:00", "Z")),
        ])
        + ")"
    )

    try:
        status, body, _ = http_json("POST", f"/api/tasks/{TASK_ID}/rework", session_id, {})
        if status != 202 or not body or not body.get("accepted") or not body.get("rework"):
            raise RuntimeError("Production API did not accept rework")
        print(f"rework_workflow_id={body.get('workflowId')}")
        print("rework_accepted=true")

        terminal = {"PACKAGED", "QUALITY_BLOCKED", "FAILED"}
        last_state = None
        deadline = time.time() + 65 * 60
        final_task = None
        while time.time() < deadline:
            _, task_body, _ = http_json("GET", f"/api/tasks/{TASK_ID}", session_id)
            current = task_body["task"]
            state = current["state"]
            if state != last_state:
                print(f"task_state={state}")
                last_state = state
            if state in terminal:
                final_task = current
                break
            time.sleep(20)

        if final_task is None:
            raise RuntimeError("Rework did not reach terminal state within 65 minutes")

        print(f"final_state={final_task['state']}")
        print(f"final_quality_status={final_task.get('quality_status')}")
        if final_task["state"] != "PACKAGED":
            incidents = d1(
                "SELECT code, source, status FROM workflow_incidents "
                f"WHERE task_id = {sqlq(TASK_ID)} ORDER BY created_at DESC LIMIT 5"
            )
            for idx, incident in enumerate(incidents, 1):
                print(f"incident_{idx}={incident.get('code')}|{incident.get('source')}|{incident.get('status')}")
            raise RuntimeError(f"Rework ended in {final_task['state']}")

        stage_rows = d1(
            "SELECT COUNT(DISTINCT stage_id) AS stage_count "
            "FROM artifacts "
            f"WHERE task_id = {sqlq(TASK_ID)} AND status = 'ACCEPTED' AND kind = 'stage-report'"
        )
        stage_count = int(stage_rows[0].get("stage_count") or 0)
        if stage_count != 15:
            raise RuntimeError(f"Expected 15 accepted stage reports, got {stage_count}")
        print(f"accepted_stage_count={stage_count}")

        _, delivery_body, _ = http_json("GET", f"/api/tasks/{TASK_ID}/delivery", session_id)
        delivery = delivery_body.get("delivery")
        if not delivery or delivery.get("status") != "FROZEN":
            raise RuntimeError("PACKAGED task does not have FROZEN delivery")

        req = urllib.request.Request(
            BASE + f"/api/tasks/{TASK_ID}/delivery/download",
            headers={
                "Cookie": f"ace_session={session_id}",
                "User-Agent": "ACE-5015-Production-Rework/1.0",
            },
            method="GET",
        )
        zip_path = WORK / "final.zip"
        with urllib.request.urlopen(req, timeout=180) as resp:
            header_sha = resp.headers.get("X-Delivery-Sha256")
            with zip_path.open("wb") as fh:
                while True:
                    chunk = resp.read(1024 * 1024)
                    if not chunk:
                        break
                    fh.write(chunk)

        actual_sha = sha256_file(zip_path)
        if header_sha and header_sha.lower() != actual_sha.lower():
            raise RuntimeError("Downloaded ZIP SHA does not match response header")
        if delivery.get("sha256") and str(delivery["sha256"]).lower() != actual_sha.lower():
            raise RuntimeError("Downloaded ZIP SHA does not match delivery metadata")

        verify_no_product_cad_zip(zip_path)

        out = run(
            [sys.executable, "scripts/validate_r2_f10_golden_delivery.py", str(zip_path)],
            label="authoritative Golden-121 validator",
        )
        if "PASS [R2-F10-GOLDEN-121]" not in out:
            raise RuntimeError("Authoritative validator did not emit PASS")

        print(f"delivery_sha256={actual_sha}")
        print(f"delivery_artifact_count={delivery.get('artifact_count')}")
        print("no_product_cad_evidence=PASS")
        print("golden_validator=PASS")
        print("production_5015_rework=PASS")
    finally:
        cleanup_session(session_id)

if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(f"::error::{type(exc).__name__}: {exc}")
        sys.exit(1)
