export const DEFAULT_THEME = {
  preset: "nordic-sage" as string,
  radius: "default" as string,
  scale: "none" as string,
  contentLayout: "full" as string
};

export type ThemeType = {
  preset: string;
  radius: string;
  scale: string;
  contentLayout: string;
};

export const THEMES = [
  {
    name: "Nordic Sage",
    value: "nordic-sage",
    colors: ["#3E715C", "#5B906F", "#9AAD83", "#CFCEA1", "#96AFA8"]
  },
  {
    name: "Default",
    value: "default",
    colors: ["oklch(0.33 0 0)"]
  },
  {
    name: "Underground",
    value: "underground",
    colors: ["oklch(0.5315 0.0694 156.19)"]
  },
  {
    name: "Rose Garden",
    value: "rose-garden",
    colors: ["oklch(0.5827 0.2418 12.23)"]
  },
  {
    name: "Lake View",
    value: "lake-view",
    colors: ["oklch(0.765 0.177 163.22)"]
  },
  {
    name: "Sunset Glow",
    value: "sunset-glow",
    colors: ["oklch(0.5827 0.2187 36.98)"]
  },
  {
    name: "Forest Whisper",
    value: "forest-whisper",
    colors: ["oklch(0.5276 0.1072 182.22)"]
  },
  {
    name: "Ocean Breeze",
    value: "ocean-breeze",
    colors: ["oklch(0.59 0.20 277.12)"]
  },
  {
    name: "Lavender Dream",
    value: "lavender-dream",
    colors: ["oklch(0.71 0.16 293.54)"]
  }
];
