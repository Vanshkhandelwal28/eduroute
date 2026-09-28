import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  Briefcase,
  Database,
  Loader2,
  MapPin,
  RefreshCw,
  Sparkles,
  Target,
  TrendingUp,
  Zap,
} from 'lucide-react';
import { StarfieldBackground } from '../../components/StarfieldBackground';
import {
  apiCollectJobs,
  computeSkillDemand,
  jobsForRegion,
  readJobs,
  type MarketJob,
} from '../../utils/marketEngineStore';
import { nsqfNosBadgeText } from '../../utils/nsqfNosMap';
