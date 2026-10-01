import { INELIGIBILITY_EVENT, PREDIABETES_BASIS } from '@penji-demos/constants';
import { Determination, Finding, ParticipantRecord, PrediabetesBasis, ProgramSession, StandardDefinition } from '@penji-demos/types';
import { calculateBmi } from './calculate-measures';

// Whether a participant counts as eligible in an evaluation, criterion by criterion.
export function evaluateEligibility(
  standard: StandardDefinition,
  participant: ParticipantRecord,
  counted: readonly ProgramSession[],
): Determination & { readonly bases: readonly PrediabetesBasis[] } {
  const { eligibility } = standard;
  const { enrollment } = participant;
  const findings: Finding[] = [];

  findings.push({
    criterion: `Age ${eligibility.minimumAgeYears} or older`,
    met: enrollment.ageYears >= eligibility.minimumAgeYears,
    detail: `${enrollment.ageYears} at enrollment`,
  });

  const minimumBmi = enrollment.identifiesAsAsian ? eligibility.minimumBmiAsian : eligibility.minimumBmi;
  const firstWeight = counted.find((session) => session.weightPounds !== null)?.weightPounds ?? null;
  const bmi = firstWeight === null ? null : calculateBmi(firstWeight, enrollment.heightInches);
  findings.push({
    criterion: `BMI ${minimumBmi} or higher${enrollment.identifiesAsAsian ? ' (Asian or Asian American)' : ''}`,
    met: bmi !== null && bmi >= minimumBmi,
    detail: bmi === null ? 'No session weight recorded, so BMI cannot be calculated' : `${bmi.toFixed(1)} from ${enrollment.heightInches} in and ${firstWeight} lb at the first weighed session`,
  });

  const bases: PrediabetesBasis[] = [
    ...(enrollment.prediabetesByBloodTest ? [PREDIABETES_BASIS.BLOOD_TEST] : []),
    ...(enrollment.prediabetesByGestationalDiabetes ? [PREDIABETES_BASIS.GESTATIONAL_DIABETES] : []),
    ...(enrollment.prediabetesByRiskTest ? [PREDIABETES_BASIS.RISK_TEST] : []),
  ];
  findings.push({
    criterion: 'Prediabetes by blood test, previous gestational diabetes or the risk test',
    met: bases.length > 0,
    detail: bases.length > 0 ? bases.map(describeBasis).join(', ') : 'No basis recorded',
  });

  findings.push({
    criterion: 'No diagnosis of type 1 or type 2 diabetes before enrollment',
    met: !enrollment.diabetesDiagnosedBeforeEnrollment,
    detail: enrollment.diabetesDiagnosedBeforeEnrollment ? 'Diagnosed before enrollment' : 'None recorded',
  });
  findings.push({
    criterion: 'Not pregnant at enrollment',
    met: !enrollment.pregnantAtEnrollment,
    detail: enrollment.pregnantAtEnrollment ? 'Pregnant at enrollment' : 'Not pregnant',
  });
  findings.push({
    criterion: 'Not recoded as ineligible during the program',
    met: participant.ineligibleSince === null,
    detail: participant.ineligibleSince
      ? `Recoded on ${participant.ineligibleSince.date} after ${participant.ineligibleSince.event === INELIGIBILITY_EVENT.PREGNANCY ? 'a pregnancy' : 'a type 2 diabetes diagnosis'}`
      : 'Still eligible',
  });

  return { met: findings.every((finding) => finding.met), findings, bases };
}

function describeBasis(basis: PrediabetesBasis): string {
  switch (basis) {
    case PREDIABETES_BASIS.BLOOD_TEST:
      return 'blood test';
    case PREDIABETES_BASIS.GESTATIONAL_DIABETES:
      return 'previous gestational diabetes';
    case PREDIABETES_BASIS.RISK_TEST:
      return 'risk test';
  }
}
