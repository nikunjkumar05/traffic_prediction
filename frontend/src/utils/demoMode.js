const DEMO_STEPS = [
  {
    path: "/",
    label: "Impact Dashboard",
    description: "Real-time congestion cost calculator showing city-wide impact of parking violations.",
  },
  {
    path: "/priority",
    label: "Priority Queue",
    description: "Ranked junction list sorted by actionability score — combines congestion damage, GPI, and presence probability.",
  },
  {
    path: "/cascade",
    label: "Cascade Analysis",
    description: "Domino-effect visualization showing how violations at one junction propagate to neighboring junctions.",
  },
  {
    path: "/map",
    label: "Tactical Map",
    description: "Geospatial view of all active violations, capacity status, and officer dispatch zones.",
  },
  {
    path: "/flipkart-impact",
    label: "Flipkart Delivery Impact",
    description: "Delivery bay optimization with annual savings projections, hotspot clusters, and loading window recommendations.",
  },
]

let currentStep = 0
let intervalId = null
let listeners = new Set()

function notify() {
  listeners.forEach(fn => fn(getState()))
}

export function getState() {
  return {
    step: currentStep,
    total: DEMO_STEPS.length,
    current: DEMO_STEPS[currentStep],
    isActive: intervalId !== null,
  }
}

export function subscribe(fn) {
  listeners.add(fn)
  return () => { listeners.delete(fn) }
}

export function startDemo(afterDelayMs = 3000) {
  if (intervalId) return
  currentStep = 0
  notify()
  intervalId = setInterval(() => {
    currentStep = (currentStep + 1) % DEMO_STEPS.length
    notify()
  }, afterDelayMs)
}

export function stopDemo() {
  if (!intervalId) return
  clearInterval(intervalId)
  intervalId = null
  notify()
}

export function nextStep() {
  currentStep = Math.min(currentStep + 1, DEMO_STEPS.length - 1)
  notify()
}

export function prevStep() {
  currentStep = Math.max(currentStep - 1, 0)
  notify()
}

export function goToStep(idx) {
  currentStep = Math.max(0, Math.min(idx, DEMO_STEPS.length - 1))
  notify()
}

export { DEMO_STEPS }
