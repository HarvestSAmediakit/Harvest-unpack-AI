
/**
 * Converts raw PCM data to a WAV data URI.
 * Gemini TTS returns raw PCM (16-bit, 24kHz, mono).
 */
export const pcmToWav = (base64Pcm: string): Blob => {
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

  return new Blob([buffer], { type: 'audio/wav' });
};

export interface AudioMarker {
  title: string;
  sampleOffset: number;
}

/**
 * Enhances the audio by applying normalization, high-pass filtering, 
 * and a presence boost to make it sound more like a professional podcast.
 */
export const enhanceAudio = async (base64Pcm: string, markers?: AudioMarker[]): Promise<Blob> => {
  const binaryString = atob(base64Pcm);
  const dataSize = binaryString.length;
  const sampleCount = dataSize / 2;
  const sampleRate = 24000;

  // Create an AudioBuffer from the raw PCM
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  const audioBuffer = audioContext.createBuffer(1, sampleCount, sampleRate);
  const channelData = audioBuffer.getChannelData(0);

  const view = new DataView(new ArrayBuffer(dataSize));
  for (let i = 0; i < dataSize; i++) {
    view.setUint8(i, binaryString.charCodeAt(i));
  }

  for (let i = 0; i < sampleCount; i++) {
    // PCM 16-bit is signed, so we use getInt16
    const sample = view.getInt16(i * 2, true);
    // Normalize to [-1.0, 1.0]
    channelData[i] = sample / 32768;
  }

  // Use OfflineAudioContext for processing
  const offlineCtx = new OfflineAudioContext(1, sampleCount, sampleRate);
  const source = offlineCtx.createBufferSource();
  source.buffer = audioBuffer;

  // 1. High-pass filter (remove low-end rumble)
  const hpFilter = offlineCtx.createBiquadFilter();
  hpFilter.type = 'highpass';
  hpFilter.frequency.value = 80;

  // 2. Presence boost (boost speech clarity)
  const presenceBoost = offlineCtx.createBiquadFilter();
  presenceBoost.type = 'peaking';
  presenceBoost.frequency.value = 3000;
  presenceBoost.Q.value = 1;
  presenceBoost.gain.value = 3; // 3dB boost

  // 3. Simple Dynamics Compressor (leveling)
  const compressor = offlineCtx.createDynamicsCompressor();
  compressor.threshold.setValueAtTime(-24, offlineCtx.currentTime);
  compressor.knee.setValueAtTime(30, offlineCtx.currentTime);
  compressor.ratio.setValueAtTime(12, offlineCtx.currentTime);
  compressor.attack.setValueAtTime(0.003, offlineCtx.currentTime);
  compressor.release.setValueAtTime(0.25, offlineCtx.currentTime);

  // Connect nodes
  source.connect(hpFilter);
  hpFilter.connect(presenceBoost);
  presenceBoost.connect(compressor);
  compressor.connect(offlineCtx.destination);

  source.start(0);
  const renderedBuffer = await offlineCtx.startRendering();

  // Convert rendered AudioBuffer back to WAV
  return audioBufferToWav(renderedBuffer, markers);
};

/**
 * Converts an AudioBuffer to a WAV data URI, optionally with cue/chapter markers.
 */
function audioBufferToWav(buffer: AudioBuffer, markers?: AudioMarker[]): Blob {
  const length = buffer.length * 2;
  
  let extraSize = 0;
  let listChunkSize = 4; // "adtl"
  
  if (markers && markers.length > 0) {
    extraSize += 8 + 4 + (24 * markers.length); // cue chunk header + num cue points + cue points
    
    for (const marker of markers) {
      let textLen = marker.title.length + 1; // +1 for null terminator
      if (textLen % 2 !== 0) textLen += 1; // pad to even
      listChunkSize += 8 + 4 + textLen; // labl header + cue point ID + text
    }
    extraSize += 8 + listChunkSize; // LIST chunk header + listChunkSize
  }

  const wavBuffer = new ArrayBuffer(44 + length + extraSize);
  const view = new DataView(wavBuffer);
  const sampleRate = buffer.sampleRate;
  let offset = 0;

  // RIFF identifier
  writeString(view, offset, 'RIFF'); offset += 4;
  view.setUint32(offset, 36 + length + extraSize, true); offset += 4;
  writeString(view, offset, 'WAVE'); offset += 4;
  writeString(view, offset, 'fmt '); offset += 4;
  view.setUint32(offset, 16, true); offset += 4;
  view.setUint16(offset, 1, true); offset += 2;
  view.setUint16(offset, 1, true); offset += 2;
  view.setUint32(offset, sampleRate, true); offset += 4;
  view.setUint32(offset, sampleRate * 2, true); offset += 4;
  view.setUint16(offset, 2, true); offset += 2;
  view.setUint16(offset, 16, true); offset += 2;
  writeString(view, offset, 'data'); offset += 4;
  view.setUint32(offset, length, true); offset += 4;

  const channelData = buffer.getChannelData(0);
  for (let i = 0; i < channelData.length; i++) {
    const sample = Math.max(-1, Math.min(1, channelData[i]));
    view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
    offset += 2;
  }

  if (markers && markers.length > 0) {
    // cue chunk
    writeString(view, offset, 'cue '); offset += 4;
    view.setUint32(offset, 4 + 24 * markers.length, true); offset += 4;
    view.setUint32(offset, markers.length, true); offset += 4;
    
    for (let i = 0; i < markers.length; i++) {
      const marker = markers[i];
      view.setUint32(offset, i + 1, true); offset += 4; // ID
      view.setUint32(offset, marker.sampleOffset, true); offset += 4; // Position
      writeString(view, offset, 'data'); offset += 4; // Data Chunk ID
      view.setUint32(offset, 0, true); offset += 4; // Chunk Start
      view.setUint32(offset, 0, true); offset += 4; // Block Start
      view.setUint32(offset, marker.sampleOffset, true); offset += 4; // Sample Offset
    }
    
    // LIST chunk
    writeString(view, offset, 'LIST'); offset += 4;
    view.setUint32(offset, listChunkSize, true); offset += 4;
    writeString(view, offset, 'adtl'); offset += 4;
    
    for (let i = 0; i < markers.length; i++) {
      const marker = markers[i];
      writeString(view, offset, 'labl'); offset += 4;
      
      let textLen = marker.title.length + 1;
      const needsPadding = textLen % 2 !== 0;
      if (needsPadding) textLen += 1;
      
      view.setUint32(offset, 4 + textLen, true); offset += 4; // SubchunkSize
      view.setUint32(offset, i + 1, true); offset += 4; // Cue Point ID
      
      writeString(view, offset, marker.title); offset += marker.title.length;
      view.setUint8(offset, 0); offset += 1; // null terminator
      if (needsPadding) {
        view.setUint8(offset, 0); offset += 1; // padding
      }
    }
  }

  return new Blob([wavBuffer], { type: 'audio/wav' });
}

function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}
