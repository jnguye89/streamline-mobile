import { ChannelProfileType, createAgoraRtcEngine } from 'react-native-agora';

let initializedAppId: string | null = null;

/**
 * The app's one Agora engine — shared by watching and broadcasting — initialized lazily with
 * whatever app id the API hands out. Native only: the web build never imports this.
 */
export function getAgoraEngine(appId: string) {
  const engine = createAgoraRtcEngine();
  if (initializedAppId !== appId) {
    if (initializedAppId) engine.release();
    engine.initialize({ appId, channelProfile: ChannelProfileType.ChannelProfileLiveBroadcasting });
    // Audience members need video enabled to receive video, and hosts to send it.
    engine.enableVideo();
    initializedAppId = appId;
  }
  return engine;
}
