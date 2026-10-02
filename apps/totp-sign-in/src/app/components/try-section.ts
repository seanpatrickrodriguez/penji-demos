import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FACTOR_KIND, VERIFICATION_OUTCOME } from '@penji-demos/constants';
import { FactorKind } from '@penji-demos/types';
import { ACCOUNT_NAME, PAGE_STEP, POLICY, SignInStore } from '../state/sign-in-store';
import { resolveQrCode } from '../view/qr-code';
import { FACTOR_LABEL, describeVerification, formatSeconds, formatSecret } from '../view/sign-in-view';
import { AuthenticatorPanel } from './authenticator-panel';
import { CodeForm } from './code-form';

const PROGRESS = [
  { step: PAGE_STEP.SET_UP, label: 'Set up' },
  { step: PAGE_STEP.CONFIRM, label: 'Confirm a code' },
  { step: PAGE_STEP.SAVE_CODES, label: 'Save recovery codes' },
  { step: PAGE_STEP.SIGN_IN, label: 'Sign in' },
];

@Component({
  selector: 'app-try-section',
  imports: [AuthenticatorPanel, CodeForm],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './try-section.html',
  styleUrl: './try-section.scss',
})
export class TrySection {
  protected readonly store = inject(SignInStore);
  protected readonly steps = PAGE_STEP;
  protected readonly factors = [FACTOR_KIND.TOTP, FACTOR_KIND.RECOVERY_CODE].map((kind) => ({ kind, label: FACTOR_LABEL[kind], id: `factor-${kind}` }));
  protected readonly factor = signal<FactorKind>(FACTOR_KIND.TOTP);
  protected readonly isRecovery = computed(() => this.factor() === FACTOR_KIND.RECOVERY_CODE);

  protected readonly view = computed(() => {
    const step = this.store.step();
    const position = PROGRESS.findIndex((item) => item.step === step);
    const current = position < 0 ? PROGRESS.length : position;
    const uri = this.store.otpauthUri();
    const secret = this.store.setupSecret();
    const latest = this.store.latest();
    const account = this.store.account();
    const lockedUntil = account?.attempts.lockedUntil ?? null;
    return {
      step,
      accountName: ACCOUNT_NAME,
      progress: PROGRESS.map((item, index) => ({ label: item.label, done: index < current, current: index === current })),
      qr: uri === null ? null : resolveQrCode(uri),
      secret: secret === null ? '' : formatSecret(secret),
      details: [
        { term: 'Issuer', value: POLICY.totp.issuer },
        { term: 'Account', value: ACCOUNT_NAME },
        { term: 'Algorithm', value: `HMAC-${POLICY.totp.algorithm}` },
        { term: 'Digits', value: String(POLICY.totp.digits) },
        { term: 'Time step', value: formatSeconds(POLICY.totp.periodSeconds) },
      ],
      recoveryCodes: this.store.recoveryCodes() ?? [],
      message: latest === null ? '' : describeVerification(POLICY, latest),
      accepted: latest?.outcome === VERIFICATION_OUTCOME.ACCEPTED,
      locked: this.store.lockedOut() && lockedUntil !== null ? `Sign-in opens again in ${formatSeconds(Math.max(0, lockedUntil - this.store.now()))}.` : '',
      digits: POLICY.totp.digits,
      recoveryShape: `${POLICY.recoveryCode.groupCount} groups of ${POLICY.recoveryCode.groupLength} letters and numbers, as written when you saved them.`,
    };
  });

  protected chooseFactor(kind: FactorKind): void {
    this.factor.set(kind);
  }
}
