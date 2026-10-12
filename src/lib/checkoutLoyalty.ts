export interface CheckoutCustomerLoyalty {
  deliveryBenefit: boolean;
  vipDeliveryFee: 7 | 10 | null;
}

export type LoyaltyResult =
  | { status: 'found'; customer: CheckoutCustomerLoyalty }
  | { status: 'not-found' }
  | { status: 'error' };

export type LoyaltyState = LoyaltyResult | { status: 'idle' | 'loading' };
export interface LoyaltyRequestKey { phone: string; attempt: number }
export interface LoyaltySnapshot { key: LoyaltyRequestKey; result: LoyaltyResult }

export function isLoyaltyPhone(phone: string): boolean {return /^\d{10}$/.test(phone);}

/** Public checkout receives pricing eligibility, never a private customer profile. */
export function parseLoyaltyResult(data: unknown, error: unknown): LoyaltyResult {
  if (error !== null || !data || typeof data !== 'object' || Array.isArray(data)) return {status:'error'};
  const row:Record<string,unknown>=Object.fromEntries(Object.entries(data));
  if (row.ok!==true) return {status:'error'};
  if (row.registered===false) return {status:'not-found'};
  if (row.registered!==true || typeof row.delivery_benefit!=='boolean' ||
    (row.vip_delivery_fee!==null && row.vip_delivery_fee!==7 && row.vip_delivery_fee!==10) ||
    (row.delivery_benefit && row.vip_delivery_fee!==null)) return {status:'error'};
  return {status:'found',customer:{deliveryBenefit:row.delivery_benefit,vipDeliveryFee:row.vip_delivery_fee}};
}

/** Hide a previous phone/retry's response before effect cleanup runs. */
export function currentLoyalty(phone:string,key:LoyaltyRequestKey,snapshot:LoyaltySnapshot|null):LoyaltyState {
  if (!isLoyaltyPhone(phone)) return {status:'idle'};
  return snapshot?.key===key ? snapshot.result : {status:'loading'};
}
