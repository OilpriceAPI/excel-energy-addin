/**
 * User tier and permissions interface
 * Maps to backend User model plans
 */

export type PlanTier = 'free' | 'exploration' | 'production' | 'reservoir_mastery';

export interface UserTier {
  plan: PlanTier;
  requestsUsed: number;
  requestsLimit: number;
  emailConfirmed: boolean;

  // Feature access flags
  canAccessHistorical: boolean;
  canAccessFutures: boolean;
  canUseWebhooks: boolean;
  canAccessDrillingIntelligence: boolean;

  // Premium features
  reservoirMastery: boolean;
  webhookLimit: number;
  webhookEventsLimit: number;
}

export interface UpgradeRequiredError {
  error: 'Upgrade required';
  message: string;
  upgradeRequired: boolean;
  feature: string;
  currentPlan: PlanTier;
  recommendedPlan: PlanTier;
  upgradeUrl: string;
}

export const PLAN_FEATURES = {
  free: {
    requestLimit: 1000,
    historical: false,
    futures: false,
    webhooks: false,
    drillingIntelligence: false,
    price: 0
  },
  exploration: {
    requestLimit: 10000,
    historical: true,
    futures: false,
    webhooks: false,
    drillingIntelligence: false,
    price: 15
  },
  production: {
    requestLimit: 50000,
    historical: true,
    futures: false,
    webhooks: true,
    drillingIntelligence: false,
    price: 45
  },
  reservoir_mastery: {
    requestLimit: 250000,
    historical: true,
    futures: true,
    webhooks: true,
    drillingIntelligence: true,
    price: 129
  }
} as const;
