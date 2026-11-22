/** Region-based coursework timetable only. No coordinates, geocoding, map or distance calculation. */
export const ROUTING_POLICY='DOM-REGION-V3' as const;
// Preserve the previous default regional time estimates; these are sample transit buffers, NOT carrier commitments.
const TRANSIT_HOURS:Record<string,Record<string,number>>={
 // HN↔HCM 20h: with the 2h default handling this keeps the old 22h cross-region ETA inside the 24h SLA.
 HN:{HN:4,DN:13.75,HCM:20},
 DN:{HN:13.75,DN:4,HCM:13.75},
 HCM:{HN:20,DN:13.75,HCM:4},
};
export interface RouteEstimate {originRegion:string;destinationRegion:string;handlingHours:number;queueHours:number;transitHours:number;etaHours:number;model:typeof ROUTING_POLICY;}
export function estimateRoute(originRegion:string,destinationRegion:string,handlingHours=2,queueHours=0):RouteEstimate|null{
 const from=originRegion.replace(/-NOITHANH$/,''),to=destinationRegion.replace(/-NOITHANH$/,'');
 const transit=Object.hasOwn(TRANSIT_HOURS,from)&&Object.hasOwn(TRANSIT_HOURS[from],to)?TRANSIT_HOURS[from][to]:undefined;
 if(transit===undefined||![handlingHours,queueHours].every(n=>Number.isFinite(n)&&n>=0&&n<=168))return null;
 return {originRegion:from,destinationRegion:to,handlingHours,queueHours,transitHours:transit,etaHours:handlingHours+queueHours+transit,model:ROUTING_POLICY};
}
