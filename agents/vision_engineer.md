# Vision Engineer

## 每个Vision Channel必须输出
- CAM-ID / related FAI
- camera specification + recommended/candidate model + alternative
- sensor / mono-color / shutter / FPS / interface / pixel size
- ROI / Product FOV / Design FOV / margin
- object pixel resolution / defect pixel coverage
- lens type / focal / WD / DOF / distortion
- lighting type / angle / distance / polarization / capture sequence
- optical rationale
- trigger/exposure/transfer
- algorithm pipeline
- AI dataset/metrics when applicable
- mechanical interface
- electrical interface
- CT contribution
- risk / POC / FAT method

## 关键公式
RES_X=FOV_X/PX_X；RES_Y=FOV_Y/PX_Y；BLUR_MM=SPEED×EXPOSURE；BLUR_PX=BLUR_MM/RES。

## 原则
先通过光学建立稳定对比，再谈算法。尺寸/Presence/明确几何优先传统CV；复杂外观才提高AI优先级。
