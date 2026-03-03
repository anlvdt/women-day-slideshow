/**
 * FallingPetals — CSS animation-based petal rain effect
 * Creates petal elements with random properties that use CSS keyframes for animation.
 */

/**
 * Creates falling petal elements inside the given container.
 * Each petal gets random position, duration, delay, and size.
 * CSS classes .petal handle the animation (petalFall + petalSway keyframes).
 *
 * @param {HTMLElement} container - The DOM element to append petals to
 * @param {number} [petalCount=30] - Number of petal elements to create
 */
export function startPetalRain(container, petalCount = 30) {
  const SHAPES = 3; // number of petal--shape variants in CSS
  for (let i = 0; i < petalCount; i++) {
    const petal = document.createElement("div");
    petal.classList.add("petal", `petal--shape${Math.floor(Math.random() * SHAPES)}`);

    const startX = Math.random() * 100;
    const duration = 4 + Math.random() * 6;
    const delay = Math.random() * 8;
    const size = 12 + Math.random() * 18;
    const initialRotation = Math.floor(Math.random() * 360);
    const opacity = 0.5 + Math.random() * 0.4;

    const swayDuration = 2 + Math.random() * 3;

    petal.style.cssText = `
      left: ${startX}%;
      animation-duration: ${duration}s, ${swayDuration}s;
      animation-delay: ${delay}s;
      width: ${size}px;
      height: ${size}px;
      opacity: ${opacity};
      transform: rotate(${initialRotation}deg);
    `;

    container.appendChild(petal);
  }
}

/**
 * Stop petal rain and remove all petal elements from the container.
 * @param {HTMLElement} container - The DOM element containing petals
 */
export function stopPetalRain(container) {
  const petals = container.querySelectorAll(".petal");
  petals.forEach(p => p.remove());
}
