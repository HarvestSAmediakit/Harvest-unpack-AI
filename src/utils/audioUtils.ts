
import * as lamejs from '@breezystack/lamejs';

/**
 * Converts raw PCM data to a WAV data URI.
 * Gemini TTS returns raw PCM (16-bit, 24kHz, mono).
 */
export const pcmToWav = (base64Pcm: string): string => {
  const binaryString = atob(base64Pcm);
  const dataSize = binaryString.length;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  // RIFF identifier
  writeString(view, 0, 'RIFF');
  // RIFF chunk length
  view.setUint32(4, 36 + dataSize, true);
  // RIFF type
  writeString(view, 8, 'WAVE');
  // format chunk identifier
  writeString(view, 12, 'fmt ');
  // format chunk length
  view.setUint32(16, 16, true);
  // sample format (raw)
  view.setUint16(20, 1, true);
  // channel count
  view.setUint16(22, 1, true);
  // sample rate
  view.setUint32(24, 24000, true);
  // byte rate (sample rate * block align)
  view.setUint32(28, 24000 * 2, true);
  // block align (channel count * bytes per sample)
  view.setUint16(32, 2, true);
  // bits per sample
  view.setUint16(34, 16, true);
  // data chunk identifier
  writeString(view, 36, 'data');
  // data chunk length
  view.setUint32(40, dataSize, true);

  // write the PCM samples
  for (let i = 0; i < dataSize; i++) {
    view.setUint8(44 + i, binaryString.charCodeAt(i));
  }

  const blob = new Blob([buffer], { type: 'audio/wav' });
  return URL.createObjectURL(blob);
};

function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

/**
 * Converts raw PCM data to an MP3 data URI.
 * Gemini TTS returns raw PCM (16-bit, 24kHz, mono).
 */
export const pcmToMp3 = (base64Pcm: string): string => {
  const binaryString = atob(base64Pcm);
  const dataSize = binaryString.length;
  
  // Create Int16Array from binaryString
  const samples = new Int16Array(dataSize / 2);
  for (let i = 0; i < dataSize; i += 2) {
    const byte1 = binaryString.charCodeAt(i);
    const byte2 = binaryString.charCodeAt(i + 1);
    const sample = (byte2 << 8) | byte1;
    samples[i / 2] = sample >= 0x8000 ? sample - 0x10000 : sample;
  }

  // Initialize MP3 Encoder: channels, sampleRate, kbps
  const mp3encoder = new lamejs.Mp3Encoder(1, 24000, 128);
  const mp3Data: any[] = [];

  const sampleBlockSize = 1152;
  for (let i = 0; i < samples.length; i += sampleBlockSize) {
    const sampleChunk = samples.subarray(i, i + sampleBlockSize);
    const mp3buf = mp3encoder.encodeBuffer(sampleChunk);
    if (mp3buf.length > 0) {
      mp3Data.push(mp3buf);
    }
  }

  const mp3buf = mp3encoder.flush();
  if (mp3buf.length > 0) {
    mp3Data.push(mp3buf);
  }

  const blob = new Blob(mp3Data, { type: 'audio/mp3' });
  return URL.createObjectURL(blob);
};

/**
 * Converts a base64 string to a Blob URL.
 */
export const base64ToBlobUrl = (base64: string, type: string): string => {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  const blob = new Blob([bytes], { type });
  return URL.createObjectURL(blob);
};

/**
 * Masters raw PCM audio using Web Audio API (OfflineAudioContext).
 * Applies EQ, compression, and normalization for a "podcast" sound.
 */
export const masterAudio = async (base64Pcm: string, sampleRate = 24000): Promise<string> => {
  const binaryString = atob(base64Pcm);
  const len = binaryString.length;
  const samples = new Int16Array(len / 2);
  for (let i = 0; i < len; i += 2) {
    const byte1 = binaryString.charCodeAt(i);
    const byte2 = binaryString.charCodeAt(i + 1);
    const sample = (byte2 << 8) | byte1;
    samples[i / 2] = sample >= 0x8000 ? sample - 0x10000 : sample;
  }

  // Convert to Float32 for Web Audio
  const floatSamples = new Float32Array(samples.length);
  for (let i = 0; i < samples.length; i++) {
    floatSamples[i] = samples[i] / 32768;
  }

  const offlineCtx = new OfflineAudioContext(1, floatSamples.length, sampleRate);
  const source = offlineCtx.createBufferSource();
  const buffer = offlineCtx.createBuffer(1, floatSamples.length, sampleRate);
  buffer.copyToChannel(floatSamples, 0);
  source.buffer = buffer;

  // 1. High-pass filter (remove rumble)
  const hp = offlineCtx.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.value = 80;

  // 2. EQ: Remove boxiness (250Hz)
  const eqLow = offlineCtx.createBiquadFilter();
  eqLow.type = 'peaking';
  eqLow.frequency.value = 250;
  eqLow.Q.value = 1;
  eqLow.gain.value = -3;

  // 3. EQ: Presence (3.5kHz) - slightly higher for clarity
  const eqMid = offlineCtx.createBiquadFilter();
  eqMid.type = 'peaking';
  eqMid.frequency.value = 3500;
  eqMid.Q.value = 0.8;
  eqMid.gain.value = 4;

  // 4. EQ: Air (12kHz) - higher for that "premium" feel
  const eqHigh = offlineCtx.createBiquadFilter();
  eqHigh.type = 'highshelf';
  eqHigh.frequency.value = 12000;
  eqHigh.gain.value = 3;

  // 5. Dynamics Compressor (tighter for radio sound)
  const compressor = offlineCtx.createDynamicsCompressor();
  compressor.threshold.value = -20;
  compressor.knee.value = 10;
  compressor.ratio.value = 4; // 4:1 is standard for radio voice
  compressor.attack.value = 0.005;
  compressor.release.value = 0.1;

  // 6. Soft Limiter (prevent clipping)
  const limiter = offlineCtx.createDynamicsCompressor();
  limiter.threshold.value = -1.0;
  limiter.knee.value = 0;
  limiter.ratio.value = 20;
  limiter.attack.value = 0.001;
  limiter.release.value = 0.1;

  // 7. Gain (normalization)
  const gain = offlineCtx.createGain();
  gain.gain.value = 1.8;

  // Chain
  source.connect(hp);
  hp.connect(eqLow);
  eqLow.connect(eqMid);
  eqMid.connect(eqHigh);
  eqHigh.connect(compressor);
  compressor.connect(limiter);
  limiter.connect(gain);
  gain.connect(offlineCtx.destination);

  source.start(0);
  const renderedBuffer = await offlineCtx.startRendering();
  const outputData = renderedBuffer.getChannelData(0);

  // Convert back to 16-bit PCM
  const outputPcm = new Int16Array(outputData.length);
  for (let i = 0; i < outputData.length; i++) {
    const s = Math.max(-1, Math.min(1, outputData[i]));
    outputPcm[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
  }

  // Convert Int16Array to base64 string
  const uint8 = new Uint8Array(outputPcm.buffer);
  let binary = '';
  for (let i = 0; i < uint8.length; i++) {
    binary += String.fromCharCode(uint8[i]);
  }
  return btoa(binary);
};
