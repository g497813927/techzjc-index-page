import QRCode from 'qrcode';

export async function createSharableQrCode(text: string): Promise<string | null> {
  if (text.length === 0) return null;

  try {
    // Let the encoder account for numeric/alphanumeric modes and UTF-8 byte size.
    return await QRCode.toDataURL(text, {
      margin: 1,
      width: 128,
      color: { light: '#ffffff00' },
    });
  } catch (error) {
    // qrcode exposes no typed capacity error. Do not misclassify renderer failures.
    if (error instanceof Error &&
        error.message === 'The amount of data is too big to be stored in a QR Code') {
      return null;
    }
    throw error;
  }
}
