import qrcode from 'qrcode-generator';

// The QR code an authenticator app scans, as one SVG path of dark modules.
// Medium error correction, and the four-module quiet zone the QR standard asks for.
const QUIET_ZONE = 4;

export interface QrCodeView {
  readonly viewBox: string;
  readonly path: string;
}

export function resolveQrCode(text: string): QrCodeView {
  const code = qrcode(0, 'M');
  code.addData(text, 'Byte');
  code.make();
  const count = code.getModuleCount();
  const size = count + QUIET_ZONE * 2;
  let path = '';
  for (let row = 0; row < count; row += 1) {
    for (let column = 0; column < count; column += 1) {
      if (code.isDark(row, column)) path += `M${column + QUIET_ZONE} ${row + QUIET_ZONE}h1v1h-1z`;
    }
  }
  return { viewBox: `0 0 ${size} ${size}`, path };
}
