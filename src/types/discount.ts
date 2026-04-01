export type DiscountType = 'percentage' | 'fixed';

export interface DiscountCode {
    _id?: string;
    code: string;
    type: DiscountType;
    value: number;
    expiresAt?: Date;
    usageLimit?: number;
    usageCount: number;
    active: boolean;
}
