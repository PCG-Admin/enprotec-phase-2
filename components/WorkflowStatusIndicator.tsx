import React from 'react';
import { WorkflowStatus } from '../types';

interface WorkflowStatusIndicatorProps {
  steps: WorkflowStatus[];
  currentStep: WorkflowStatus;
}

const WorkflowStatusIndicator: React.FC<WorkflowStatusIndicatorProps> = ({ steps, currentStep }) => {
  const normalizedSteps = steps.map(step => step.toLowerCase());
  const normalizedCurrent = currentStep.toLowerCase();

  let currentIndex = normalizedSteps.indexOf(normalizedCurrent);
  let forcedToLast = false;
  const normalizedEpod = WorkflowStatus.EPOD_CONFIRMED.toLowerCase();

  if (normalizedCurrent === normalizedEpod && steps.length > 0) {
    if (currentIndex !== steps.length - 1) {
      currentIndex = steps.length - 1;
      forcedToLast = true;
    }
  }

  if (currentIndex === -1) {
    currentIndex = 0;
  }

  return (
    <div className="w-full pt-4">
      <div className="flex items-center" aria-label="Workflow progress">
        {steps.map((step, index) => {
          const isCompleted = index < currentIndex;
          const isCurrent = index === currentIndex;
          const isFuture = index > currentIndex;

          let circleClasses = 'w-2.5 h-2.5 rounded-full transition-colors duration-300';
          let lineClasses = 'flex-1 h-0.5 transition-colors duration-300';
          let textColor = 'text-zinc-400';

          if (isCompleted) {
            circleClasses += ' bg-sky-500';
            lineClasses += ' bg-sky-500';
            textColor = 'text-sky-600 font-semibold';
          } else if (isCurrent) {
            circleClasses += ' bg-sky-500 ring-4 ring-sky-500/20';
            lineClasses += ' bg-zinc-200';
            textColor = 'text-sky-600 font-bold';
          } else { // isFuture
            circleClasses += ' bg-zinc-200';
            lineClasses += ' bg-zinc-200';
          }

          return (
            <React.Fragment key={step}>
              <div className="flex flex-col items-center relative">
                <div className={circleClasses} />
                {isCurrent && (
                  <span className={`absolute top-5 text-xs text-center ${textColor}`}>
                    {forcedToLast
                      ? WorkflowStatus.EPOD_CONFIRMED
                      : normalizedSteps[index] === normalizedCurrent
                        ? step
                        : currentStep}
                  </span>
                )}
              </div>
              {index < steps.length - 1 && <div className={lineClasses} />}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};

export default WorkflowStatusIndicator;
