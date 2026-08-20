# Handoff Packet Schema

每个角色PASS后必须生成：

```text
Project ID
From Agent
To Agent
Gate Passed
PEM Revision
Frozen Facts
New Approved Objects
Assumptions
Open Items
Risks
Downstream Constraints
Required Inputs for Next Agent
Artifacts / References
Dependency Watch List
```

Handoff只传下游需要的信息，不传整个聊天历史。
