import type { Point, SceneSize } from "@/lib/utils/geometry";

export const SPLINE_CELEBRATION_START = "spline-celebration-start";
export const SPLINE_CELEBRATION_END = "spline-celebration-end";

const GOVERNA_AUDIO_SRC = "/governa.mp3";
const VIEWPORT_FILL_RATIO = 0.8;
export const CELEBRATION_RESTORE_DELAY_MS = 2_000;

let celebrationAudio: HTMLAudioElement | null = null;
let restoreTimer: ReturnType<typeof setTimeout> | null = null;

function clearRestoreTimer() {
  if (restoreTimer) {
    clearTimeout(restoreTimer);
    restoreTimer = null;
  }
}

function scheduleCelebrationRestore() {
  clearRestoreTimer();
  restoreTimer = setTimeout(() => {
    restoreTimer = null;
    window.dispatchEvent(new CustomEvent(SPLINE_CELEBRATION_END));
    celebrationAudio = null;
  }, CELEBRATION_RESTORE_DELAY_MS);
}

export function computeCelebrationSceneSize(
  base: SceneSize,
  viewport = { width: window.innerWidth, height: window.innerHeight },
): SceneSize {
  const aspect = base.width / base.height;
  const maxW = viewport.width * VIEWPORT_FILL_RATIO;
  const maxH = viewport.height * VIEWPORT_FILL_RATIO;

  let width = maxW;
  let height = width / aspect;

  if (height > maxH) {
    height = maxH;
    width = height * aspect;
  }

  return {
    width: Math.round(width),
    height: Math.round(height),
  };
}

export function computeCelebrationCenterPosition(
  size: SceneSize,
  viewport = { width: window.innerWidth, height: window.innerHeight },
): Point {
  return {
    x: Math.round((viewport.width - size.width) / 2),
    y: Math.round((viewport.height - size.height) / 2),
  };
}

export function triggerSplineCelebration(baseSize?: SceneSize): void {
  if (typeof window === "undefined") return;

  window.dispatchEvent(
    new CustomEvent(SPLINE_CELEBRATION_START, {
      detail: baseSize ? { baseSize } : undefined,
    }),
  );

  clearRestoreTimer();

  if (celebrationAudio) {
    celebrationAudio.pause();
    celebrationAudio = null;
  }

  const audio = new Audio(GOVERNA_AUDIO_SRC);
  audio.volume = 0.65;
  celebrationAudio = audio;

  const onAudioEnd = () => {
    window.dispatchEvent(new CustomEvent("audio-stop"));
    scheduleCelebrationRestore();
  };

  const onAudioError = () => {
    window.dispatchEvent(new CustomEvent("audio-stop"));
    scheduleCelebrationRestore();
  };

  audio.addEventListener("ended", onAudioEnd, { once: true });
  audio.addEventListener("error", onAudioError, { once: true });

  audio
    .play()
    .then(() => {
      window.dispatchEvent(new CustomEvent("audio-play"));
    })
    .catch(() => {
      window.dispatchEvent(new CustomEvent("audio-play"));
      onAudioError();
    });
}
