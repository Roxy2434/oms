/** Simulation and real bank transfers are separate, explicit operator choices. */
export const isDemoMode=()=>process.env.OMS_DEMO_MODE==='1';
export const isPublicDeployment=()=>process.env.OMS_PUBLIC_DEPLOYMENT==='1';
export const isClassroomMode=()=>process.env.OMS_CLASSROOM_MODE==='1';
export const isCaptchaDisabled=()=>isClassroomMode()&&process.env.OMS_DISABLE_CAPTCHA==='1';
export const realBankAllowed=()=>!isDemoMode()||process.env.OMS_DEMO_REAL_BANK==='1';
