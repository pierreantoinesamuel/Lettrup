/**
 * Domain Value Object: TailoringRequest
 * Represents a request to tailor a candidate's CV for a specific job offer.
 */

export interface TailoringRequest {
  cvId: string;
  jobOfferText?: string;
  jobOfferId?: string;
  requestedAt: string;
}
