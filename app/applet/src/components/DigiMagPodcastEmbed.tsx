import React, { useEffect, useRef, useState } from 'react';
import { Room, RoomEvent, Track, RemoteParticipant } from 'livekit-client';

interface Props {
  issueId: string;
  theme?: 'light' | 'dark';
  showJoinButton?: boolean;
  onListen?: () => void;
  onJoin?: () => void;
}

export const DigiMagPodcastEmbed: React.FC<Props> = ({
  issueId,
  theme = 'dark',
  showJoinButton = true,
  onListen,
  onJoin,
}) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isJoined, setIsJoined] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const roomRef = useRef<Room | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // 1. Connect to LiveKit room (passive listen)
  useEffect(() => {
    let mounted = true;
    const connect = async () => {
      try {
        // Fetch token from backend
        const res = await fetch(`/api/embed/token?issueId=${issueId}`);
        if (!res.ok) throw new Error('Failed to get token');
        const { token, wsUrl, roomName } = await res.json();

        const room = new Room({
          adaptiveStream: true,
          dynacast: true,
        });

        room.on(RoomEvent.TrackSubscribed, (track, publication, participant) => {
          if (track.kind === Track.Kind.Audio) {
            if (!audioRef.current) {
              const audio = new Audio();
              audio.srcObject = new MediaStream([track.mediaStreamTrack]);
              audio.play().catch(console.warn);
              audioRef.current = audio;
            } else {
              const stream = audioRef.current.srcObject as MediaStream;
              stream.addTrack(track.mediaStreamTrack);
            }
          }
        });

        await room.connect(wsUrl, token);
        roomRef.current = room;
        if (mounted) {
          setIsConnected(true);
          onListen?.();
        }
      } catch (err) {
        console.error(err);
        if (mounted) setError(err instanceof Error ? err.message : 'Connection failed');
      }
    };
    connect();

    return () => {
      mounted = false;
      roomRef.current?.disconnect();
      audioRef.current?.pause();
      audioRef.current = null;
    };
  }, [issueId, onListen]);

  // 2. Join conversation (publish microphone)
  const joinConversation = async () => {
    if (!roomRef.current) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      await roomRef.current.localParticipant.publishTrack(stream.getAudioTracks()[0], {
        name: 'microphone',
        source: Track.Source.Microphone,
      });
      setIsJoined(true);
      onJoin?.();
    } catch (err) {
      console.error('Mic access denied or error:', err);
      setError('Could not access microphone. Please allow mic permissions.');
    }
  };

  const leaveConversation = async () => {
    if (!roomRef.current) return;
    const tracks = roomRef.current.localParticipant.trackPublications;
    for (const pub of tracks.values()) {
      if (pub.kind === Track.Kind.Audio) {
        await roomRef.current.localParticipant.unpublishTrack(pub.track as any); // Cast as any if typing disagrees
      }
    }
    setIsJoined(false);
  };

  if (error) {
    return <div className={`error ${theme}`}>⚠️ {error}</div>;
  }

  return (
    <div className={`digimag-podcast ${theme}`}>
      <div className="player-status">
        {!isConnected ? (
          <div className="connecting">Connecting to live podcast...</div>
        ) : (
          <>
            <div className="live-badge">● LIVE</div>
            {showJoinButton && (
              <div className="join-controls">
                {!isJoined ? (
                  <button onClick={joinConversation} className="join-btn">
                    🎙️ Join conversation
                  </button>
                ) : (
                  <button onClick={leaveConversation} className="leave-btn">
                    Leave
                  </button>
                )}
              </div>
            )}
            {isJoined && (
              <div className="mic-active">Your microphone is live – speak freely</div>
            )}
          </>
        )}
      </div>
      <style>{`
        .digimag-podcast {
          font-family: system-ui, -apple-system, sans-serif;
          border-radius: 24px;
          padding: 20px;
          background: ${theme === 'dark' ? '#1a1a2e' : '#f5f5f7'};
          color: ${theme === 'dark' ? '#fff' : '#111'};
          box-shadow: 0 8px 20px rgba(0,0,0,0.1);
        }
        .live-badge {
          display: inline-block;
          background: #ff3366;
          color: white;
          font-size: 12px;
          font-weight: bold;
          padding: 4px 12px;
          border-radius: 20px;
          margin-bottom: 16px;
        }
        .join-btn {
          background: #00ff88;
          color: #1a1a2e;
          border: none;
          border-radius: 40px;
          padding: 12px 24px;
          font-weight: bold;
          cursor: pointer;
          transition: transform 0.1s;
        }
        .join-btn:hover {
          transform: scale(1.02);
        }
        .leave-btn {
          background: #444;
          color: white;
          border: none;
          border-radius: 40px;
          padding: 12px 24px;
          cursor: pointer;
        }
        .mic-active {
          margin-top: 12px;
          font-size: 13px;
          opacity: 0.8;
          animation: pulse 1.5s infinite;
        }
        @keyframes pulse {
          0% { opacity: 0.6; }
          100% { opacity: 1; }
        }
        .error {
          padding: 20px;
          background: #ffeeee;
          color: #cc0000;
          border-radius: 24px;
        }
      `}</style>
    </div>
  );
};
