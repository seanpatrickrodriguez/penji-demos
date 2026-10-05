import { ChangeDetectionStrategy, Component } from '@angular/core';
import { validateFactorPolicy } from '@penji-demos/factor-engine';
import { POLICY } from '../state/sign-in-store';
import { FACTOR_LABEL, formatSeconds } from '../view/sign-in-view';

// The policy definition the whole page reads, shown as values and as written.
@Component({
  selector: 'app-policy-section',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './policy-section.html',
  styleUrl: './policy-section.scss',
})
export class PolicySection {
  protected readonly problems = validateFactorPolicy(POLICY);
  protected readonly policy = POLICY;
  protected readonly values = [
    { term: 'Factors', value: POLICY.factors.map((factor) => FACTOR_LABEL[factor]).join(' and ') },
    { term: 'Algorithm', value: `HMAC-${POLICY.totp.algorithm}` },
    { term: 'Code length', value: `${POLICY.totp.digits} digits` },
    { term: 'Time step', value: formatSeconds(POLICY.totp.periodSeconds) },
    { term: 'Drift window', value: `${POLICY.totp.driftSteps} step either side` },
    { term: 'Secret', value: `${POLICY.totp.secretBytes} random bytes` },
    { term: 'Recovery codes', value: `${POLICY.recoveryCode.count}, each ${POLICY.recoveryCode.groupCount} groups of ${POLICY.recoveryCode.groupLength}` },
    { term: 'Lockout', value: `After ${POLICY.attempts.maxFailedAttempts} failed codes in a row, for ${formatSeconds(POLICY.attempts.lockoutSeconds)}` },
  ];
  protected readonly json = JSON.stringify(POLICY, null, 2);
}
