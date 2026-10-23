import { useEffect, useState } from 'react';
import {
  ChannelProfileType,
  ClientRoleType,
  createAgoraRtcEngine,
  type IRtcEngineEventHandler,
} from 'react-native-agora';

import { getViewerToken } from '@/data/live-streams';

let initializedAppId: string | null = null;

// One engine for the whole app, initialized lazily with whatever app id the API hands out.
function getEngine(appId: string) {
  const engine = createAgoraRtcEngine();
  if (initializedAppId !== appId) {
    if (initializedAppId) engine.release();
    engine.initialize({ appId, channelProfile: ChannelProfileType.ChannelProfileLiveBroadcasting });
    // Audience members still need video enabled to receive the host's video.
    engine.enableVideo();
    initializedAppId = appId;
  }
  return engine;
}

/**
 * Joins an Agora channel as audience for as long as the calling component is mounted —
 * the mobile counterpart of streamline-ui's AgoraWatchService.watch()/stop().
 * Returns the uids of the hosts currently broadcasting, in join order.
 */
export function useLiveChannel(channelName: string, onError: () => void) {
  const [hostUids, setHostUids] = useState<number[]>([]);

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
      onError: (err, msg) => console.warn('Agora error:', err, msg),
    };

    (async () => {
      try {
        const { appId, rtcToken } = await getViewerToken(channelName);
        if (cancelled) return;

        engine = getEngine(appId);
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

  return hostUids;
}
