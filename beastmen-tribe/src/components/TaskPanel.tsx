import { useGameStore } from '../store/useGameStore';
import { RESOURCE_INFO } from '../data/trades';
import type { ActiveTask, TaskChain } from '../types';

export function TaskPanel() {
  const taskChains = useGameStore((s) => s.taskChains);
  const day = useGameStore((s) => s.day);
  const lastTaskRefreshDay = useGameStore((s) => s.lastTaskRefreshDay);
  const taskRefreshInterval = useGameStore((s) => s.taskRefreshInterval);
  const totalChainsCompleted = useGameStore((s) => s.totalChainsCompleted);
  const totalChainsFailed = useGameStore((s) => s.totalChainsFailed);
  const claimTaskStageReward = useGameStore((s) => s.claimTaskStageReward);
  const claimChainReward = useGameStore((s) => s.claimChainReward);
  const refreshTaskChains = useGameStore((s) => s.refreshTaskChains);

  const currentDay = Math.floor(day);
  const daysUntilRefresh = Math.max(0, taskRefreshInterval - (currentDay - lastTaskRefreshDay));

  return (
    <div className="panel task-panel">
      <h3 className="panel-title">📜 委托链</h3>

      <div className="task-overview">
        <div className="task-stats-row">
          <div className="task-stat-item">
            <span className="task-stat-label">已完成链</span>
            <span className="task-stat-value task-stat-green">{totalChainsCompleted}</span>
          </div>
          <div className="task-stat-item">
            <span className="task-stat-label">已失败链</span>
            <span className="task-stat-value task-stat-red">{totalChainsFailed}</span>
          </div>
          <div className="task-stat-item">
            <span className="task-stat-label">自动刷新</span>
            <span className="task-stat-value">{daysUntilRefresh}天</span>
          </div>
        </div>

        <div className="task-refresh-bar">
          <div className="task-refresh-label">
            刷新进度：第{lastTaskRefreshDay}天 → 第{lastTaskRefreshDay + taskRefreshInterval}天
          </div>
          <div className="progress-bar">
            <div
              className="progress-fill task-refresh-fill"
              style={{ width: `${Math.min(100, ((currentDay - lastTaskRefreshDay) / taskRefreshInterval) * 100)}%` }}
            />
          </div>
        </div>

        <button
          className="btn btn-secondary btn-small task-refresh-btn"
          onClick={refreshTaskChains}
        >
          🔄 手动刷新
        </button>
      </div>

      <div className="task-chain-list">
        {taskChains.map((chain) => (
          <TaskChainCard
            key={chain.id}
            chain={chain}
            onClaimStage={claimTaskStageReward}
            onClaimChain={claimChainReward}
          />
        ))}
      </div>
    </div>
  );
}

function TaskChainCard({
  chain,
  onClaimStage,
  onClaimChain,
}: {
  chain: TaskChain;
  onClaimStage: (chainId: string, taskId: string, stageIndex: number) => boolean;
  onClaimChain: (chainId: string) => boolean;
}) {
  const allStagesClaimed = chain.tasks.every((t) =>
    t.stages.every((s) => t.claimedStages.includes(s.index))
  );
  const canClaimChainReward = chain.completed && allStagesClaimed && !chain.chainRewardClaimed;

  return (
    <div className={`task-chain-card ${chain.completed ? 'chain-completed' : ''} ${chain.failed ? 'chain-failed' : ''}`}>
      <div className="chain-header">
        <span className="chain-icon">{chain.icon}</span>
        <div className="chain-info">
          <div className="chain-name">{chain.name}</div>
          <div className="chain-progress-text">
            进度：{chain.tasks.filter((t) => t.status === 'completed').length}/{chain.tasks.length} 任务
          </div>
        </div>
        {canClaimChainReward && (
          <button
            className="btn btn-primary btn-small chain-claim-btn"
            onClick={() => onClaimChain(chain.id)}
          >
            🎁 领取链奖励
          </button>
        )}
        {chain.completed && chain.chainRewardClaimed && (
          <span className="chain-badge chain-badge-complete">✅ 已领奖</span>
        )}
        {chain.completed && !chain.chainRewardClaimed && !canClaimChainReward && (
          <span className="chain-badge chain-badge-complete">✅ 已完成</span>
        )}
        {chain.failed && (
          <span className="chain-badge chain-badge-fail">❌ 已失败</span>
        )}
      </div>

      <div className="chain-timeline">
        {chain.tasks.map((task, i) => {
          const isCurrent = i === chain.currentTaskIndex && !chain.completed && !chain.failed;
          const isLocked = i > chain.currentTaskIndex && !chain.completed && !chain.failed;
          return (
            <div key={task.id} className="chain-task-wrapper">
              <div className={`chain-connector ${i === 0 ? 'connector-first' : ''} ${isCurrent || task.status !== 'active' || i < chain.currentTaskIndex ? 'connector-active' : ''}`} />
              <TaskCard
                task={task}
                chainId={chain.id}
                isCurrent={isCurrent}
                isLocked={isLocked}
                onClaimStage={onClaimStage}
              />
            </div>
          );
        })}
      </div>

      {(chain.completed || chain.failed) && (
        <div className="chain-reward-preview">
          <span className="chain-reward-label">链完成奖励：</span>
          <div className="chain-reward-items">
            {Object.entries(chain.chainReward).map(([key, amount]) => (
              <span key={key} className="chain-reward-item">
                {RESOURCE_INFO[key as keyof typeof RESOURCE_INFO]?.icon}
                {(amount as number) > 0 ? `+${amount}` : amount}
              </span>
            ))}
            <span className="chain-reward-loyalty">❤️+{chain.chainBonusLoyalty}</span>
          </div>
        </div>
      )}
    </div>
  );
}

function TaskCard({
  task,
  chainId,
  isCurrent,
  isLocked,
  onClaimStage,
}: {
  task: ActiveTask;
  chainId: string;
  isCurrent: boolean;
  isLocked: boolean;
  onClaimStage: (chainId: string, taskId: string, stageIndex: number) => boolean;
}) {
  const day = useGameStore((s) => s.day);
  const currentDay = Math.floor(day);
  const remainingDays = Math.max(0, task.duration - (currentDay - Math.floor(task.startedAtDay)));

  const lastStage = task.stages[task.stages.length - 1];
  const overallProgress = lastStage ? Math.min(1, task.progress / lastStage.requiredProgress) : 0;

  return (
    <div className={`task-card ${isCurrent ? 'task-current' : ''} ${isLocked ? 'task-locked' : ''} ${task.status === 'completed' ? 'task-done' : ''} ${task.status === 'failed' ? 'task-failed' : ''}`}>
      <div className="task-header">
        <span className="task-icon">{isLocked ? '🔒' : task.icon}</span>
        <div className="task-info">
          <div className="task-name">
            {isLocked ? '未解锁' : task.name}
            {task.status === 'completed' && <span className="task-status-badge badge-done">✅</span>}
            {task.status === 'failed' && <span className="task-status-badge badge-fail">❌</span>}
          </div>
          {!isLocked && (
            <div className="task-desc">{task.description}</div>
          )}
        </div>
      </div>

      {!isLocked && task.status === 'active' && (
        <>
          <div className="task-progress-section">
            <div className="task-progress-label">
              <span>进度：{Math.floor(task.progress)}/{task.goal.amount}</span>
              <span className="task-time-left">⏳ {remainingDays}天</span>
            </div>
            <div className="progress-bar task-progress-bar">
              <div
                className="progress-fill task-progress-fill"
                style={{ width: `${overallProgress * 100}%` }}
              />
            </div>
          </div>

          <div className="task-stages">
            {task.stages.map((stage) => {
              const reached = task.progress >= stage.requiredProgress;
              const claimed = task.claimedStages.includes(stage.index);
              return (
                <div key={stage.index} className={`task-stage ${reached ? 'stage-reached' : ''} ${claimed ? 'stage-claimed' : ''}`}>
                  <div className="stage-info">
                    <span className="stage-marker">{claimed ? '✅' : reached ? '🎯' : '⬜'}</span>
                    <span className="stage-requirement">{stage.requiredProgress}</span>
                  </div>
                  <div className="stage-rewards">
                    {Object.entries(stage.reward).map(([key, amount]) => (
                      <span key={key} className="stage-reward-tag">
                        {RESOURCE_INFO[key as keyof typeof RESOURCE_INFO]?.icon}
                        {(amount as number) > 0 ? `+${amount}` : amount}
                      </span>
                    ))}
                    {stage.bonusLoyalty && (
                      <span className="stage-reward-tag loyalty-tag">❤️+{stage.bonusLoyalty}</span>
                    )}
                  </div>
                  {reached && !claimed && (
                    <button
                      className="btn btn-primary btn-small stage-claim-btn"
                      onClick={() => onClaimStage(chainId, task.id, stage.index)}
                    >
                      领取
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {task.failurePenalty && Object.keys(task.failurePenalty).length > 0 && (
            <div className="task-penalty">
              <span className="penalty-label">⚠️ 失败惩罚：</span>
              {Object.entries(task.failurePenalty).map(([key, amount]) => (
                <span key={key} className="penalty-tag">
                  {RESOURCE_INFO[key as keyof typeof RESOURCE_INFO]?.icon}
                  {amount as number}
                </span>
              ))}
              {task.penaltyLoyalty && (
                <span className="penalty-tag loyalty-penalty">❤️{task.penaltyLoyalty}</span>
              )}
            </div>
          )}
        </>
      )}

      {task.status === 'completed' && (
        <div className="task-stages task-stages-done">
          {task.stages.map((stage) => {
            const claimed = task.claimedStages.includes(stage.index);
            return (
              <div key={stage.index} className={`task-stage stage-claimed ${claimed ? '' : 'stage-unclaimed'}`}>
                <div className="stage-info">
                  <span className="stage-marker">{claimed ? '✅' : '🎯'}</span>
                  <span className="stage-requirement">{stage.requiredProgress}</span>
                </div>
                <div className="stage-rewards">
                  {Object.entries(stage.reward).map(([key, amount]) => (
                    <span key={key} className="stage-reward-tag">
                      {RESOURCE_INFO[key as keyof typeof RESOURCE_INFO]?.icon}
                      {(amount as number) > 0 ? `+${amount}` : amount}
                    </span>
                  ))}
                </div>
                {!claimed && (
                  <button
                    className="btn btn-primary btn-small stage-claim-btn"
                    onClick={() => onClaimStage(chainId, task.id, stage.index)}
                  >
                    领取
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {task.status === 'failed' && (
        <div className="task-failed-info">
          <span>💀 任务失败，惩罚已生效</span>
        </div>
      )}
    </div>
  );
}
