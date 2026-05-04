// embed.js
class DigiMagAIPodcast extends HTMLElement {
  constructor() {
    super();
    this.issueId = this.getAttribute('issue-id');
    this.theme = this.getAttribute('theme') || 'dark';
    this.showJoin = this.getAttribute('show-join') !== 'false';
    this.room = null;
    this.audio = null;
    this.isJoined = false;
  }

  async connectedCallback() {
    this.render();
    await this.connectToPodcast();
  }

  render() {
    this.innerHTML = `
      <div class="digimag-container ${this.theme}">
        <div class="status-area">
          <div class="connecting">Connecting to live podcast...</div>
        </div>
        <div class="controls-area" style="display:none">
          <div class="live-badge">● LIVE</div>
          ${this.showJoin ? '<button class="join-btn">🎙️ Join conversation</button>' : ''}
          <div class="mic-status"></div>
        </div>
      </div>
    `;

    const style = document.createElement('style');
    style.textContent = `
      .digimag-container {
        font-family: system-ui;
        border-radius: 24px;
        padding: 20px;
        background: ${this.theme === 'dark' ? '#1a1a2e' : '#f5f5f7'};
        color: ${this.theme === 'dark' ? '#fff' : '#111'};
      }
      .live-badge {
        background: #ff3366;
        color: white;
        font-size: 12px;
        padding: 4px 12px;
        border-radius: 20px;
        display: inline-block;
        margin-bottom: 16px;
      }
      .join-btn {
        background: #00ff88;
        color: #1a1a2e;
        border: none;
        border-radius: 40px;
        padding: 12px 24px;
        cursor: pointer;
        font-weight: bold;
      }
      .mic-active {
        margin-top: 12px;
        font-size: 13px;
        opacity: 0.8;
        animation: pulse 1s infinite;
      }
      @keyframes pulse {
        0% { opacity: 0.6; }
        100% { opacity: 1; }
      }
    `;
    this.appendChild(style);
  }

  async connectToPodcast() {
    const container = this.querySelector('.digimag-container');
    const statusDiv = container.querySelector('.status-area');
    const controlsDiv = container.querySelector('.controls-area');
    try {
      // In production, this domain should be dynamic or match the origin where backend is hosted
      // For AI Studio, we fetch relatively because it might be hosted together
      // But this embed is used cross-domain, so users will update this URL later
      // We'll use absolute path with current window location for demo purpose
      
      const baseUrl = window.DIGIMAGAI_BACKEND_URL || '';
      const res = await fetch(`${baseUrl}/api/embed/token?issueId=${this.issueId}`);
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
            const stream = this.audio.srcObject;
            stream.addTrack(track.mediaStreamTrack);
          }
        }
      });
      await this.room.connect(wsUrl, token);
      statusDiv.style.display = 'none';
      controlsDiv.style.display = 'block';

      // Join button listener
      const joinBtn = controlsDiv.querySelector('.join-btn');
      if (joinBtn) {
        joinBtn.addEventListener('click', () => this.joinConversation());
      }
    } catch (err) {
      statusDiv.innerHTML = `<div class="error">⚠️ ${err.message}</div>`;
    }
  }

  async joinConversation() {
    if (!this.room) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      await this.room.localParticipant.publishTrack(stream.getAudioTracks()[0], {
        name: 'microphone',
        source: 'microphone',
      });
      this.isJoined = true;
      const micStatus = this.querySelector('.mic-status');
      if (micStatus) micStatus.innerHTML = '<div class="mic-active">Your microphone is live – speak freely</div>';
      const joinBtn = this.querySelector('.join-btn');
      if (joinBtn) {
        joinBtn.textContent = 'Leave';
        joinBtn.classList.remove('join-btn');
        joinBtn.classList.add('leave-btn');
        joinBtn.removeEventListener('click', this.joinConversation);
        joinBtn.addEventListener('click', () => this.leaveConversation());
      }
    } catch (err) {
      alert('Could not access microphone. Please allow mic permissions.');
    }
  }

  async leaveConversation() {
    if (!this.room) return;
    const tracks = this.room.localParticipant.trackPublications;
    for (const pub of tracks.values()) {
      if (pub.kind === 'audio') await this.room.localParticipant.unpublishTrack(pub.track);
    }
    this.isJoined = false;
    const micStatus = this.querySelector('.mic-status');
    if (micStatus) micStatus.innerHTML = '';
    const btn = this.querySelector('.leave-btn');
    if (btn) {
      btn.textContent = '🎙️ Join conversation';
      btn.classList.remove('leave-btn');
      btn.classList.add('join-btn');
      btn.removeEventListener('click', this.leaveConversation);
      btn.addEventListener('click', () => this.joinConversation());
    }
  }
}

customElements.define('digimagai-podcast', DigiMagAIPodcast);
