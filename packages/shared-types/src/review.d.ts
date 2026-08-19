import { ReviewStatus } from './enums';
import { Timestamps } from './common';
export interface Review extends Timestamps {
    id: string;
    jobId: string;
    customerId: string;
    fixerId: string;
    overallRating: number;
    serviceQuality: number;
    communication: number;
    pricing: number;
    timeliness: number;
    professionalism: number;
    reviewText: string | null;
    status: ReviewStatus;
    hiddenAt: string | null;
    hiddenReason: string | null;
}
export interface SubmitReviewDto {
    overallRating: number;
    serviceQuality: number;
    communication: number;
    pricing: number;
    timeliness: number;
    professionalism: number;
    reviewText?: string;
}
export interface FixerRatingAggregate {
    averageOverall: number;
    averageServiceQuality: number;
    averageCommunication: number;
    averagePricing: number;
    averageTimeliness: number;
    averageProfessionalism: number;
    totalReviews: number;
    ratingDistribution: Record<1 | 2 | 3 | 4 | 5, number>;
}
//# sourceMappingURL=review.d.ts.map