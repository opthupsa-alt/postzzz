export interface SurveyReportSection {
  title: string;
  content: string;
  confidence?: 'HIGH' | 'MEDIUM' | 'LOW';
  evidence?: Array<{
    source: string;
    url?: string;
    accessDate?: string;
  }>;
}

export interface ExecutiveSummary {
  points: string[];
  overallScore?: number;
  confidenceLevel: 'HIGH' | 'MEDIUM' | 'LOW';
}

export interface IdentityAnchors {
  confirmedIdentifiers: Array<{
    type: string;
    value: string;
    source: string;
    verified: boolean;
  }>;
  lookAlikes: Array<{
    name: string;
    reason: string;
  }>;
  confidenceLevel: 'HIGH' | 'MEDIUM' | 'LOW';
  confidenceReason: string;
}

export interface DigitalFootprintItem {
  platform: string;
  status: 'EXISTS' | 'NOT_FOUND' | 'UNCERTAIN';
  url?: string;
  details?: string;
  followers?: number;
  rating?: number;
  reviewCount?: number;
  lastActivity?: string;
}

export interface GapAnalysisSection {
  category: string;
  status: 'GOOD' | 'NEEDS_IMPROVEMENT' | 'MISSING' | 'UNKNOWN';
  findings: string[];
  recommendations: string[];
}

export interface Priority {
  rank: number;
  title: string;
  description: string;
  impact: 'HIGH' | 'MEDIUM' | 'LOW';
  effort: 'HIGH' | 'MEDIUM' | 'LOW';
  dependencies: string[];
}

export interface ServiceMapping {
  priority: string;
  problem: string;
  evidence: string;
  suggestedService: string;
  expectedOutcome: string;
  estimatedDuration?: string;
}

export interface Package {
  name: string;
  nameAr: string;
  description: string;
  includes: string[];
  suitableFor: string;
  estimatedPrice?: string;
}

export interface Competitor {
  name: string;
  city: string;
  strengths: string[];
  weaknesses: string[];
  evidence: Array<{
    source: string;
    url?: string;
  }>;
}

export interface SalesEnablement {
  discoveryQuestions: string[];
  callScript: string;
  objections: Array<{
    objection: string;
    response: string;
  }>;
  nextBestAction: string;
}

export interface CRMCard {
  companyName: string;
  industry: string;
  city: string;
  country: string;
  phone?: string;
  email?: string;
  website?: string;
  socialLinks: Record<string, string>;
  rating?: number;
  reviewCount?: number;
  qualificationScore: number;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  recommendedServices: string[];
  notes: string;
}

export interface SurveyReportData {
  executiveSummary: ExecutiveSummary;
  identityAnchors: IdentityAnchors;
  digitalFootprint: DigitalFootprintItem[];
  gapAnalysis: GapAnalysisSection[];
  priorities: Priority[];
  serviceMapping: ServiceMapping[];
  packages: Package[];
  competitors: Competitor[];
  salesEnablement: SalesEnablement;
  crmCard: CRMCard;
}

export interface SurveyResponseDto {
  reportId: string;
  status: 'PENDING' | 'GENERATING' | 'COMPLETED' | 'FAILED';
  progress?: number;
  message?: string;
  report?: SurveyReportData;
  error?: string;
  createdAt: string;
  completedAt?: string;
  processingTimeMs?: number;
  tokensUsed?: number;
}
