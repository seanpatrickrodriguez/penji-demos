import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { ACCOUNT_NAME, PAGE_STEP, POLICY, SignInStore } from '../state/sign-in-store';
import { formatSeconds } from '../view/sign-in-view';

// The clock offsets a visitor can give the built-in authenticator, in time steps.
const OFFSET_STEPS = [-2, -1, 0, 1, 2];

// A stand-in for the authenticator app on a phone: it holds the secret setup
// gave it and shows the code for its own clock.  A real app on a real phone,
// scanning the same QR code, shows the same code.
@Component({
  selector: 'app-authenticator-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './authenticator-panel.html',
  styleUrl: './authenticator-panel.scss',
})
export class AuthenticatorPanel {
  protected readonly store = inject(SignInStore);

  protected readonly view = computed(() => {
    const code = this.store.authenticatorCode();
    const secondsLeft = this.store.authenticatorSecondsLeft();
    const step = this.store.step();
    const half = Math.floor(POLICY.totp.digits / 2);
    return {
      ready: this.store.authenticatorSecret() !== null && code !== null,
      issuer: POLICY.totp.issuer,
      account: ACCOUNT_NAME,
      code: code === null ? '' : `${code.slice(0, half)} ${code.slice(half)}`,
      secondsLeft: formatSeconds(secondsLeft),
      elapsedPercent: Math.round(((POLICY.totp.periodSeconds - secondsLeft) / POLICY.totp.periodSeconds) * 100),
      timeStep: this.store.authenticatorStep(),
      spent: this.store.authenticatorCodeSpent(),
      canUse: code !== null && (step === PAGE_STEP.CONFIRM || step === PAGE_STEP.SIGN_IN),
      offsets: OFFSET_STEPS.map((steps) => {
        const seconds = steps * POLICY.totp.periodSeconds;
        return {
          seconds,
          id: `clock-${steps + OFFSET_STEPS.length}`,
          label: seconds === 0 ? 'In step with the account' : `${formatSeconds(Math.abs(seconds))} ${seconds < 0 ? 'behind' : 'ahead'}`,
          checked: this.store.clockOffsetSeconds() === seconds,
        };
      }),
      drift: `The account accepts a code from ${POLICY.totp.driftSteps} time step either side of its own, so ${formatSeconds(POLICY.totp.periodSeconds)} off still signs in and ${formatSeconds(POLICY.totp.periodSeconds * 2)} does not.`,
    };
  });

  protected setOffset(seconds: number): void {
    this.store.clockOffsetSeconds.set(seconds);
  }
}
