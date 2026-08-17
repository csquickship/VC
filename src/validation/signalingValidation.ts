export interface JoinRoomPayload {
  roomId: string;
}

export interface OfferPayload {
  roomId: string;
  offer: {
    type: string;
    sdp: string;
  };
}

export interface AnswerPayload {
  roomId: string;
  answer: {
    type: string;
    sdp: string;
  };
}

export interface IceCandidatePayload {
  roomId: string;
  candidate: {
    candidate: string;
    sdpMid?: string | null;
    sdpMLineIndex?: number | null;
    usernameFragment?: string | null;
  };
}

export function isValidRoomId(roomId: unknown): roomId is string {
  if (typeof roomId !== 'string') return false;
  const trimmed = roomId.trim();
  if (trimmed.length === 0 || trimmed.length > 64) return false;
  return /^[a-zA-Z0-9_-]+$/.test(trimmed);
}

export function isValidJoinPayload(data: unknown): data is JoinRoomPayload {
  if (typeof data !== 'object' || data === null) return false;
  const payload = data as Record<string, unknown>;
  return isValidRoomId(payload.roomId);
}

export function isValidOfferPayload(data: unknown): data is OfferPayload {
  if (typeof data !== 'object' || data === null) return false;
  const payload = data as Record<string, unknown>;

  if (!isValidRoomId(payload.roomId)) return false;
  if (typeof payload.offer !== 'object' || payload.offer === null) return false;

  const offer = payload.offer as Record<string, unknown>;
  return typeof offer.type === 'string' && typeof offer.sdp === 'string';
}

export function isValidAnswerPayload(data: unknown): data is AnswerPayload {
  if (typeof data !== 'object' || data === null) return false;
  const payload = data as Record<string, unknown>;

  if (!isValidRoomId(payload.roomId)) return false;
  if (typeof payload.answer !== 'object' || payload.answer === null) return false;

  const answer = payload.answer as Record<string, unknown>;
  return typeof answer.type === 'string' && typeof answer.sdp === 'string';
}

export function isValidIceCandidatePayload(data: unknown): data is IceCandidatePayload {
  if (typeof data !== 'object' || data === null) return false;
  const payload = data as Record<string, unknown>;

  if (!isValidRoomId(payload.roomId)) return false;
  if (typeof payload.candidate !== 'object' || payload.candidate === null) return false;

  const candidate = payload.candidate as Record<string, unknown>;
  return typeof candidate.candidate === 'string';
}
