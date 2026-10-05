// Every organization-level metric the DPRP's requirements name.  The standard
// (M1) refers to these keys; the DPRP's metric registry maps each key to the
// function that calculates it.  A registry-drift test keeps the two in step.
export const METRIC_KEY = {
  ELIGIBLE_PARTICIPANTS: 'eligibleParticipants',
  ELIGIBLE_WITH_MINIMUM_CORE_SESSIONS: 'eligibleWithMinimumCoreSessions',
  COMPLETER_SHARE_OF_ELIGIBLE: 'completerShareOfEligible',
  RISK_REDUCTION_SHARE_OF_COMPLETERS: 'riskReductionShareOfCompleters',
  BLOOD_TEST_OR_GDM_SHARE_OF_COMPLETERS: 'bloodTestOrGdmShareOfCompleters',
  RETAINED_SHARE_AT_MONTH_4: 'retainedShareAtMonth4',
  RETAINED_SHARE_AT_MONTH_7: 'retainedShareAtMonth7',
  RETAINED_SHARE_AT_MONTH_10: 'retainedShareAtMonth10',
} as const;
