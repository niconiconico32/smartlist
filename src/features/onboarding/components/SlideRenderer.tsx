import React from 'react';
import type {
    GoalOption,
    OnboardingAnswers,
    SelectOption,
    SlideConfig,
} from '../types';

// Constants (resolved from string refs)
import {
    ADHD_DIAGNOSIS,
    ADHD_SYMPTOMS,
    GOAL_OPTIONS,
    LIFE_AREAS,
    MAIN_GOAL,
    RANGOS_EDAD,
    STATEMENTS,
} from '../constants';

// Templates
import AgreementSlide from './templates/AgreementSlide';
import GoalsSlide from './templates/GoalsSlide';
import MultiSelectSlide from './templates/MultiSelectSlide';
import SingleSelectSlide from './templates/SingleSelectSlide';
import TextInputSlide from './templates/TextInputSlide';

// Custom slides
import CommitmentSlide from './custom/CommitmentSlide';
import DialogueSlide from './custom/DialogueSlide';
import GrowthPotentialSlide from './custom/GrowthPotentialSlide';
import HabitDaysSlide from './custom/HabitDaysSlide';
import NeuroscienceSlide from './custom/NeuroscienceSlide';
import NotificationsSlide from './custom/NotificationsSlide';
import PaywallSlide from './custom/PaywallSlide';
import PlanSelectorSlide from './custom/PlanSelectorSlide';
import PremiumBenefitsSlide from './custom/PremiumBenefitsSlide';
import ProcessingSlide from './custom/ProcessingSlide';
import ResultsSlide from './custom/ResultsSlide';
import ReverseTrialSlide from './custom/ReverseTrialSlide';
import SuccessTimelineSlide from './custom/SuccessTimelineSlide';
import TaskDemoSlide from './custom/TaskDemoSlide';
import TestimonialSlide from './custom/TestimonialSlide';
import TrialReminderSlide from './custom/TrialReminderSlide';
import WelcomeSlide from './custom/WelcomeSlide';

// ============================================
// OPTIONS RESOLVER
// ============================================
const OPTIONS_MAP: Record<string, SelectOption[] | GoalOption[]> = {
  RANGOS_EDAD,
  ADHD_DIAGNOSIS,
  ADHD_SYMPTOMS,
  LIFE_AREAS,
  MAIN_GOAL,
  GOAL_OPTIONS,
};

function resolveOptions(ref: string): SelectOption[] {
  return (OPTIONS_MAP[ref] ?? []) as SelectOption[];
}

function resolveGoalOptions(ref: string): GoalOption[] {
  return (OPTIONS_MAP[ref] ?? []) as GoalOption[];
}

// ============================================
// SLIDE RENDERER
// ============================================
interface Props {
  config: SlideConfig;
  answers: OnboardingAnswers;
  onAnswer: <K extends keyof OnboardingAnswers>(key: K, value: OnboardingAnswers[K]) => void;
  onNext: () => void;
  onBack: () => void;
  onFinish: () => void;
}

const SlideRenderer: React.FC<Props> = ({
  config,
  answers,
  onAnswer,
  onNext,
  onBack,
  onFinish,
}) => {
  switch (config.type) {
    case 'welcome':
      return <WelcomeSlide onNext={onNext} />;

    case 'dialogue':
      return <DialogueSlide config={config} onNext={onNext} />;

    case 'text-input':
      return (
        <TextInputSlide
          config={config}
          answers={answers}
          onAnswer={onAnswer}
        />
      );

    case 'single-select':
      return (
        <SingleSelectSlide
          config={config}
          answers={answers}
          onAnswer={onAnswer}
          resolvedOptions={resolveOptions(config.options)}
        />
      );

    case 'multi-select':
      return (
        <MultiSelectSlide
          config={config}
          answers={answers}
          onAnswer={onAnswer}
          resolvedOptions={resolveOptions(config.options)}
        />
      );

    case 'goals':
      return (
        <GoalsSlide
          config={config}
          answers={answers}
          onAnswer={onAnswer}
          resolvedOptions={resolveGoalOptions(config.options)}
        />
      );

    case 'agreement':
      return (
        <AgreementSlide
          config={config}
          answers={answers}
          onAnswer={onAnswer}
          onNext={onNext}
          statement={STATEMENTS[config.statementIndex]}
        />
      );

    case 'habit-days':
      return <HabitDaysSlide onNext={onNext} />;

    case 'task-demo':
      return <TaskDemoSlide answers={answers} onAnswer={onAnswer} />;

    case 'growth-potential':
      return <GrowthPotentialSlide onNext={onNext} />;

    case 'success-timeline':
      return <SuccessTimelineSlide onNext={onNext} />;

    case 'reverse-trial':
      return <ReverseTrialSlide onFinish={onFinish} />;

    case 'neuroscience':
      return <NeuroscienceSlide />;

    case 'processing':
      return <ProcessingSlide answers={answers} onNext={onNext} />;

    case 'results':
      return <ResultsSlide answers={answers} onNext={onNext} />;

    case 'commitment':
      return <CommitmentSlide onNext={onNext} />;

    case 'testimonial':
      return <TestimonialSlide onNext={onNext} />;

    case 'notifications':
      return <NotificationsSlide onNext={onNext} />;

    case 'premium-benefits':
      return <PremiumBenefitsSlide onNext={onNext} />;

    case 'trial-reminder':
      return <TrialReminderSlide onNext={onNext} />;

    case 'plan-selector':
      return <PlanSelectorSlide onNext={onNext} />;

    case 'paywall':
      return <PaywallSlide onFinish={onFinish} />;

    default:
      return null;
  }
};

export default SlideRenderer;
