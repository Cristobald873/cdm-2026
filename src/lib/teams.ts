export const TEAMS_BY_GROUP: Record<string, string[]> = {
  A: ["Mexique","Afrique du Sud","Corée du Sud","Tchéquie"],
  B: ["Canada","Bosnie-Herzégovine","Qatar","Suisse"],
  C: ["Brésil","Maroc","Haïti","Écosse"],
  D: ["États-Unis","Paraguay","Australie","Turquie"],
  E: ["Allemagne","Curaçao","Côte d'Ivoire","Équateur"],
  F: ["Pays-Bas","Japon","Suède","Tunisie"],
  G: ["Belgique","Égypte","Iran","Nouvelle-Zélande"],
  H: ["Espagne","Cap-Vert","Arabie Saoudite","Uruguay"],
  I: ["France","Sénégal","Irak","Norvège"],
  J: ["Argentine","Algérie","Autriche","Jordanie"],
  K: ["Portugal","RD Congo","Ouzbékistan","Colombie"],
  L: ["Angleterre","Croatie","Ghana","Panama"],
};
export const GROUP_LETTERS = Object.keys(TEAMS_BY_GROUP);
export const ALL_TEAMS = Object.values(TEAMS_BY_GROUP).flat();

export const STAGE_LABELS: Record<string, string> = {
  GROUP: "Groupes",
  R32: "1/16",
  R16: "1/8",
  QF: "1/4",
  SF: "1/2",
  THIRD: "3e place",
  FINAL: "Finale",
};

export const EMOJI_AVATARS = ["⚽","🦁","🐉","🦅","🐻","🐯","🦊","🐺","🦄","🐶","🦈","🐳","🚀","🔥","⚡","👑","🎯","🍀","🥶","😎","🤖","👽"];
export const COLORS = ["#f5c842","#ef4444","#22c55e","#3b82f6","#a855f7","#ec4899","#06b6d4","#f97316","#14b8a6","#eab308"];
