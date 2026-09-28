import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useState } from 'react';
import {
  Gift,
  Lock,
  CheckCircle2,
  ShoppingBag,
  Sparkles,
  ArrowRight,
  Star,
  Volume2,
  VolumeX,
  Trophy,
  Zap,
} from 'lucide-react';
import { useUISound } from '../../contexts/SoundContext';
import { GradientDotsBackground } from '../../components/GradientDotsBackground';

const REWARDS = [
  {
    id: '1',
    title: '50% Off IIT Jodhpur Professional Courses',
    description: 'Get deep discounts on certified professional courses from IIT J.',
    points: 5000,
    locked: false,
    category: 'Education',
    partner: 'IIT Jodhpur',
  },
  {
    id: '2',
    title: 'Free 1-Month LinkedIn Premium',
    description: 'Boost your job search with LinkedIn Premium Career features.',
    points: 8000,
    locked: true,
    category: 'Career',
    partner: 'LinkedIn',
  },
  {
    id: '3',
    title: 'Premium Resume Review',
    description: 'Get your resume reviewed by top recruiters from FAANG companies.',
    points: 3000,
    locked: false,
    category: 'Coaching',
    partner: 'EDUROUTE',
  },
  {
    id: '4',
    title: 'AWS Certification Voucher',
    description: '100% discount on any AWS Associate level certification exam.',
    points: 15000,
    locked: true,
    category: 'Certification',
    partner: 'Amazon Web Services',
  },
];

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const card = {
  hidden: { opacity: 0, y: 28, scale: 0.95 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: 'spring', stiffness: 320, damping: 26 },
  },
};

export const Rewards = () => {
  const { isMuted, toggleMuted, playSuccess } = useUISound();
  const [claimedReward, setClaimedReward] = useState<string | null>(null);

  const handleClaim = (rewardTitle: string) => {
    setClaimedReward(rewardTitle);
    playSuccess();
  };

  return (
    <div className="relative flex-1 min-h-[calc(100vh-4rem)] overflow-hidden">
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden>
        <GradientDotsBackground />
        <div className="absolute inset-0 bg-gradient-to-b from-white/80 via-white/65 to-white/75 dark:from-slate-950/75 dark:via-slate-950/50 dark:to-slate-950/70" />
        <div className="absolute inset-0 bg-violet-50/25 dark:bg-indigo-950/15" />
        <div className="absolute -left-16 top-20 h-64 w-64 rounded-full bg-violet-500/15 blur-3xl" />
        <div className="absolute right-0 top-48 h-72 w-72 rounded-full bg-fuchsia-500/10 blur-3xl" />
      </div>

      <div className="relative z-10 p-4 md:p-8 max-w-7xl mx-auto">
        <header className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 text-pink-600 dark:text-pink-400 font-bold mb-4">
              <Gift className="h-6 w-6" />
              <span className="uppercase tracking-widest text-sm">Gamified Rewards</span>
            </div>
            <h1 className="text-4xl font-black text-slate-900 dark:text-white mb-4 drop-shadow-sm">
              Level Up. Redeem. Grow.
            </h1>
            <p className="text-slate-600 dark:text-slate-300 text-lg max-w-xl leading-relaxed">
              Earn points by learning, completing assessments, and climbing the leaderboard — then unlock real
              perks for your career journey.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              {['Learn', 'Earn XP', 'Climb ranks', 'Unlock rewards'].map((step) => (
                <span
                  key={step}
                  className="inline-flex items-center gap-1.5 rounded-full bg-violet-50/90 dark:bg-violet-500/20 backdrop-blur-sm px-3 py-1 text-xs font-bold text-violet-700 dark:text-violet-300 border border-violet-100/80 dark:border-violet-500/30"
                >
                  <Zap className="h-3 w-3" /> {step}
                </span>
              ))}
            </div>
          </div>
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="relative overflow-hidden bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-600 p-8 rounded-[40px] text-white shadow-2xl shadow-indigo-200/60 dark:shadow-indigo-950/50 min-w-[220px] ring-1 ring-white/20"
          >
            <div className="absolute -right-4 -top-4 opacity-20">
              <Trophy className="h-24 w-24" />
            </div>
            <div className="relative">
              <div className="text-sm font-bold uppercase opacity-80 mb-1 flex items-center gap-1.5">
                <Star className="h-4 w-4" /> Your Balance
              </div>
              <div className="text-4xl font-black mb-2">12,450</div>
              <div className="text-sm opacity-80">XP points available</div>
            </div>
          </motion.div>
        </header>

        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-600 dark:text-slate-300">
            <ShoppingBag className="h-4 w-4" /> {REWARDS.length} rewards in store
          </div>
          <button
            type="button"
            onClick={toggleMuted}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-slate-200/80 dark:border-slate-600 bg-white/70 dark:bg-slate-900/70 backdrop-blur-sm text-xs font-bold text-slate-600 dark:text-slate-300"
          >
            {isMuted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
            {isMuted ? 'Sound off' : 'Sound on'}
          </button>
        </div>

        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 md:grid-cols-2 gap-6"
          style={{ perspective: 1200 }}
        >
          {REWARDS.map((reward) => (
            <motion.div
              key={reward.id}
              variants={card}
              whileHover={{ y: -10, scale: 1.02, rotateX: 4, rotateY: -3 }}
              whileTap={{ scale: 0.99 }}
              style={{ transformPerspective: 900 }}
              className={`group relative rounded-[32px] border p-8 shadow-[0_8px_32px_rgba(15,23,42,0.06)] transition-shadow duration-300 hover:shadow-[0_24px_50px_rgba(139,92,246,0.2)] dark:shadow-black/30 backdrop-blur-xl ${
                reward.locked
                  ? 'border-white/15 dark:border-white/10 bg-white/70 dark:bg-slate-900/60'
                  : 'border-violet-200/50 dark:border-violet-500/30 bg-white/80 dark:bg-slate-900/65'
              }`}
            >
              <div className="pointer-events-none absolute -inset-[1px] rounded-[32px] bg-gradient-to-br from-violet-500/30 via-fuchsia-500/15 to-transparent opacity-0 blur-md transition-opacity duration-300 group-hover:opacity-100" />
              {reward.locked && (
                <div className="absolute inset-0 z-10 flex items-center justify-center rounded-[32px] bg-slate-900/40 backdrop-blur-[2px]">
                  <div className="flex items-center gap-2 rounded-full bg-slate-900/90 px-4 py-2 text-sm font-bold text-white">
                    <Lock className="h-4 w-4" /> Locked — need {reward.points.toLocaleString()} XP
                  </div>
                </div>
              )}
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <span className="inline-flex rounded-full bg-violet-50 dark:bg-violet-500/15 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-violet-600 dark:text-violet-300">
                    {reward.category}
                  </span>
                  <h3 className="mt-2 text-lg font-black text-slate-900 dark:text-white">{reward.title}</h3>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{reward.description}</p>
                </div>
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white shadow-lg">
                  <Gift className="h-6 w-6" />
                </div>
              </div>
              <div className="flex items-center justify-between mt-6">
                <div className="text-sm font-black text-indigo-600 dark:text-indigo-400">
                  {reward.points.toLocaleString()} XP
                </div>
                {reward.locked ? (
                  <button
                    type="button"
                    disabled
                    className="px-5 py-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 text-sm font-bold cursor-not-allowed"
                  >
                    Need more points
                  </button>
                ) : claimedReward === reward.title ? (
                  <button
                    type="button"
                    disabled
                    className="px-5 py-2.5 rounded-2xl bg-emerald-600 text-white text-sm font-bold flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="h-4 w-4" /> Claimed
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleClaim(reward.title)}
                    className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-sm font-bold hover:from-violet-500 hover:to-indigo-500 transition-colors flex items-center gap-1.5 shadow-lg shadow-violet-500/25"
                  >
                    <Sparkles className="h-4 w-4" /> Redeem
                  </button>
                )}
              </div>
              <div className="mt-3 text-[11px] font-semibold text-slate-400">Partner · {reward.partner}</div>
            </motion.div>
          ))}
        </motion.div>

        <div className="mt-12 text-center">
          <Link
            to="/leaderboard"
            className="inline-flex items-center gap-2 text-sm font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
          >
            Climb the leaderboard for more XP <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Rewards;
