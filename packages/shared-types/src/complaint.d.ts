import { ComplaintStatus, ComplaintReason } from './enums';
import { Timestamps } from './common';
export interface Complaint extends Timestamps {
    id: string;
    reporterId: string;
    reporterRole: string;
    accusedId: string;
    accusedRole: string;
    requestId: string | null;
    jobId: string | null;
    reason: ComplaintReason;
    description: string;
    status: ComplaintStatus;
    resolution: string | null;
    resolvedAt: string | null;
    assignedAdminId: string | null;
    internalNotes: string | null;
}
export interface CreateComplaintDto {
    accusedId: string;
    requestId?: string;
    jobId?: string;
    reason: ComplaintReason;
    description: string;
}
//# sourceMappingURL=complaint.d.ts.map