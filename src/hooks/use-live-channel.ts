import { useEffect, useState } from 'react';
import {
  ChannelProfileType,
  ClientRoleType,
  createAgoraRtcEngine,
  type IRtcEngineEventHandler,
} from 'react-native-agora';

import { getViewerToken } from '@/data/live-streams';
import { getAgoraEngine } from '@/lib/agora-engine';

/**
 * Joins an Agora channel as audience for as long as the calling component is mounted —
 * the mobile counterpart of streamline-ui's AgoraWatchService.watch()/stop().
 * Returns the uids of the hosts currently broadcasting, in join order, and which of them are
 * sending vertical video.
 */
export function useLiveChannel(channelName: string, onError: () => void) {
  const [hostUids, setHostUids] = useState<number[]>([]);
  const [verticalUids, setVerticalUids] = useState<Record<number, boolean>>({});

  useEffect(() => {
    let cancelled = false;
    let engine: ReturnType<typeof createAgoraRtcEngine> | null = null;

    const handler: IRtcEngineEventHandler = {
      onUserJoined: (connection, remoteUid) => {
        if (connection.channelId !== channelName) return;
        setHostUids((uids) => (uids.includes(remoteUid) ? uids : [...uids, remoteUid]));
      },
      onUserOffline: (connection, remoteUid) => {
        if (connection.channelId !== channelName) return;
        setHostUids((uids) => uids.filter((uid) => uid !== remoteUid));
      },
      onVideoSizeChanged: (connection, _sourceType, uid, width, height, rotation) => {
        // uid 0 is our own (unused) local video.
        if (connection.channelId !== channelName || uid === 0 || !width || !height) return;
        // Sizes are pre-rotation; a quarter turn swaps which side is longer on screen.
        const quarterTurn = rotation === 90 || rotation === 270;
        const vertical = quarterTurn ? width > height : height > width;
        setVerticalUids((current) => (current[uid] === vertical ? current : { ...current, [uid]: vertical }));
      },
      onError: (err, msg) => console.warn('Agora error:', err, msg),
    };

    (async () => {
      try {
        const { appId, rtcToken } = await getViewerToken(channelName);
        if (cancelled) return;

        engine = getAgoraEngine(appId);
        engine.registerEventHandler(handler);
        const result = engine.joinChannel(rtcToken, channelName, 0, {
          clientRoleType: ClientRoleType.ClientRoleAudience,
          channelProfile: ChannelProfileType.ChannelProfileLiveBroadcasting,
          autoSubscribeAudio: true,
          autoSubscribeVideo: true,
          publishCameraTrack: false,
          publishMicrophoneTrack: false,
        });
        if (result < 0) throw new Error(`joinChannel failed with ${result}`);
      } catch (e) {
        console.warn('Failed to watch live stream:', e);
        if (!cancelled) onError();
      }
    })();

    return () => {
      cancelled = true;
      if (engine) {
        engine.unregisterEventHandler(handler);
        engine.leaveChannel();
      }
    };
    // Join once per channel; a new onError identity shouldn't drop and rejoin the stream.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channelName]);

  return { hostUids, verticalUids };
}
