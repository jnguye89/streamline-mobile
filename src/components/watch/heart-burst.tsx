import { SymbolView } from 'expo-symbols';
import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

const SIZE = 96;

/** The red used for anything "liked": this burst and the filled like icon. */
export const LikeColor = '#FF3B5C';

type HeartBurstProps = {
  /** Where the double tap landed, in the page's coordinates. */
  x: number;
  y: number;
  onDone: () => void;
};

/** The heart that pops up under your finger on a double-tap like, then fades away. */
export function HeartBurst({ x, y, onDone }: HeartBurstProps) {
  const scale = useSharedValue(0);
  const opacity = useSharedValue(1);

  useEffect(() => {
    scale.set(withSequence(withSpring(1.2, { damping: 8, stiffness: 300 }), withTiming(1, { duration: 120 })));
    opacity.set(
      withDelay(
        500,
        withTiming(0, { duration: 250 }, (finished) => {
          if (finished) scheduleOnRN(onDone);
        })
      )
    );
    // Runs once per burst; each new double tap mounts a fresh one.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.get(),
    transform: [{ scale: scale.get() }],
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.heart, { left: x - SIZE / 2, top: y - SIZE / 2 }, style]}>
      <SymbolView
        name={{ ios: 'heart.fill', android: 'favorite', web: 'favorite' }}
        tintColor={LikeColor}
        size={SIZE}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  heart: {
    position: 'absolute',
    width: SIZE,
    height: SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
