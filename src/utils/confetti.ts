import confetti from 'canvas-confetti';

const realisticConfetti = confetti.create(undefined, {
  resize: true,
  useWorker: false,
});

const PARTICLE_COUNT = 200;
const DEFAULT_OPTIONS: confetti.Options = {
  origin: { y: 0.7 },
  disableForReducedMotion: false,
  zIndex: 2000,
};

const fire = (particleRatio: number, options: confetti.Options) => {
  void realisticConfetti({
    ...DEFAULT_OPTIONS,
    ...options,
    particleCount: Math.floor(PARTICLE_COUNT * particleRatio),
  });
};

/** Fires canvas-confetti's layered "Realistic Look" celebration. */
export const celebrateSuccess = () => {
  fire(0.25, { spread: 26, startVelocity: 55 });
  fire(0.2, { spread: 60 });
  fire(0.35, { spread: 100, decay: 0.91, scalar: 0.8 });
  fire(0.1, { spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2 });
  fire(0.1, { spread: 120, startVelocity: 45 });
};
