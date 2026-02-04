import React, { useEffect } from "react";
import { View, Pressable, StyleSheet } from "react-native";
import { Text } from "~/components/ui/text";
import { useGameContext } from "~/contexts/GameContext";
import { useRouter } from "expo-router";
import { Icon } from '@/components/icons';
import Svg, { Path, Circle, Defs, RadialGradient, Stop } from "react-native-svg";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withRepeat,
  withSequence,
  withTiming,
  FadeIn,
  SlideInUp,
} from "react-native-reanimated";

// QNTM Icon matching web design
function QntmIcon() {
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={80} height={80} viewBox="0 0 32 32">
        <Path
          fill="#fff"
          d="M27.328 12.036c-2.912-1.239-6.823-2.041-11-2.26a32 32 0 0 0-1.932-.057c3.088-3.771 6.401-6.303 8.583-6.385q.644-.022 1.084.26c.943.615 1.203 2.36.724 4.787c-.052.333.161.661.479.724a.61.61 0 0 0 .724-.479c.599-3.041.156-5.131-1.255-6.052c-.505-.333-1.12-.491-1.803-.464c-2.729.104-6.583 3.068-10.12 7.631a35 35 0 0 0-4.307.38c-.86-3.865-.521-6.636.792-7.303c.181-.099.38-.145.609-.167c.932-.072 2.213.527 3.615 1.693c.26.213.645.187.859-.079a.606.606 0 0 0-.077-.859c-1.683-1.391-3.229-2.073-4.496-1.98a3 3 0 0 0-1.072.292c-1.589.812-2.224 3.104-1.828 6.453c.093.692.213 1.416.391 2.156c-4.376.875-7.161 2.631-7.281 4.833c-.084 1.563 1.151 3.047 3.572 4.297a.61.61 0 0 0 .824-.265a.607.607 0 0 0-.267-.824c-1.932-.995-2.973-2.115-2.911-3.14c.068-1.443 2.364-2.923 6.349-3.708a36 36 0 0 0 1.4 4.119c-1.359 2.516-2.344 4.996-2.848 7.199c-.751 3.287-.349 5.631 1.145 6.599c.479.312 1.036.469 1.661.469c1.245 0 2.755-.615 4.464-1.833a.611.611 0 1 0-.71-.995c-2.057 1.473-3.791 1.963-4.749 1.337c-1.011-.661-1.235-2.588-.609-5.301c.421-1.849 1.208-3.907 2.276-6.027q.4.875.839 1.751c1.901 3.729 4.229 6.968 6.547 9.131c1.849 1.719 3.568 2.615 4.979 2.615c.469 0 .907-.1 1.303-.297c1.525-.781 2.188-2.948 1.864-6.099c-.296-2.953-1.411-6.548-3.14-10.136a.614.614 0 0 0-.812-.287a.614.614 0 0 0-.292.819c3.583 7.468 3.839 13.583 1.828 14.609c-2.125 1.088-7.235-3.141-11.188-10.907a36 36 0 0 1-1.203-2.573c.453-.807.932-1.625 1.464-2.437a44 44 0 0 1 1.629-2.328h.527c.719 0 1.5.016 2.312.063c8.703.459 14.631 3.416 14.511 5.781c-.052 1.02-1.235 2.052-3.235 2.828a.612.612 0 0 0 .443 1.14c2.541-.984 3.937-2.339 4.016-3.905c.093-1.772-1.557-3.48-4.667-4.803v-.011zm-16.557.563a39 39 0 0 0-1.016 1.661a31 31 0 0 1-.963-2.953a33 33 0 0 1 3.077-.323a33 33 0 0 0-1.093 1.615v-.015zm5.234 1.568c-2.443 0-2.443 3.667 0 3.667c2.448 0 2.448-3.667 0-3.667"
        />
      </Svg>
    </View>
  );
}

// Rank icon component matching web
function RankIcon({ rank }: { rank: string | null }) {
  if (rank === "OG") {
    return (
      <Svg width={20} height={20} viewBox="0 0 24 24">
        <Circle cx="12" cy="12" r="2.197" fill="#fff" />
        <Path
          fill="#fff"
          d="M21.63441 6.43671c-.70909-1.22723-2.41155-1.73142-4.79628-1.42354c-.30258.03942-.61354.09379-.92927.15769C15.00856 2.619 13.6066 1 12 1C10.39089 1 8.98713 2.62441 8.087 5.1834c-2.7384-.54268-4.90657-.15669-5.72186 1.25331C1.55256 7.84376 2.2947 9.90626 4.12193 12C2.2947 14.09374 1.55256 16.15624 2.3651 17.56329c.58143 1.00732 1.85 1.49542 3.52453 1.49542a11.47535 11.47535 0 0 0 2.197-.24305C8.98673 21.37518 10.39069 23 12 23c1.60658 0 3.00854-1.619 3.90884-4.17086c.31573.0639.62669.11827.92927.15769a10.18235 10.18235 0 0 0 1.297.088c1.70461 0 2.92647-.52028 3.49932-1.51151c.81254-1.407.07053-3.46955-1.75643-5.56329C21.70494 9.90626 22.447 7.84376 21.63441 6.43671Z"
        />
      </Svg>
    );
  } else if (rank === "LEGEND") {
    return (
      <Svg width={20} height={20} viewBox="0 0 24 24">
        <Path
          fill="#fff"
          fillRule="evenodd"
          d="M12 1.25c-1.828 0-3.339.161-4.502.357l-.134.023c-1.01.169-1.85.31-2.507 1.118c-.42.519-.557 1.08-.588 1.705l-.492.164c-.463.154-.87.29-1.191.44c-.348.162-.667.37-.911.709s-.341.707-.385 1.088c-.04.353-.04.78-.04 1.269v.145c0 .402 0 .757.03 1.054c.032.321.103.634.28.936c.179.303.417.517.683.701c.245.17.555.343.907.538l2.64 1.467c.54 1.061 1.281 2.007 2.3 2.69c.887.596 1.952.97 3.213 1.069a.8.8 0 0 0-.053.277v1.75H9.82a1.75 1.75 0 0 0-1.716 1.407l-.219 1.093H6a.75.75 0 0 0 0 1.5h12a.75.75 0 0 0 0-1.5h-1.885l-.219-1.093a1.75 1.75 0 0 0-1.716-1.407h-1.43V17a.8.8 0 0 0-.053-.277c1.261-.1 2.326-.473 3.213-1.068c1.02-.684 1.76-1.63 2.3-2.691l2.64-1.467c.352-.195.662-.368.907-.538c.265-.184.504-.398.682-.7c.178-.303.25-.616.281-.937c.03-.297.03-.652.03-1.054v-.145c0-.488 0-.916-.04-1.269c-.044-.381-.14-.75-.385-1.088c-.244-.339-.563-.547-.91-.71c-.323-.15-.729-.285-1.192-.439l-.492-.164c-.03-.626-.167-1.186-.588-1.705c-.656-.809-1.496-.95-2.506-1.118l-.135-.023A27 27 0 0 0 12 1.25"
          clipRule="evenodd"
        />
      </Svg>
    );
  } else if (rank === "STAR") {
    return (
      <Svg width={20} height={20} viewBox="0 0 24 24">
        <Path
          fill="#fff"
          d="m8.85 16.825l3.15-1.9l3.15 1.925l-.825-3.6l2.775-2.4l-3.65-.325l-1.45-3.4l-1.45 3.375l-3.65.325l2.775 2.425zm3.15.45l-4.15 2.5q-.275.175-.575.15t-.525-.2t-.35-.437t-.05-.588l1.1-4.725L3.775 10.8q-.25-.225-.312-.513t.037-.562t.3-.45t.55-.225l4.85-.425l1.875-4.45q.125-.3.388-.45t.537-.15t.537.15t.388.45l1.875 4.45l4.85.425q.35.05.55.225t.3.45t.038.563t-.313.512l-3.675 3.175l1.1 4.725q.075.325-.05.588t-.35.437t-.525.2t-.575-.15zm0-5.025"
        />
      </Svg>
    );
  }
  return null;
}

export function QntmBalance() {
  const { mainQuantAmount, rank } = useGameContext();
  const router = useRouter();

  return (
    <View className="items-center py-8">
      {/* QNTM Icon */}
      <View className="mb-4">
        <QntmIcon />
      </View>

      {/* Balance */}
      <View className="flex-row items-center justify-center gap-2 mt-2 w-full px-4">
        <Text 
          style={styles.balance} 
          numberOfLines={1} 
          adjustsFontSizeToFit
          minimumFontScale={0.5}
        >
          {mainQuantAmount}
        </Text>
        <Text style={styles.unit}>QNTM</Text>
      </View>

      {/* Rank Badge */}
      <View className="flex-row items-center justify-center gap-3 px-5 py-2 mt-4 rounded-full bg-[#111] border border-[#222]">
        <Text style={styles.rankLabel}>RANK</Text>
        <View className="w-px h-3 bg-[#333]" />
        <View className="flex-row items-center gap-2">
          <RankIcon rank={rank} />
          <Text style={styles.rankValue}>{rank || "#1"}</Text>
        </View>
      </View>

      {/* Rewards History Link */}
      <Pressable
        onPress={() => router.push("/rewards-history" as never)}
        className="mt-4 flex-row items-center gap-1"
      >
        <Text style={styles.rewardsLink}>Rewards history</Text>
        <Icon name="solar:alt-arrow-right-linear" size={14} color="#6b7280" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  balance: {
    fontSize: 48,
    fontFamily: "Onest_700Bold",
    color: "#fff",
    letterSpacing: -1,
    lineHeight: 56, // Increased line height to prevent clipping
    includeFontPadding: false, // Android specific
    textAlignVertical: 'center', // Android specific
    flexShrink: 1,
  },
  unit: {
    fontSize: 20,
    fontFamily: "Onest_500Medium",
    color: "#9ca3af",
  },
  rankLabel: {
    fontSize: 10,
    fontFamily: "Onest_700Bold",
    color: "#6b7280",
    letterSpacing: 2,
  },
  rankValue: {
    fontSize: 14,
    fontFamily: "Onest_700Bold",
    color: "#fff",
    letterSpacing: 0.5,
  },
  rewardsLink: {
    fontSize: 14,
    fontFamily: "Onest_400Regular",
    color: "#6b7280",
  },
});
