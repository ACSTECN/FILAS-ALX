import type { City, Hotzone, Shift } from "@/types/queue";

export const cityOptions: City[] = ["Rio de Janeiro", "São Paulo"];

export const hotzonesByCity: Record<City, Hotzone[]> = {
  "Rio de Janeiro": ["Bangu", "Santa Cruz", "Tijuca", "Nilópolis", "Zona Sul"],
  "São Paulo": ["Mooca", "Paulista", "Santo Amaro"],
};

export const shiftOptions: Shift[] = [
  "Manhã",
  "Tarde",
  "Noite",
  "Madrugada",
  "Flexível",
];

export function getCityByHotzone(hotzone: Hotzone): City {
  return hotzonesByCity["Rio de Janeiro"].includes(hotzone)
    ? "Rio de Janeiro"
    : "São Paulo";
}
