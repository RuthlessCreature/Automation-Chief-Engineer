#!/usr/bin/env python3
import datetime as dt, json, os, subprocess, urllib.request, urllib.error, uuid

DB="automation-chief-engineer-cloud"
BASE="https://zg.gaona.world"
EMAIL="test@test.com"

def q(v): return "'" + v.replace("'", "''") + "'"
def d1(sql):
    p=subprocess.run(["npx","wrangler","d1","execute",DB,"--remote","--json","--command",sql],stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True,env=os.environ.copy())
    if p.returncode: raise RuntimeError("d1 failed")
    data=json.loads(p.stdout)
    if isinstance(data,list):
        for item in data:
            if isinstance(item,dict) and isinstance(item.get("results"),list): return item["results"]
    if isinstance(data,dict) and isinstance(data.get("results"),list): return data["results"]
    raise RuntimeError("bad d1 shape")

def get(path, sid):
    req=urllib.request.Request(BASE+path,headers={"Cookie":f"ace_session={sid}","Accept":"application/json","User-Agent":"ACE-QA-Draft-Probe/1.0"})
    try:
        with urllib.request.urlopen(req,timeout=30) as r:
            body=r.read().decode("utf-8",errors="replace")
            return r.status, body[:500]
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode("utf-8",errors="replace")[:500]

users=d1(f"SELECT id FROM users WHERE email={q(EMAIL)} LIMIT 1")
uid=str(users[0]["id"])
tasks=d1("SELECT t.id,t.title,t.state,t.created_at FROM tasks t JOIN users u ON u.id=t.owner_id WHERE u.email='test@test.com' AND t.title LIKE 'QA Browser Fullflow %' ORDER BY t.created_at DESC LIMIT 3")
print("TASKS="+json.dumps(tasks,ensure_ascii=False))
tid=str(tasks[0]["id"])
sid=str(uuid.uuid4()); now=dt.datetime.now(dt.timezone.utc); exp=now+dt.timedelta(minutes=10)
d1("INSERT INTO sessions (id,user_id,expires_at,created_at) VALUES ("+",".join(map(q,[sid,uid,exp.isoformat().replace("+00:00","Z"),now.isoformat().replace("+00:00","Z")]))+")")
try:
    for path in [
        f"/api/tasks/{tid}",
        f"/api/tasks/{tid}/artifacts",
        f"/api/tasks/{tid}/inputs",
        f"/api/tasks/{tid}/events?after=0",
        f"/api/tasks/{tid}/delivery",
    ]:
        status,body=get(path,sid)
        print(f"PROBE|{status}|{path}|{body}")
finally:
    d1(f"DELETE FROM sessions WHERE id={q(sid)}")
