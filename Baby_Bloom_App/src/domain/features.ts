// Clinical capabilities are opt-in only after the spec's independent reviews.
export const features = {
  coreTracking: true,
  dailyCheckins: false,
  symptoms: false,
  photos: false,
  growthPercentiles: false,
  vaccineScheduling: false,
  personalizedClinicalRules: false,
} as const;
export const clinicalContent = {
  reviewStatus: 'REQUIRES_REVIEW',
  enabled: false,
  source: 'https://www.aap.org/en/patient-care/safe-sleep/',
} as const;
