class DigiMagAIPodcast extends HTMLElement {
  constructor() {
    super();
    this.issueId = this.getAttribute('issue-id');
    this.theme = this.getAttribute('theme') || 'dark';
    this.showJoin = this.getAttribute('show-join') !== 'false';
    this.room = null;
    this.audio = null;
    this.isJoined = false;
    this.listenerCount = 0;
    this.transcript = [];
    this.init();
  }

  async init() {
    this.render();
    await this.connect();
    this.startHeartbeat();
  }

  render() {
    this.innerHTML = `
      <div class="digimag-container ${this.theme}">
        <div class="status-bar">
          <span class="live-badge">● LIVE</span>
          <span class="listener-count">👂 ${this.listenerCount} listening</span>
        </div>
        <div class="player-area">
          <div class="controls-area">
            ${this.showJoin ? `<button class="join-btn">🎙️ Join conversation</button>` : ''}
            <button class="transcript-toggle">📝 Transcript</button>
          </div>
          <div class="transcript-panel" style="display:none;">
            <div class="transcript-list"></div>
          </div>
          <div class="mic-status"></div>
        </div>
        <div class="connecting-overlay" style="display:${this.room ? 'none' : 'flex'}">Connecting to live podcast...</div>
      </div>
    `;

    const style = document.createElement('style');
    style.textContent = `
      .digimag-container { font-family: system-ui; border-radius: 24px; padding: 20px; background: ${this.theme === 'dark' ? '#1a1a2e' : '#f5f5f7'}; color: ${this.theme === 'dark' ? '#fff' : '#111'}; position: relative; }
      .status-bar { display: flex; justify-content: space-between; margin-bottom: 16px; }
      .live-badge { background: #ff3366; padding: 4px 12px; border-radius: 20px; font-size: 12px; }
      .listener-count { background: #333; padding: 4px 12px; border-radius: 20px; font-size: 12px; }
      .join-btn { background: #00ff88; color: #1a1a2e; border: none; border-radius: 40px; padding: 12px 24px; cursor: pointer; font-weight: bold; margin-right: 10px; }
      .transcript-toggle { background: #444; color: white; border: none; border-radius: 40px; padding: 12px 24px; cursor: pointer; }
      .transcript-panel { margin-top: 16px; max-height: 200px; overflow-y: auto; background: rgba(0,0,0,0.2); border-radius: 12px; padding: 12px; font-size: 13px; }
      .transcript-line { margin-bottom: 8px; border-left: 3px solid #00ff88; padding-left: 10px; }
      .mic-status { margin-top: 12px; font-size: 13px; }
      .connecting-overlay { position: absolute; top:0; left:0; right:0; bottom:0; background: rgba(0,0,0,0.8); display: flex; align-items: center; justify-content: center; border-radius: 24px; }
    `;
    this.appendChild(style);

    this.joinBtn = this.querySelector('.join-btn');
    this.transcriptToggle = this.querySelector('.transcript-toggle');
    this.transcriptPanel = this.querySelector('.transcript-panel');
    this.micStatusDiv = this.querySelector('.mic-status');
    this.listenerCountSpan = this.querySelector('.listener-count');

    this.joinBtn?.addEventListener('click', () => this.joinConversation());
    this.transcriptToggle?.addEventListener('click', () => {
      const isVisible = this.transcriptPanel.style.display === 'block';
      this.transcriptPanel.style.display = isVisible ? 'none' : 'block';
    });
  }

  async connect() {
    try {
      const res = await fetch(`/api/embed/token?issueId=${this.issueId}`);
      if (!res.ok) throw new Error('Token fetch failed');
      const { token, wsUrl, roomName } = await res.json();
      const { Room } = await import('https://unpkg.com/livekit-client@2.0.0/dist/index.js');
      this.room = new Room({ adaptiveStream: true });
      this.room.on('trackSubscribed', (track, publication, participant) => {
        if (track.kind === 'audio') {
          if (!this.audio) {
            this.audio = new Audio();
            this.audio.srcObject = new MediaStream([track.mediaStreamTrack]);
            this.audio.play();
          } else {
            (this.audio.srcObject).addTrack(track.mediaStreamTrack);
          }
        }
      });
      // For transcript, we would need STT output from agent – simplified: we'll simulate via metadata (not implemented fully)
      await this.room.connect(wsUrl, token);
      document.querySelector('.connecting-overlay')?.remove();
      this.updateListenerCount();
    } catch (err) {
      this.innerHTML = `<div class="error">⚠️ ${err.message}</div>`;
    }
  }

  async updateListenerCount() {
    if (!this.room) return;
    const count = this.room.participants.size;
    this.listenerCount = count;
    if (this.listenerCountSpan) this.listenerCountSpan.innerText = `👂 ${count} listening`;
    setTimeout(() => this.updateListenerCount(), 10000);
  }

  async joinConversation() {
    if (!this.room) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      await this.room.localParticipant.publishTrack(stream.getAudioTracks()[0], { name: 'microphone', source: 1 });
      this.isJoined = true;
      this.micStatusDiv.innerHTML = '<div class="mic-active">🎤 Your microphone is live – speak freely</div>';
      if (this.joinBtn) {
        this.joinBtn.textContent = 'Leave';
        this.joinBtn.classList.remove('join-btn');
        this.joinBtn.classList.add('leave-btn');
        this.joinBtn.removeEventListener('click', this.joinConversation);
        this.joinBtn.addEventListener('click', () => this.leaveConversation());
      }
    } catch (err) {
      this.micStatusDiv.innerHTML = '<span style="color:red">❌ Microphone access denied</span>';
    }
  }

  async leaveConversation() {
    if (!this.room) return;
    const tracks = this.room.localParticipant.trackPublications;
    for (const pub of tracks.values()) {
      if (pub.kind === 'audio') await this.room.localParticipant.unpublishTrack(pub.track);
    }
    this.isJoined = false;
    this.micStatusDiv.innerHTML = '';
    if (this.joinBtn) {
      this.joinBtn.textContent = '🎙️ Join conversation';
      this.joinBtn.classList.add('join-btn');
      this.joinBtn.classList.remove('leave-btn');
      this.joinBtn.removeEventListener('click', this.leaveConversation);
      this.joinBtn.addEventListener('click', () => this.joinConversation());
    }
  }

  startHeartbeat() {
    setInterval(async () => {
      if (this.room && this.room.state === 'connected') {
        await fetch(`/api/webhooks/listener-heartbeat`, { method: 'POST', body: JSON.stringify({ issueId: this.issueId }), headers: { 'Content-Type': 'application/json' } }).catch(()=>{});
      }
    }, 60000);
  }
}

customElements.define('digimagai-podcast', DigiMagAIPodcast);
