let onboardingOpenedFromApp = false;

export function allowOnboardingEntry() {
  onboardingOpenedFromApp = true;
}

export function resetOnboardingEntry() {
  onboardingOpenedFromApp = false;
}

export function canOpenOnboarding() {
  return onboardingOpenedFromApp;
}
