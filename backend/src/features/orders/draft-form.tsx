import {DraftForm as LegacyDraftForm} from './legacy-draft-form';
import {CheckoutForm} from './checkout-form';
type Props=React.ComponentProps<typeof LegacyDraftForm>;
export function DraftForm(props:Omit<Props,'initial'>&{initial?:NonNullable<Props['initial']>&{shippingPolicy?:string};customers:(Props['customers'][number]&{city?:string|null})[]}){return props.initial&&props.initial.shippingPolicy!=='SUM_FREIGHT_V1'?<LegacyDraftForm {...props}/>:<CheckoutForm customers={props.customers} skus={props.skus} initial={props.initial}/>;}
