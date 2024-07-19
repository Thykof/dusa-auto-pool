import { LiquidityDistributionParams } from '@dusalabs/sdk';
import { wide } from './dusa-utils';
import BigNumber from 'bignumber.js';
import { readFileSync } from 'fs';

const oneBinDistribution: LiquidityDistributionParams = {
  deltaIds: [0],
  distributionX: [10n ** 18n],
  distributionY: [10n ** 18n],
};

const noDistribution: LiquidityDistributionParams = {
  deltaIds: [],
  distributionX: [],
  distributionY: [],
};

export function getCustomDistribution(prices: {
  oldPrice: BigNumber;
  currentPrice: BigNumber;
}) {
  const oldPrice = prices.oldPrice;
  const currentPrice = prices.currentPrice;
  const profileFile = process.env.PROFILE_FILE || 'profile.default.json';
  const profiles = JSON.parse(readFileSync(profileFile).toString()) as Profiles;

  const evolution = oldPrice
    .minus(currentPrice)
    .abs()
    .dividedBy(oldPrice)
    .multipliedBy(100);

  const profilesEntries = Object.entries(profiles).sort(([a], [b]) => {
    const aBN = new BigNumber(a);
    const bBN = new BigNumber(b);
    return bBN.minus(aBN).toNumber();
  });

  for (const [percentage, profile] of profilesEntries) {
    const percentageBN = new BigNumber(percentage);
    if (evolution.isGreaterThanOrEqualTo(percentageBN)) {
      return readProfile(profile);
    }
  }

  return wide;
}

interface Profiles {
  [percentage: string]: Profile;
}

interface Profile {
  numBins: number;
  distribution: string;
}

export enum LiquidityDistribution {
  SPOT = 'SPOT',
  CURVE = 'CURVE',
  BID_ASK = 'BID_ASK',
}

function readProfile(profile: Profile) {
  if (profile.distribution !== LiquidityDistribution.SPOT) {
    throw new Error('Only SPOT distribution is supported for now');
  }

  if (profile.numBins === 0) {
    return noDistribution;
  }

  if (profile.numBins === 1) {
    return oneBinDistribution;
  }

  if (profile.numBins === 51) {
    return wide;
  }

  throw new Error(
    'Unsupported number of bins, only 1 and 51 are supported for now',
  );
}

function main() {
  const distribution = getCustomDistribution({
    oldPrice: new BigNumber(100),
    currentPrice: new BigNumber(120),
  });

  console.log(distribution);
}

// main();
