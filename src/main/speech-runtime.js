import {
  normalizeShortSpeechEvents,
  validateSpeechPlan,
} from "./speech-plan.js";

const CROSSFADE_HALF_WIDTH_US = 40_000;

// Convert an audio-clock SpeechPlan to language-independent atlas operations.
// Decoding/compositing is deliberately kept behind a browser adapter.
export function buildSpeechSchedule(plan, { availableKeys } = {}) {
  const validation = validateSpeechPlan(plan);
  if (!validation.ok) throw new TypeError(`invalid SpeechPlan: ${validation.errors.join("; ")}`);

  const events = normalizeShortSpeechEvents(plan.events);
  const available = availableKeys === undefined ? null : new Set(availableKeys);
  const transitions = [];
  const M = events.length - 1;

  for (let index = 1; index < events.length; index++) {
    const previous = events[index - 1];
    const current = events[index];
    const pairKey = `${previous.unit}>${current.unit}`;
    const next = events[index + 1];
    const contextKey = next ? `${previous.unit}>${current.unit}>${next.unit}` : null;
    const key = contextKey && available?.has(contextKey) ? contextKey : pairKey;
    if (available && !available.has(key)) throw new Error(`missing atlas unit: ${key}`);
    const boundaryUs = current.start_us;

    // 소유 창: 앞 경계와의 중간점부터 다음 경계와의 중간점까지 (첫 전이는 오디오 시작 0, 마지막은 duration_us)
    const tIdx = index - 1;
    const prevBoundaryUs = tIdx === 0 ? 0 : events[index - 1].start_us;
    const nextBoundaryUs = tIdx === M - 1 ? plan.audio.duration_us : events[index + 1].start_us;
    const prevMid = tIdx === 0 ? 0 : Math.round((prevBoundaryUs + boundaryUs) / 2);
    const nextMid = tIdx === M - 1 ? plan.audio.duration_us : Math.round((boundaryUs + nextBoundaryUs) / 2);
    const allocatedDurationUs = nextMid - prevMid;

    // 할당 구간이 80ms보다 짧으면 playback rate를 최대 2배로 올린다 (프레임 간격 40ms/rate)
    const rate = allocatedDurationUs < 80_000 ? Math.min(2.0, 80_000 / allocatedDurationUs) : 1.0;
    const frameIntervalUs = Math.round(40_000 / rate);
    const frameTimesUs = Object.freeze([-2, -1, 0, 1, 2].map((k) => boundaryUs + k * frameIntervalUs));

    transitions.push({
      key,
      previous_unit: previous.unit,
      current_unit: current.unit,
      boundary_us: boundaryUs,
      frame_times_us: frameTimesUs,
      frames: 5,
      fps: 25,
      rate,
      frame_interval_us: frameIntervalUs,
      window_start_us: frameTimesUs[0],
      window_end_us: frameTimesUs[4],
    });
  }

  return {
    version: "1",
    audio_sha256: plan.audio.sha256,
    duration_us: plan.audio.duration_us,
    quality_mode: plan.quality_mode,
    events,
    transitions,
  };
}

// HTTP callers translate start/end to Range: bytes=start-end. Local callers
// use Blob.slice(start, end + 1). Only the first two unique units are primed.
export function prefetchSpeechRanges(schedule, atlasIndex, limit = 2) {
  if (!schedule || !Array.isArray(schedule.transitions))
    throw new TypeError("schedule.transitions is required");
  if (!atlasIndex || atlasIndex.version !== "1" || !atlasIndex.entries)
    throw new TypeError("atlas index v1 is required");
  if (!Number.isSafeInteger(limit) || limit < 0) throw new TypeError("limit must be a non-negative integer");

  const ranges = [];
  const seen = new Set();
  for (const transition of schedule.transitions) {
    if (ranges.length >= limit) break;
    if (seen.has(transition.key)) continue;
    seen.add(transition.key);
    const entry = atlasIndex.entries[transition.key];
    if (!entry) throw new Error(`missing atlas index entry: ${transition.key}`);
    if (!Number.isSafeInteger(entry.offset) || entry.offset < 0
      || !Number.isSafeInteger(entry.length) || entry.length <= 0)
      throw new TypeError(`invalid atlas byte range: ${transition.key}`);
    ranges.push({
      key: transition.key,
      start: entry.offset,
      end: entry.offset + entry.length - 1,
    });
  }
  return ranges;
}

function transitionFrame(transition, timeUs) {
  const frame = Math.round((timeUs - transition.frame_times_us[0]) / transition.frame_interval_us);
  return Math.max(0, Math.min(4, frame));
}

function makeUnitLayer(key, frame, opacity, fallbackKey, fallbackFrame, index) {
  const layer = { key, frame, opacity };
  Object.defineProperties(layer, {
    fallbackKey: { value: fallbackKey, writable: true, configurable: true, enumerable: false },
    fallbackFrame: { value: fallbackFrame ?? 4, writable: true, configurable: true, enumerable: false },
    index: { value: index, writable: true, configurable: true, enumerable: false },
  });
  return layer;
}

// Resolve the atlas layers for one audio-clock instant.
// (가) 인접 경계 창이 실제로 겹칠 때만 두 경계 중간에서 정확히 2프레임 raised-cosine 교차 혼합
// (나) 창 밖 남는 음소 구간은 현재 단위의 중앙 프레임(index 2) 유지 (단위 키 없는 구형 atlas 호환 fallback 포함)
export function resolveSpeechLayers(schedule, timeUs) {
  if (!schedule || !Array.isArray(schedule.transitions))
    throw new TypeError("schedule.transitions is required");
  if (!Number.isSafeInteger(timeUs) || timeUs < 0)
    throw new TypeError("timeUs must be a non-negative safe integer");
  const transitions = schedule.transitions;
  if (!transitions.length || timeUs < transitions[0].window_start_us) return [];

  for (let index = 0; index < transitions.length - 1; index++) {
    const left = transitions[index];
    const right = transitions[index + 1];
    const overlaps = left.window_end_us > right.window_start_us;

    if (overlaps) {
      const midpoint = Math.round((left.boundary_us + right.boundary_us) / 2);
      const start = midpoint - CROSSFADE_HALF_WIDTH_US;
      const end = midpoint + CROSSFADE_HALF_WIDTH_US;
      if (timeUs < start) {
        return [{ index, key: left.key, frame: transitionFrame(left, timeUs), opacity: 1 }];
      }
      if (timeUs <= end) {
        const progress = Math.max(0, Math.min(1, (timeUs - start) / (end - start)));
        const rightOpacity = (1 - Math.cos(Math.PI * progress)) / 2;
        return [
          { index, key: left.key, frame: transitionFrame(left, timeUs), opacity: 1 - rightOpacity },
          { index: index + 1, key: right.key, frame: transitionFrame(right, timeUs), opacity: rightOpacity },
        ].filter((layer) => layer.opacity > 0);
      }
    } else {
      // 비중첩: left 창 안
      if (timeUs <= left.window_end_us) {
        return [{ index, key: left.key, frame: transitionFrame(left, timeUs), opacity: 1 }];
      }
      // 비중첩: 창 밖 남는 구간 -> 현재 단위 중앙 프레임(index 2) 유지 (구형 atlas는 left.key frame 4 fallback)
      if (timeUs < right.window_start_us) {
        return [makeUnitLayer(left.current_unit, 2, 1, left.key, 4, index)];
      }
    }
  }

  const index = transitions.length - 1;
  const transition = transitions[index];
  if (timeUs <= transition.window_end_us) {
    return [{ index, key: transition.key, frame: transitionFrame(transition, timeUs), opacity: 1 }];
  }
  // 마지막 전이 창 밖 남는 구간 -> 현재 단위 중앙 프레임(index 2) 유지 (구형 atlas는 transition.key frame 4 fallback)
  return [makeUnitLayer(transition.current_unit, 2, 1, transition.key, 4, index)];
}

export class SpeechPlaybackState {
  constructor(getState, setState) {
    if (typeof getState !== "function" || typeof setState !== "function")
      throw new TypeError("getState and setState callbacks are required");
    this.getState = getState;
    this.setState = setState;
    this.sequence = 0;
    this.active = null;
    this.lastOutcome = null;
  }

  begin(speakingState) {
    const token = Object.freeze({ id: ++this.sequence });
    const original = this.active?.original ?? this.getState();
    this.active = { token, original };
    this.setState(speakingState);
    return token;
  }

  settle(token, outcome) {
    if (!this.active || token?.id !== this.active.token.id) return false;
    if (!new Set(["complete", "cancel", "error"]).has(outcome))
      throw new TypeError("outcome must be complete, cancel, or error");
    const { original } = this.active;
    this.active = null;
    this.lastOutcome = outcome;
    this.setState(original);
    return true;
  }
}
