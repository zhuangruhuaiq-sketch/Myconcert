import { useLayoutEffect, useState } from "react";
import { View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";

export function SwipePeriod({ periodKey, renderPage, onMove }: {
  periodKey: string;
  renderPage: (offset: number) => React.ReactNode;
  onMove: (direction: number) => void;
}) {
  const [width, setWidth] = useState(0);
  const x = useSharedValue(0);
  const settling = useSharedValue(false);
  useLayoutEffect(() => { x.set(0); settling.set(false); }, [periodKey, width, x, settling]);
  const gesture = Gesture.Pan().activeOffsetX([-12, 12]).failOffsetY([-16, 16])
    .onUpdate((event) => {
      if (!settling.get()) x.set(Math.max(-width, Math.min(width, event.translationX)));
    })
    .onEnd((event) => {
      if (settling.get() || !width) return;
      settling.set(true);
      const projected = event.translationX + event.velocityX * 0.15;
      const direction = Math.abs(projected) > width * 0.22 ? (projected < 0 ? 1 : -1) : 0;
      x.set(withTiming(-direction * width, { duration: 240, easing: Easing.out(Easing.cubic) }, (finished) => {
        if (!finished) return;
        if (direction) scheduleOnRN(onMove, direction);
        else settling.set(false);
      }));
    })
    .onFinalize((_event, success) => {
      if (!success && !settling.get()) x.set(withTiming(0, { duration: 180 }));
    });
  const style = useAnimatedStyle(() => ({ transform: [{ translateX: x.get() - width }] }));
  return <View onLayout={(event) => setWidth(event.nativeEvent.layout.width)} style={{ overflow: "hidden" }}>
    {width > 0 && <GestureDetector gesture={gesture} touchAction="pan-y">
      <Animated.View style={[{ flexDirection: "row", width: width * 3, alignItems: "flex-start" }, style]}>
        {[-1, 0, 1].map((offset) => <View key={offset} accessibilityElementsHidden={offset !== 0}
          aria-hidden={offset !== 0}
          importantForAccessibility={offset ? "no-hide-descendants" : "auto"}
          pointerEvents={offset ? "none" : "auto"} style={{ width, paddingHorizontal: 2, gap: 12 }}>
          {renderPage(offset)}
        </View>)}
      </Animated.View>
    </GestureDetector>}
  </View>;
}
