// Behavioral port of SunReminder.Core/ReminderEngine.cs. Time is injectable for tests.
export class ReminderEngine {
  constructor(clock = () => performance.now() / 1000) {
    this.clock = clock; this.state = 'Idle'; this.interval = 20; this.rest = 20; this.snooze = 5;
    this.deadline = 0; this.pausedRemaining = 0; this.pausedState = 'Running'; this.restartAfterSleep = false;
  }
  get remaining() {
    if (this.state === 'Paused') return this.pausedRemaining;
    if (['Running', 'Snoozed', 'Breaking'].includes(this.state)) return Math.max(0, this.deadline - this.clock());
    return this.state === 'Idle' ? this.interval * 60 : 0;
  }
  get total() {
    const state = this.state === 'Paused' ? this.pausedState : this.state;
    return state === 'Breaking' ? this.rest : state === 'Snoozed' ? this.snooze * 60 : this.interval * 60;
  }
  configure(interval, rest, snooze) {
    this.interval = Math.max(5, Math.min(120, interval)); this.rest = Math.max(20, Math.min(120, rest)); this.snooze = Math.max(1, Math.min(30, snooze));
    if (this.state === 'Paused') { this.pausedState = 'Running'; this.pausedRemaining = this.interval * 60; }
    else if (this.state !== 'Idle') this.start();
  }
  set(state, seconds) { this.state = state; this.deadline = this.clock() + seconds; }
  start() { this.set('Running', this.interval * 60); }
  stop() { this.state = 'Idle'; this.restartAfterSleep = false; }
  pause() { if (!['Running', 'Snoozed', 'Breaking'].includes(this.state)) return; this.pausedRemaining = this.remaining; this.pausedState = this.state; this.state = 'Paused'; }
  resume() { if (this.state === 'Paused') this.set(this.pausedState, this.pausedRemaining); }
  startBreak() { this.set('Breaking', this.rest); }
  postpone() { this.set('Snoozed', this.snooze * 60); }
  suspend() { this.restartAfterSleep ||= ['Running', 'Snoozed', 'Due', 'Breaking'].includes(this.state); if (this.restartAfterSleep) this.state = 'Idle'; }
  wake() { if (this.restartAfterSleep) this.start(); this.restartAfterSleep = false; }
  tick() {
    if (this.remaining > 0) return;
    if (['Running', 'Snoozed'].includes(this.state)) { this.state = 'Due'; this.onDue?.(); }
    else if (this.state === 'Breaking') { this.start(); this.onComplete?.(this.rest); }
  }
}
