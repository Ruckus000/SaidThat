import { Pressable, Text, View } from "react-native";

import { s } from "./styles";

export type HeaderProps = {
  score: number;
  concealScore: boolean;
  onHome: () => void;
};

export function Header({ score, concealScore, onHome }: HeaderProps) {
  return (
    <View style={s.header}>
      <Pressable accessibilityRole="button" accessibilityLabel="Return to home" onPress={onHome} hitSlop={12}>
        <Text style={s.brand}>SAID THAT?</Text>
      </Pressable>
      <Text accessibilityLiveRegion="polite" style={s.score}>
        {concealScore ? "PRIVATE HANDOFF" : `ROOM SCORE · ${score}`}
      </Text>
    </View>
  );
}
