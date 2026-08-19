import { QuoteStatus } from './enums';
import { Timestamps } from './common';
export interface Quote extends Timestamps {
    id: string;
    requestId: string;
    fixerId: string;
    fixerCompanyName: string;
    fixerRating: number;
    status: QuoteStatus;
    estimatedTotal: number;
    inspectionFee: number | null;
    laborCharge: number | null;
    sparePartsEstimate: number | null;
    estimatedCompletionDays: number;
    warrantyDays: number;
    notes: string | null;
    validUntil: string;
    submittedAt: string;
    viewedAt: string | null;
    acceptedAt: string | null;
    rejectedAt: string | null;
}
export interface SubmitQuoteDto {
    estimatedTotal: number;
    inspectionFee?: number;
    laborCharge?: number;
    sparePartsEstimate?: number;
    estimatedCompletionDays: number;
    warrantyDays: number;
    notes?: string;
    validUntil: string;
}
export interface UpdateQuoteDto extends Partial<SubmitQuoteDto> {
}
//# sourceMappingURL=quote.d.ts.map