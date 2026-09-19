import { test, expect } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";

const BASE="https://zg.gaona.world";
const DB="automation-chief-engineer-cloud";
const EMAIL="test@test.com";

function q(v:string){return "'" + v.replaceAll("'","''") + "'";}
function d1(sql:string){
  const raw=execFileSync("npx",["wrangler","d1","execute",DB,"--remote","--json","--command",sql],{encoding:"utf8",env:process.env});
  const data=JSON.parse(raw);
  if(Array.isArray(data)){for(const x of data) if(Array.isArray(x?.results)) return x.results;}
  if(Array.isArray(data?.results)) return data.results;
  throw new Error("bad d1");
}

test.setTimeout(10*60*1000);
test("probe post-create switch", async ({browser})=>{
  const uid=String(d1(`SELECT id FROM users WHERE email=${q(EMAIL)} LIMIT 1`)[0].id);
  const sid=randomUUID();
  const now=new Date(), exp=new Date(now.getTime()+20*60*1000);
  d1("INSERT INTO sessions (id,user_id,expires_at,created_at) VALUES ("+[sid,uid,exp.toISOString(),now.toISOString()].map(q).join(",")+")");
  const ctx=await browser.newContext({viewport:{width:1600,height:1000}});
  await ctx.addCookies([{name:"ace_session",value:sid,domain:"zg.gaona.world",path:"/",httpOnly:true,secure:true,sameSite:"Lax",expires:Math.floor(Date.now()/1000)+1200}]);
  const page=await ctx.newPage();
  const errors:string[]=[];
  const responses:string[]=[];
  page.on("pageerror",e=>errors.push("pageerror:"+e.message));
  page.on("console",m=>{if(m.type()==="error")errors.push("console:"+m.text())});
  page.on("requestfailed",r=>errors.push("requestfailed:"+r.url()+":"+(r.failure()?.errorText||"")));
  page.on("response",r=>{if(r.url().includes("/api/tasks"))responses.push(r.status()+" "+r.request().method()+" "+r.url())});
  let createdId="";
  try{
    await page.goto(BASE,{waitUntil:"networkidle"});
    const target=page.locator("#task-list .task-row",{hasText:"5015 | Golden-121 PROD rerun"}).first();
    await target.click();
    await expect(page.locator("#task-title")).toContainText("5015 | Golden-121 PROD rerun");

    const hooks=await page.evaluate(()=>{
      const w=window as any;
      const orig=w.__ACE_FAST__?.switchTask;
      w.__qaSwitchCalls=[];
      if(orig){
        w.__ACE_FAST__.switchTask=async (id:string)=>{
          w.__qaSwitchCalls.push({id,at:Date.now(),before:w.__ACE_APP__?.state?.task?.id||null});
          try{
            const out=await orig(id);
            w.__qaSwitchCalls.push({id,at:Date.now(),after:w.__ACE_APP__?.state?.task?.id||null,title:document.querySelector("#task-title")?.textContent||null});
            return out;
          }catch(e:any){
            w.__qaSwitchCalls.push({id,at:Date.now(),error:String(e?.message||e)});
            throw e;
          }
        };
      }
      return {fast:!!w.__ACE_FAST__,switchType:typeof w.__ACE_FAST__?.switchTask,current:w.__ACE_APP__?.state?.task?.id||null};
    });
    console.log("PROBE_HOOKS|"+JSON.stringify(hooks));

    const title="QA Switch Probe "+Date.now();
    await page.locator("#new-task").click();
    await page.locator('#task-form input[name="title"]').fill(title);
    await page.locator('#task-form textarea[name="prompt"]').fill("这是一个生产浏览器切换探针任务，仅用于定位创建后自动切换问题，不启动工作流，测试结束后会软删除。");
    const postPromise=page.waitForResponse(r=>r.url().endsWith("/api/tasks")&&r.request().method()==="POST");
    await page.locator("#task-submit").click();
    const post=await postPromise;
    const body=await post.json();
    createdId=body.task.id;
    console.log("PROBE_CREATED|"+createdId+"|"+title);
    await expect(page.locator("#task-dialog")).toHaveJSProperty("open",false,{timeout:30000});
    await page.waitForTimeout(5000);
    const state=await page.evaluate(()=>{
      const w=window as any;
      return {
        calls:w.__qaSwitchCalls,
        appTaskId:w.__ACE_APP__?.state?.task?.id||null,
        appTaskTitle:w.__ACE_APP__?.state?.task?.title||null,
        domTitle:document.querySelector("#task-title")?.textContent||null,
        activeId:document.querySelector(".task-row.active")?.getAttribute("data-id")||null,
        inspector:document.querySelector("#inspector-body")?.textContent?.slice(0,300)||null,
      };
    });
    console.log("PROBE_STATE|"+JSON.stringify(state));
    console.log("PROBE_RESPONSES|"+JSON.stringify(responses));
    console.log("PROBE_ERRORS|"+JSON.stringify(errors));
  } finally {
    if(createdId){
      d1(`UPDATE tasks SET deleted_at=${q(new Date().toISOString())}, updated_at=${q(new Date().toISOString())} WHERE id=${q(createdId)} AND state='DRAFT'`);
    }
    d1(`DELETE FROM sessions WHERE id=${q(sid)}`);
    await ctx.close();
  }
});
