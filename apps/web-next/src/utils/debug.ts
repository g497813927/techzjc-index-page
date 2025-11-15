"use client";

export function triggerDebuggerListeners() {
  if (typeof window === "undefined") return;
  const keySequence = atob("dGVjaHpqYy1kZWJ1Zw==");
  let currentIndex = 0;
  document.addEventListener("keydown", (event) => {
    // Enable vconsole when user have pressed the key sequences: 'dGVjaHpqYy1kZWJ1Zw=='
    if (event.key === keySequence[currentIndex]) {
      currentIndex++;
      if (currentIndex === keySequence.length) {
        localStorage.setItem("start-debug-listener", "true");
      }
    } else {
      currentIndex = 0;
    }
  });

  // Check if device motion requires permission, if so, skip the listener and directly add the debug flag

  if (
    typeof DeviceMotionEvent !== "undefined" &&
    typeof (
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        DeviceMotionEvent as any
    ).requestPermission === "function"
  ) {
    // iOS 13+ devices
    localStorage.setItem("start-debug-listener", "true");
    return;
  }

  // Enable vconsole when user shake the device
  const shakeThreshold = 30;
  let lastX: number | null = null;
  let lastY: number | null = null;
  let lastZ: number | null = null;
  let lastTime: number | null = null;
  window.addEventListener("devicemotion", (event) => {
    const acceleration = event.accelerationIncludingGravity;
    const currentTime = new Date().getTime();
    if (lastTime === null) {
      lastTime = currentTime;
      return;
    }
    const timeDifference = currentTime - lastTime;
    if (timeDifference > 200) {
      let deltaX = 0;
      let deltaY = 0;
      let deltaZ = 0;
      if (lastX !== null && lastY !== null && lastZ !== null) {
        deltaX = Math.abs(lastX - (acceleration?.x || 0));
        deltaY = Math.abs(lastY - (acceleration?.y || 0));
        deltaZ = Math.abs(lastZ - (acceleration?.z || 0));
      }

      if (deltaX + deltaY + deltaZ > shakeThreshold) {
        localStorage.setItem("start-debug-listener", "true");
      }
      lastX = acceleration?.x || 0;
      lastY = acceleration?.y || 0;
      lastZ = acceleration?.z || 0;
      lastTime = currentTime;
    }
  });
}
