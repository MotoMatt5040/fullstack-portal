export const getStats = (nums: number[]) => {
  if (nums.length === 0) return { mean: 0, stdDev: 0 };

  const mean = nums.reduce((sum, val) => sum + val, 0) / nums.length;
  const variance = nums.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / nums.length;
  const stdDev = Math.sqrt(variance);

  return { mean, stdDev };
};

export const calculateStdDev = (nums: number[]): number => {
  return getStats(nums).stdDev;
};

export const calculateZScore = (value: number, nums: number[]): number => {
  const { mean, stdDev } = getStats(nums);
  if (stdDev === 0) return 0;
  return (value - mean) / stdDev;
};
