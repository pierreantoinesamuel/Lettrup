/**
 * Domain entity and constants for Recruiter Cold Outreach Messages
 */

export const LINKEDIN_CONNECTION_NOTE_MAX_LENGTH = 300;

export type OutreachChannel = 'linkedin_connection_note' | 'linkedin_message' | 'cold_email';

export interface OutreachMessage {
  id: string;
  cvId?: string;
  jobOfferRef?: string;
  channel: OutreachChannel;
  content: string;
  createdAt: string;
}

/**
 * Enforces domain constraints for outreach channels.
 * Specifically, LinkedIn Connection Notes are strictly capped at 300 characters.
 */
export function enforceOutreachChannelConstraints(channel: OutreachChannel, content: string): string {
  const trimmed = content.trim();
  if (channel === 'linkedin_connection_note' && trimmed.length > LINKEDIN_CONNECTION_NOTE_MAX_LENGTH) {
    // Deterministic truncation ensuring <= 300 characters
    return trimmed.slice(0, LINKEDIN_CONNECTION_NOTE_MAX_LENGTH);
  }
  return trimmed;
}
