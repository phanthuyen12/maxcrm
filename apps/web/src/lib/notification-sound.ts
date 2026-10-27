export const NOTIFICATION_SOUND_KEY = 'zalo-crm-notification-sound';

let audioContext: AudioContext | null = null;

function getAudioContext() {
  if (typeof window === 'undefined' || !window.AudioContext) return null;
  audioContext ??= new window.AudioContext();
  return audioContext;
}

export function unlockNotificationSound() {
  const context = getAudioContext();
  if (context?.state === 'suspended') void context.resume().catch(() => undefined);
}

export function playNotificationSound() {
  if (typeof window === 'undefined' || window.localStorage.getItem(NOTIFICATION_SOUND_KEY) === 'false') return;
  const context = getAudioContext();
  if (!context) return;

  const play = () => {
    const startAt = context.currentTime;
    const oscillator = context.createOscillator();
    const volume = context.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(880, startAt);
    oscillator.frequency.exponentialRampToValueAtTime(1174.66, startAt + 0.08);
    volume.gain.setValueAtTime(0.0001, startAt);
    volume.gain.exponentialRampToValueAtTime(0.12, startAt + 0.015);
    volume.gain.exponentialRampToValueAtTime(0.0001, startAt + 0.24);
    oscillator.connect(volume);
    volume.connect(context.destination);
    oscillator.start(startAt);
    oscillator.stop(startAt + 0.25);
  };

  if (context.state === 'suspended') void context.resume().then(play).catch(() => undefined);
  else play();
}
