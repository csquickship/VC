"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isValidRoomId = isValidRoomId;
exports.isValidJoinPayload = isValidJoinPayload;
exports.isValidOfferPayload = isValidOfferPayload;
exports.isValidAnswerPayload = isValidAnswerPayload;
exports.isValidIceCandidatePayload = isValidIceCandidatePayload;
function isValidRoomId(roomId) {
    if (typeof roomId !== 'string')
        return false;
    const trimmed = roomId.trim();
    if (trimmed.length === 0 || trimmed.length > 64)
        return false;
    return /^[a-zA-Z0-9_-]+$/.test(trimmed);
}
function isValidJoinPayload(data) {
    if (typeof data !== 'object' || data === null)
        return false;
    const payload = data;
    return isValidRoomId(payload.roomId);
}
function isValidOfferPayload(data) {
    if (typeof data !== 'object' || data === null)
        return false;
    const payload = data;
    if (!isValidRoomId(payload.roomId))
        return false;
    if (typeof payload.offer !== 'object' || payload.offer === null)
        return false;
    const offer = payload.offer;
    return typeof offer.type === 'string' && typeof offer.sdp === 'string';
}
function isValidAnswerPayload(data) {
    if (typeof data !== 'object' || data === null)
        return false;
    const payload = data;
    if (!isValidRoomId(payload.roomId))
        return false;
    if (typeof payload.answer !== 'object' || payload.answer === null)
        return false;
    const answer = payload.answer;
    return typeof answer.type === 'string' && typeof answer.sdp === 'string';
}
function isValidIceCandidatePayload(data) {
    if (typeof data !== 'object' || data === null)
        return false;
    const payload = data;
    if (!isValidRoomId(payload.roomId))
        return false;
    if (typeof payload.candidate !== 'object' || payload.candidate === null)
        return false;
    const candidate = payload.candidate;
    return typeof candidate.candidate === 'string';
}
