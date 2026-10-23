import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import api from '../utils/api';
import QRScanner, {
  extractPatientIdFromQR,
  validateMediChainPatientQR,
} from './QRScanner';

jest.mock('../utils/api', () => ({
  __esModule: true,
  default: { post: jest.fn() },
}));
jest.mock('@zxing/library', () => ({
  BrowserQRCodeReader: jest.fn().mockImplementation(() => ({
    reset: jest.fn(),
    stopContinuousDecode: jest.fn(),
    decode: jest.fn(),
    decodeFromImageElement: jest.fn(),
  })),
}));

const patientId = 'MC-PAT-2026-ABC123';
const walletAddress = '0x1111111111111111111111111111111111111111';
const objectId = '507f1f77bcf86cd799439011';

test.each([
  ['plain patient ID', patientId, patientId],
  ['delimited QR', `MEDICHAIN|1|${patientId}`, patientId],
  ['JSON QR', JSON.stringify({ type: 'MEDICHAIN_PATIENT', patientId }), patientId],
  ['QR URL query', `https://medichain.example/patient?id=${patientId}`, patientId],
  ['QR URL path', `https://medichain.example/patient/${objectId}`, objectId],
  ['wallet address', walletAddress, walletAddress],
  ['MongoDB ObjectId', objectId, objectId],
  ['zero-width characters', `\uFEFF${patientId}\u200B`, patientId],
])('extracts %s for a common patient lookup', (_label, value, expected) => {
  expect(extractPatientIdFromQR(value)).toBe(expected);
});

test('rejects content that is not a MediChain patient identifier', () => {
  expect(extractPatientIdFromQR('https://example.com')).toBeNull();
  expect(validateMediChainPatientQR('not a patient id')).toEqual({
    valid: false,
    reason: 'Invalid MediChain Patient QR',
  });
});

const resolvedPatient = {
  success: true,
  patient: {
    patientId,
    name: 'Synthetic Patient',
    walletAddress,
  },
};

beforeEach(() => {
  api.post.mockReset();
  api.post.mockResolvedValue({ data: resolvedPatient });
});

test('manual entry resolves the normalized patient ID through the protected endpoint', async () => {
  render(<QRScanner />);

  fireEvent.click(screen.getByRole('button', { name: 'Manual' }));
  fireEvent.change(screen.getByRole('textbox'), {
    target: { value: ` ${patientId.toLowerCase()} ` },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Find Patient' }));

  await waitFor(() => {
    expect(api.post).toHaveBeenCalledWith('/doctor/resolve-patient', {
      patientId,
    });
  });
  expect(await screen.findByText('Synthetic Patient')).toBeInTheDocument();
});

test('offers profile wallet verification when protected lookup reports an unverified doctor wallet', async () => {
  const onWalletSetup = jest.fn();
  api.post.mockRejectedValueOnce({
    response: {
      data: {
        error: 'Your healthcare wallet is not linked and verified. Link and verify this wallet in your profile before requesting patient access.',
      },
    },
  });
  render(<QRScanner onWalletSetup={onWalletSetup} />);

  fireEvent.click(screen.getByRole('button', { name: 'Manual' }));
  fireEvent.change(screen.getByRole('textbox'), {
    target: { value: patientId },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Find Patient' }));

  const profileButton = await screen.findByRole('button', {
    name: 'Link & Verify Wallet in Profile',
  });
  fireEvent.click(profileButton);
  expect(onWalletSetup).toHaveBeenCalledTimes(1);
});

test('uploaded QR images resolve through the same protected patient lookup', async () => {
  const originals = {
    Image: window.Image,
    BarcodeDetector: window.BarcodeDetector,
    createObjectURL: URL.createObjectURL,
    revokeObjectURL: URL.revokeObjectURL,
  };
  window.Image = class {
    set src(value) {
      this.onload();
    }
  };
  window.BarcodeDetector = class {
    detect = jest.fn().mockResolvedValue([{ rawValue: patientId }]);
  };
  URL.createObjectURL = jest.fn(() => 'blob:qr-image');
  URL.revokeObjectURL = jest.fn();

  try {
    const { container } = render(<QRScanner />);
    fireEvent.click(screen.getByRole('button', { name: /Upload Image/i }));
    fireEvent.change(container.querySelector('input[type="file"]'), {
      target: { files: [new File(['qr'], 'patient.png', { type: 'image/png' })] },
    });

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/doctor/resolve-patient', {
        patientId,
      });
    });
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:qr-image');
  } finally {
    window.Image = originals.Image;
    if (originals.BarcodeDetector === undefined) delete window.BarcodeDetector;
    else window.BarcodeDetector = originals.BarcodeDetector;
    if (originals.createObjectURL) URL.createObjectURL = originals.createObjectURL;
    else delete URL.createObjectURL;
    if (originals.revokeObjectURL) URL.revokeObjectURL = originals.revokeObjectURL;
    else delete URL.revokeObjectURL;
  }
});

test('camera QR decoding uses the shared protected patient lookup', async () => {
  const originals = {
    mediaDevices: Object.getOwnPropertyDescriptor(navigator, 'mediaDevices'),
    BarcodeDetector: window.BarcodeDetector,
    requestAnimationFrame: window.requestAnimationFrame,
    cancelAnimationFrame: window.cancelAnimationFrame,
    play: HTMLMediaElement.prototype.play,
    pause: HTMLMediaElement.prototype.pause,
    videoWidth: Object.getOwnPropertyDescriptor(HTMLVideoElement.prototype, 'videoWidth'),
    videoHeight: Object.getOwnPropertyDescriptor(HTMLVideoElement.prototype, 'videoHeight'),
    readyState: Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, 'readyState'),
  };
  const stopTrack = jest.fn();
  const stream = {
    getVideoTracks: () => [{ stop: stopTrack }],
    getTracks: () => [{ stop: stopTrack }],
  };
  Object.defineProperty(navigator, 'mediaDevices', {
    configurable: true,
    value: { getUserMedia: jest.fn().mockResolvedValue(stream) },
  });
  window.BarcodeDetector = class {
    detect = jest.fn().mockResolvedValue([{ rawValue: patientId }]);
  };
  window.requestAnimationFrame = (callback) => window.setTimeout(() => callback(Date.now()), 0);
  window.cancelAnimationFrame = (timer) => window.clearTimeout(timer);
  HTMLMediaElement.prototype.play = jest.fn().mockResolvedValue();
  HTMLMediaElement.prototype.pause = jest.fn();
  Object.defineProperty(HTMLVideoElement.prototype, 'videoWidth', {
    configurable: true,
    get: () => 640,
  });
  Object.defineProperty(HTMLVideoElement.prototype, 'videoHeight', {
    configurable: true,
    get: () => 480,
  });
  Object.defineProperty(HTMLMediaElement.prototype, 'readyState', {
    configurable: true,
    get: () => 2,
  });

  try {
    render(<QRScanner />);
    fireEvent.click(screen.getByRole('button', { name: 'Launch Camera Scanner' }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/doctor/resolve-patient', {
        patientId,
      });
    });
    expect(stopTrack).toHaveBeenCalled();
  } finally {
    if (originals.mediaDevices) {
      Object.defineProperty(navigator, 'mediaDevices', originals.mediaDevices);
    } else {
      delete navigator.mediaDevices;
    }
    if (originals.BarcodeDetector === undefined) delete window.BarcodeDetector;
    else window.BarcodeDetector = originals.BarcodeDetector;
    if (originals.requestAnimationFrame) window.requestAnimationFrame = originals.requestAnimationFrame;
    else delete window.requestAnimationFrame;
    if (originals.cancelAnimationFrame) window.cancelAnimationFrame = originals.cancelAnimationFrame;
    else delete window.cancelAnimationFrame;
    if (originals.play) HTMLMediaElement.prototype.play = originals.play;
    else delete HTMLMediaElement.prototype.play;
    if (originals.pause) HTMLMediaElement.prototype.pause = originals.pause;
    else delete HTMLMediaElement.prototype.pause;
    if (originals.videoWidth) Object.defineProperty(HTMLVideoElement.prototype, 'videoWidth', originals.videoWidth);
    else delete HTMLVideoElement.prototype.videoWidth;
    if (originals.videoHeight) Object.defineProperty(HTMLVideoElement.prototype, 'videoHeight', originals.videoHeight);
    else delete HTMLVideoElement.prototype.videoHeight;
    if (originals.readyState) Object.defineProperty(HTMLMediaElement.prototype, 'readyState', originals.readyState);
    else delete HTMLMediaElement.prototype.readyState;
  }
});
