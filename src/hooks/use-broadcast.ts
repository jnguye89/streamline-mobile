import { useEffect, useRef, useState } from 'react';
import { PermissionsAndroid, Platform } from 'react-native';
import {
  ChannelProfileType,
  ClientRoleType,
  type IRtcEngine,
  type IRtcEngineEventHandler,
  OrientationMode,
} from 'react-native-agora';

import {
  prepareStream,
  publishStream,
  type RestreamPlatform,
  type RestreamStatus,
  sendHeartbeat,
  unpublishStream,
} from '@/data/streams';
import { getAgoraEngine } from '@/lib/agora-engine';

const HEARTBEAT_MS = 10_000;

export type BroadcastPhase = 'preparing' | 'ready' | 'starting' | 'live' | 'ending' | 'failed';

/**
 * Broadcasting from the phone's camera — the mobile counterpart of streamline-ui's stream page
 * (StreamComponent + RtcStreamService). While mounted, the camera previews and the app sits in
 * its own channel as host without publishing; goLive() starts sending, end() stops. Leaving
 * the screen while live ends the stream. Native only.
 */
export function useBroadcast() {
  const [channelName] = useState(() => `host-${Math.random().toString(36).slice(2, 15)}`);
  const [phase, setPhase] = useState<BroadcastPhase>('preparing');
  const [error, setError] = useState<string | null>(null);
  const [liveSince, setLiveSince] = useState<number | null>(null);
  const [muted, setMuted] = useState(false);
  const [restreams, setRestreams] = useState<
    { platform: RestreamPlatform; status: RestreamStatus; error?: string }[]
  >([]);
  const [attempt, setAttempt] = useState(0);

  const engine = useRef<IRtcEngine | null>(null);
  const live = useRef(false);
  const heartbeat = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopHeartbeat = () => {
    if (heartbeat.current) clearInterval(heartbeat.current);
    heartbeat.current = null;
  };

  useEffect(() => {
    let cancelled = false;
    const handler: IRtcEngineEventHandler = {
      onJoinChannelSuccess: (connection) => {
        if (connection.channelId === channelName && !cancelled) setPhase('ready');
      },
      onError: (err, msg) => console.warn('Agora error:', err, msg),
    };

    (async () => {
      try {
        if (Platform.OS === 'android') {
          const granted = await PermissionsAndroid.requestMultiple([
            PermissionsAndroid.PERMISSIONS.CAMERA,
            PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
          ]);
          if (Object.values(granted).some((g) => g !== PermissionsAndroid.RESULTS.GRANTED)) {
            throw new Error('Camera and microphone access are needed to go live.');
          }
        }

        const token = await prepareStream(channelName);
        if (cancelled) return;

        const rtc = getAgoraEngine(token.appId);
        engine.current = rtc;
        rtc.registerEventHandler(handler);
        // The app is landscape-only, so send landscape video at the web page's target size.
        rtc.setVideoEncoderConfiguration({
          dimensions: { width: 1920, height: 1080 },
          frameRate: 30,
          orientationMode: OrientationMode.OrientationModeFixedLandscape,
        });
        rtc.startPreview();
        const result = rtc.joinChannel(token.rtcToken, channelName, token.agoraUid, {
          clientRoleType: ClientRoleType.ClientRoleBroadcaster,
          channelProfile: ChannelProfileType.ChannelProfileLiveBroadcasting,
          // Joined but silent until goLive(), like the web page's join-then-publish.
          publishCameraTrack: false,
          publishMicrophoneTrack: false,
          autoSubscribeAudio: false,
          autoSubscribeVideo: false,
        });
        if (result < 0) throw new Error(`joinChannel failed with ${result}`);
      } catch (e) {
        console.warn('Couldn’t prepare the stream:', e);
        if (!cancelled) {
          setError(
            e instanceof Error && e.message.includes('Camera')
              ? e.message
              : 'The stream couldn’t be prepared. Check your connection and try again.'
          );
          setPhase('failed');
        }
      }
    })();

    return () => {
      cancelled = true;
      stopHeartbeat();
      if (live.current) {
        live.current = false;
        unpublishStream(channelName).catch((e) => console.warn('Couldn’t end the stream:', e));
      }
      const rtc = engine.current;
      if (rtc) {
        rtc.unregisterEventHandler(handler);
        rtc.updateChannelMediaOptions({ publishCameraTrack: false, publishMicrophoneTrack: false });
        rtc.stopPreview();
        rtc.leaveChannel();
        rtc.muteLocalAudioStream(false);
      }
      engine.current = null;
    };
  }, [channelName, attempt]);

  const retry = () => {
    setError(null);
    setPhase('preparing');
    setAttempt((n) => n + 1);
  };

  const goLive = async (platforms: RestreamPlatform[]) => {
    const rtc = engine.current;
    if (!rtc || phase !== 'ready') return;
    setPhase('starting');
    setError(null);
    try {
      rtc.updateChannelMediaOptions({ publishCameraTrack: true, publishMicrophoneTrack: true });
      const response = await publishStream(channelName, platforms);
      live.current = true;
      setRestreams(response.multistream ?? []);
      setLiveSince(Date.now());
      setPhase('live');

      const beat = () =>
        sendHeartbeat(channelName).catch((e) => console.warn('Stream heartbeat failed:', e));
      void beat();
      heartbeat.current = setInterval(beat, HEARTBEAT_MS);
    } catch (e) {
      console.warn('Going live failed:', e);
      rtc.updateChannelMediaOptions({ publishCameraTrack: false, publishMicrophoneTrack: false });
      setError('Going live failed. Check your connection and try again.');
      setPhase('ready');
    }
  };

  /** Stops the stream. Resolves with the recording's file name, if one was made. */
  const end = async (): Promise<string | undefined> => {
    const rtc = engine.current;
    if (!live.current) return undefined;
    setPhase('ending');
    stopHeartbeat();
    rtc?.updateChannelMediaOptions({ publishCameraTrack: false, publishMicrophoneTrack: false });
    live.current = false;
    setLiveSince(null);
    setRestreams([]);
    try {
      const { filename } = await unpublishStream(channelName);
      return filename;
    } catch (e) {
      console.warn('Couldn’t end the stream cleanly:', e);
      setError('The stream stopped here, but the server didn’t confirm it ended.');
      return undefined;
    } finally {
      setPhase('ready');
    }
  };

  const switchCamera = () => engine.current?.switchCamera();

  const toggleMute = () => {
    const next = !muted;
    engine.current?.muteLocalAudioStream(next);
    setMuted(next);
  };

  return {
    phase,
    error,
    liveSince,
    muted,
    restreams,
    goLive,
    end,
    retry,
    switchCamera,
    toggleMute,
  };
}
