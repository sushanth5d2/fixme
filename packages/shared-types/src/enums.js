"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditAction = exports.ServiceAreaType = exports.ReviewStatus = exports.MediaType = exports.AddressType = exports.DocumentStatus = exports.DocumentType = exports.ComplaintReason = exports.ComplaintStatus = exports.NotificationChannel = exports.NotificationType = exports.UrgencyLevel = exports.JobStatus = exports.QuoteStatus = exports.RequestStatus = exports.FixerVerificationStatus = exports.UserStatus = exports.UserRole = void 0;
var UserRole;
(function (UserRole) {
    UserRole["CUSTOMER"] = "CUSTOMER";
    UserRole["FIXER"] = "FIXER";
    UserRole["ADMIN"] = "ADMIN";
    UserRole["SUPER_ADMIN"] = "SUPER_ADMIN";
})(UserRole || (exports.UserRole = UserRole = {}));
var UserStatus;
(function (UserStatus) {
    UserStatus["ACTIVE"] = "ACTIVE";
    UserStatus["BLOCKED"] = "BLOCKED";
    UserStatus["DEACTIVATED"] = "DEACTIVATED";
    UserStatus["PENDING_VERIFICATION"] = "PENDING_VERIFICATION";
})(UserStatus || (exports.UserStatus = UserStatus = {}));
var FixerVerificationStatus;
(function (FixerVerificationStatus) {
    FixerVerificationStatus["REGISTERED"] = "REGISTERED";
    FixerVerificationStatus["DOCUMENT_SUBMITTED"] = "DOCUMENT_SUBMITTED";
    FixerVerificationStatus["UNDER_REVIEW"] = "UNDER_REVIEW";
    FixerVerificationStatus["VERIFIED"] = "VERIFIED";
    FixerVerificationStatus["REJECTED"] = "REJECTED";
    FixerVerificationStatus["BLOCKED"] = "BLOCKED";
})(FixerVerificationStatus || (exports.FixerVerificationStatus = FixerVerificationStatus = {}));
var RequestStatus;
(function (RequestStatus) {
    RequestStatus["OPEN"] = "OPEN";
    RequestStatus["QUOTED"] = "QUOTED";
    RequestStatus["CUSTOMER_ACCEPTED"] = "CUSTOMER_ACCEPTED";
    RequestStatus["ASSIGNED"] = "ASSIGNED";
    RequestStatus["FIXER_ON_THE_WAY"] = "FIXER_ON_THE_WAY";
    RequestStatus["DEVICE_RECEIVED"] = "DEVICE_RECEIVED";
    RequestStatus["DIAGNOSING"] = "DIAGNOSING";
    RequestStatus["REPAIR_IN_PROGRESS"] = "REPAIR_IN_PROGRESS";
    RequestStatus["READY_FOR_DELIVERY"] = "READY_FOR_DELIVERY";
    RequestStatus["COMPLETED"] = "COMPLETED";
    RequestStatus["REVIEWED"] = "REVIEWED";
    RequestStatus["CANCELLED"] = "CANCELLED";
    RequestStatus["DISPUTED"] = "DISPUTED";
})(RequestStatus || (exports.RequestStatus = RequestStatus = {}));
var QuoteStatus;
(function (QuoteStatus) {
    QuoteStatus["DRAFT"] = "DRAFT";
    QuoteStatus["SUBMITTED"] = "SUBMITTED";
    QuoteStatus["VIEWED"] = "VIEWED";
    QuoteStatus["ACCEPTED"] = "ACCEPTED";
    QuoteStatus["REJECTED"] = "REJECTED";
    QuoteStatus["WITHDRAWN"] = "WITHDRAWN";
    QuoteStatus["EXPIRED"] = "EXPIRED";
})(QuoteStatus || (exports.QuoteStatus = QuoteStatus = {}));
var JobStatus;
(function (JobStatus) {
    JobStatus["ASSIGNED"] = "ASSIGNED";
    JobStatus["FIXER_ON_THE_WAY"] = "FIXER_ON_THE_WAY";
    JobStatus["DEVICE_RECEIVED"] = "DEVICE_RECEIVED";
    JobStatus["DIAGNOSING"] = "DIAGNOSING";
    JobStatus["REPAIR_IN_PROGRESS"] = "REPAIR_IN_PROGRESS";
    JobStatus["READY_FOR_DELIVERY"] = "READY_FOR_DELIVERY";
    JobStatus["COMPLETED"] = "COMPLETED";
    JobStatus["CANCELLED"] = "CANCELLED";
    JobStatus["DISPUTED"] = "DISPUTED";
})(JobStatus || (exports.JobStatus = JobStatus = {}));
var UrgencyLevel;
(function (UrgencyLevel) {
    UrgencyLevel["LOW"] = "LOW";
    UrgencyLevel["MEDIUM"] = "MEDIUM";
    UrgencyLevel["HIGH"] = "HIGH";
    UrgencyLevel["EMERGENCY"] = "EMERGENCY";
})(UrgencyLevel || (exports.UrgencyLevel = UrgencyLevel = {}));
var NotificationType;
(function (NotificationType) {
    NotificationType["REQUEST_CREATED"] = "REQUEST_CREATED";
    NotificationType["QUOTE_RECEIVED"] = "QUOTE_RECEIVED";
    NotificationType["QUOTE_ACCEPTED"] = "QUOTE_ACCEPTED";
    NotificationType["QUOTE_REJECTED"] = "QUOTE_REJECTED";
    NotificationType["NEW_MESSAGE"] = "NEW_MESSAGE";
    NotificationType["JOB_ASSIGNED"] = "JOB_ASSIGNED";
    NotificationType["JOB_STATUS_CHANGED"] = "JOB_STATUS_CHANGED";
    NotificationType["REPAIR_COMPLETED"] = "REPAIR_COMPLETED";
    NotificationType["REVIEW_REMINDER"] = "REVIEW_REMINDER";
    NotificationType["REVIEW_RECEIVED"] = "REVIEW_RECEIVED";
    NotificationType["COMPLAINT_UPDATED"] = "COMPLAINT_UPDATED";
    NotificationType["VERIFICATION_APPROVED"] = "VERIFICATION_APPROVED";
    NotificationType["VERIFICATION_REJECTED"] = "VERIFICATION_REJECTED";
    NotificationType["ACCOUNT_BLOCKED"] = "ACCOUNT_BLOCKED";
    NotificationType["NEW_MATCHING_REQUEST"] = "NEW_MATCHING_REQUEST";
})(NotificationType || (exports.NotificationType = NotificationType = {}));
var NotificationChannel;
(function (NotificationChannel) {
    NotificationChannel["IN_APP"] = "IN_APP";
    NotificationChannel["PUSH"] = "PUSH";
    NotificationChannel["EMAIL"] = "EMAIL";
    NotificationChannel["SMS"] = "SMS";
})(NotificationChannel || (exports.NotificationChannel = NotificationChannel = {}));
var ComplaintStatus;
(function (ComplaintStatus) {
    ComplaintStatus["OPEN"] = "OPEN";
    ComplaintStatus["UNDER_REVIEW"] = "UNDER_REVIEW";
    ComplaintStatus["WAITING_FOR_INFORMATION"] = "WAITING_FOR_INFORMATION";
    ComplaintStatus["RESOLVED"] = "RESOLVED";
    ComplaintStatus["REJECTED"] = "REJECTED";
    ComplaintStatus["CLOSED"] = "CLOSED";
})(ComplaintStatus || (exports.ComplaintStatus = ComplaintStatus = {}));
var ComplaintReason;
(function (ComplaintReason) {
    ComplaintReason["FIXER_DID_NOT_ARRIVE"] = "FIXER_DID_NOT_ARRIVE";
    ComplaintReason["POOR_SERVICE"] = "POOR_SERVICE";
    ComplaintReason["OVERCHARGING"] = "OVERCHARGING";
    ComplaintReason["DEVICE_DAMAGE"] = "DEVICE_DAMAGE";
    ComplaintReason["WARRANTY_ISSUE"] = "WARRANTY_ISSUE";
    ComplaintReason["UNPROFESSIONAL_BEHAVIOR"] = "UNPROFESSIONAL_BEHAVIOR";
    ComplaintReason["SUSPECTED_FRAUD"] = "SUSPECTED_FRAUD";
    ComplaintReason["FAKE_CUSTOMER"] = "FAKE_CUSTOMER";
    ComplaintReason["CUSTOMER_NO_SHOW"] = "CUSTOMER_NO_SHOW";
    ComplaintReason["ABUSIVE_BEHAVIOR"] = "ABUSIVE_BEHAVIOR";
    ComplaintReason["PAYMENT_DISPUTE"] = "PAYMENT_DISPUTE";
    ComplaintReason["FALSE_COMPLAINT"] = "FALSE_COMPLAINT";
})(ComplaintReason || (exports.ComplaintReason = ComplaintReason = {}));
var DocumentType;
(function (DocumentType) {
    DocumentType["BUSINESS_LICENSE"] = "BUSINESS_LICENSE";
    DocumentType["ID_PROOF"] = "ID_PROOF";
    DocumentType["GST_CERTIFICATE"] = "GST_CERTIFICATE";
    DocumentType["ADDRESS_PROOF"] = "ADDRESS_PROOF";
    DocumentType["BANK_STATEMENT"] = "BANK_STATEMENT";
    DocumentType["OTHER"] = "OTHER";
})(DocumentType || (exports.DocumentType = DocumentType = {}));
var DocumentStatus;
(function (DocumentStatus) {
    DocumentStatus["PENDING"] = "PENDING";
    DocumentStatus["APPROVED"] = "APPROVED";
    DocumentStatus["REJECTED"] = "REJECTED";
})(DocumentStatus || (exports.DocumentStatus = DocumentStatus = {}));
var AddressType;
(function (AddressType) {
    AddressType["HOME"] = "HOME";
    AddressType["WORK"] = "WORK";
    AddressType["OTHER"] = "OTHER";
})(AddressType || (exports.AddressType = AddressType = {}));
var MediaType;
(function (MediaType) {
    MediaType["PHOTO"] = "PHOTO";
    MediaType["VIDEO"] = "VIDEO";
})(MediaType || (exports.MediaType = MediaType = {}));
var ReviewStatus;
(function (ReviewStatus) {
    ReviewStatus["VISIBLE"] = "VISIBLE";
    ReviewStatus["HIDDEN"] = "HIDDEN";
})(ReviewStatus || (exports.ReviewStatus = ReviewStatus = {}));
var ServiceAreaType;
(function (ServiceAreaType) {
    ServiceAreaType["PINCODE"] = "PINCODE";
    ServiceAreaType["CITY"] = "CITY";
    ServiceAreaType["RADIUS"] = "RADIUS";
})(ServiceAreaType || (exports.ServiceAreaType = ServiceAreaType = {}));
var AuditAction;
(function (AuditAction) {
    AuditAction["USER_LOGIN"] = "USER_LOGIN";
    AuditAction["USER_LOGOUT"] = "USER_LOGOUT";
    AuditAction["USER_SIGNUP"] = "USER_SIGNUP";
    AuditAction["PASSWORD_RESET"] = "PASSWORD_RESET";
    AuditAction["ACCOUNT_BLOCKED"] = "ACCOUNT_BLOCKED";
    AuditAction["ACCOUNT_UNBLOCKED"] = "ACCOUNT_UNBLOCKED";
    AuditAction["ACCOUNT_DEACTIVATED"] = "ACCOUNT_DEACTIVATED";
    AuditAction["FIXER_VERIFICATION_SUBMITTED"] = "FIXER_VERIFICATION_SUBMITTED";
    AuditAction["FIXER_VERIFIED"] = "FIXER_VERIFIED";
    AuditAction["FIXER_REJECTED"] = "FIXER_REJECTED";
    AuditAction["QUOTE_ACCEPTED"] = "QUOTE_ACCEPTED";
    AuditAction["QUOTE_REJECTED"] = "QUOTE_REJECTED";
    AuditAction["JOB_STATUS_CHANGED"] = "JOB_STATUS_CHANGED";
    AuditAction["JOB_CANCELLED"] = "JOB_CANCELLED";
    AuditAction["REVIEW_HIDDEN"] = "REVIEW_HIDDEN";
    AuditAction["REVIEW_RESTORED"] = "REVIEW_RESTORED";
    AuditAction["COMPLAINT_STATUS_CHANGED"] = "COMPLAINT_STATUS_CHANGED";
    AuditAction["DISPUTE_RESOLVED"] = "DISPUTE_RESOLVED";
    AuditAction["ADMIN_CREATED"] = "ADMIN_CREATED";
    AuditAction["SENSITIVE_DATA_ACCESSED"] = "SENSITIVE_DATA_ACCESSED";
})(AuditAction || (exports.AuditAction = AuditAction = {}));
//# sourceMappingURL=enums.js.map