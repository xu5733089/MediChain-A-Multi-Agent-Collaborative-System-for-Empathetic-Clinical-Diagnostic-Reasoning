export const SEV = n => n <= 3 ? { l: "Mild", c: "var(--sage)", bg: "var(--sagePale)" }
  : n <= 5 ? { l: "Moderate", c: "var(--amber)", bg: "var(--amberPale)" }
    : n <= 7 ? { l: "Elevated", c: "#b06840", bg: "rgba(176,104,64,0.12)" }
      : n <= 9 ? { l: "Severe", c: "var(--rose)", bg: "var(--rosePale)" }
        : { l: "Critical", c: "var(--rose)", bg: "var(--rosePale)" };

export const AGENTS = {
  interviewer: { icon: "🩺", label: "Interviewer", c: "var(--sage)", bg: "var(--sagePale)", b: "var(--sage)" },
  diagnostician: { icon: "🔬", label: "Diagnostician", c: "var(--navy)", bg: "var(--navyPale)", b: "var(--navy)" },
  critic: { icon: "⚖️", label: "Critic Agent", c: "var(--amber)", bg: "var(--amberPale)", b: "var(--amber)" },
};
