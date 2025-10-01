export const safePercent = (num: number, den: number) => {
  if (!den || den <= 0) return 0
  return Math.round((num / den) * 100)
}


