#!/usr/bin/env python3
import datetime as dt
import hashlib
import json
import os
import subprocess
import sys
import urllib.request
import uuid

BASE = "https://zg.gaona.world"
DB = "automation-chief-engineer-cloud"
EMAIL = "test@test.com"
TASK_ID = "43abb382-b774-4104-b38e-caee6cdfda44"

def sqlq(v: str) -> str:
    return "'" + v.replace("'", "''") + "'"

def d1(sql: str):
    p = subprocess.run(
        ["npx","wrangler","d1","execute",DB,"--remote","--json","--command",sql],
        stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, env=os.environ.copy()
    )
    if p.returncode != 0:
        raise RuntimeError("D1 query failed")
    data = json.loads(p.stdout)
    if isinstance(data, list):
        for item in data:
            if isinstance(item, dict) and isinstance(item.get("results"), list):
                return item["results"]
    if isinstance(data, dict) and isinstance(data.get("results"), list):
        return data["results"]
    raise RuntimeError("Unexpected D1 response")

def get_text(path: str) -> str:
    req = urllib.request.Request(BASE + path, headers={"User-Agent":"ACE-Delivery-Panel-Verify/1.0"})
    with urllib.request.urlopen(req, timeout=30) as r:
        return r.read().decode("utf-8", errors="strict")

def get_json(path: str, session_id: str):
    req = urllib.request.Request(
        BASE + path,
        headers={"Cookie": f"ace_session={session_id}", "Accept":"application/json", "User-Agent":"ACE-Delivery-Panel-Verify/1.0"},
    )
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.loads(r.read().decode("utf-8"))

def download(path: str, session_id: str):
    req = urllib.request.Request(
        BASE + path,
        headers={"Cookie": f"ace_session={session_id}", "User-Agent":"ACE-Delivery-Panel-Verify/1.0"},
    )
    with urllib.request.urlopen(req, timeout=180) as r:
        data = r.read()
        return data, dict(r.headers)

def main():
    app = get_text("/app.js")
    delivery_js = get_text("/delivery.js")
    if "window.__ACE_DELIVERY__?.refresh?.()" not in app:
        raise RuntimeError("production app.js does not contain delivery delegation fix")
    if "<b>尚未冻结客户 ZIP</b>" in app:
        raise RuntimeError("production app.js still contains stale delivery placeholder writer")
    if "window.__ACE_DELIVERY__ = { refresh: refreshDeliveryPanel }" not in delivery_js:
        raise RuntimeError("production delivery.js does not expose single-writer refresh hook")
    if "body.dataset.deliveryStatus = 'FROZEN'" not in delivery_js:
        raise RuntimeError("production delivery.js missing frozen-state marker")
    print("production_assets_delivery_fix=PASS")

    users = d1(f"SELECT id FROM users WHERE email={sqlq(EMAIL)} LIMIT 1")
    if len(users) != 1:
        raise RuntimeError("test account missing")
    uid = users[0]["id"]
    session = str(uuid.uuid4())
    now = dt.datetime.now(dt.timezone.utc)
    expires = now + dt.timedelta(minutes=10)
    d1(
        "INSERT INTO sessions (id,user_id,expires_at,created_at) VALUES ("
        + ",".join([
            sqlq(session), sqlq(uid),
            sqlq(expires.isoformat().replace("+00:00","Z")),
            sqlq(now.isoformat().replace("+00:00","Z")),
        ]) + ")"
    )
    try:
        payload = get_json(f"/api/tasks/{TASK_ID}/delivery", session)
        delivery = payload.get("delivery")
        if not delivery or delivery.get("status") != "FROZEN":
            raise RuntimeError("production delivery metadata is not FROZEN")
        if not delivery.get("download_path"):
            raise RuntimeError("production delivery metadata has no download path")
        blob, headers = download(delivery["download_path"], session)
        actual = hashlib.sha256(blob).hexdigest()
        expected = str(delivery.get("sha256") or "").lower()
        header_sha = str(headers.get("X-Delivery-Sha256") or "").lower()
        if not expected or actual != expected or (header_sha and actual != header_sha):
            raise RuntimeError("production delivery download SHA mismatch")
        if not blob.startswith(b"PK"):
            raise RuntimeError("production delivery download is not ZIP")
        print("production_delivery_frozen=PASS")
        print("production_delivery_download=PASS")
        print(f"production_delivery_sha256={actual}")
    finally:
        d1(f"DELETE FROM sessions WHERE id={sqlq(session)}")

if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(f"::error::{type(exc).__name__}: {exc}")
        sys.exit(1)
