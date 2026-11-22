export type ClaimState='CHO_GUI'|'DA_GUI'|'DUOC_BOI_THUONG'|'TU_CHOI'|'KHONG_YEU_CAU';
const transitions:Record<ClaimState,ClaimState[]>={CHO_GUI:['DA_GUI','KHONG_YEU_CAU'],DA_GUI:['DUOC_BOI_THUONG','TU_CHOI'],DUOC_BOI_THUONG:[],TU_CHOI:[],KHONG_YEU_CAU:[]};
/** Recording a state never sends a claim to a real carrier or records a cash reimbursement. */
export const claimNextStates=(state:ClaimState)=>[state,...transitions[state]];
export const canTransitionClaim=(from:ClaimState,to:ClaimState)=>claimNextStates(from).includes(to);
