export type StartupStage = 'idea' | 'mvp' | 'growth' | 'scaling';
export type StartupStatus = 'healthy' | 'risky' | 'critical';
export type BuilderPhase = 'vazifa_belgilash' | 'biznes_reja' | 'raqobat' | 'bozor_tahlili' | 'strategiya' | 'narxlash' | 'identiteti' | 'mvp_qurish' | 'go_to_market';

export interface Startup {
  id: string;
  name: string;
  idea: string;
  projectType?: string;
  stage: StartupStage;
  ownerId: string;
  healthScore?: number;
  metrics?: {
    ideaStrength: number;
    execution: number;
    marketFit: number;
  };
  status?: StartupStatus;
  reasoning?: string;
  builderPhase: BuilderPhase;
  businessPlan?: {
    leanCanvas?: string;
    competitors?: string;
    pricing?: string;
    go_to_market?: string;
  };
  branding?: {
    slogan?: string;
    colors?: string[];
    font?: string;
  };
  strategy?: {
    targetAudience?: string;
    revenueModel?: string;
    channels?: string[];
  };
  websiteBrief?: {
    sections?: { title: string; content: string }[];
  };
  websiteCode?: string;
  backendCode?: string;
  createdAt: any;
  updatedAt: any;
}

export interface RoadmapTask {
  id: string;
  title: string;
  description: string;
  status: 'todo' | 'done';
  priority: 'low' | 'medium' | 'high';
}

export interface RoadmapStep {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'in-progress' | 'completed';
  tasks: RoadmapTask[];
}

export interface ChatMessage {
  id?: string;
  role: 'user' | 'model';
  content: string;
  timestamp: any;
  metadata?: {
    action?: 'update_phase' | 'update_branding' | 'update_strategy';
    data?: any;
  };
}

export interface Pitch {
  id: string;
  content: {
    problem: string;
    solution: string;
    market: string;
    businessModel: string;
    competition: string;
  };
  createdAt: any;
}
