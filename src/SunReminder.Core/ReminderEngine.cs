namespace SunReminder.Core;

public enum SessionState { Idle, Running, Snoozed, Due, Breaking, Paused }

/// <summary>Deterministic reminder state machine. Monotonic time is injected for tests.</summary>
public sealed class ReminderEngine(Func<double> monotonicSeconds)
{
    private double deadline;
    private double pausedRemaining;
    private SessionState pausedState;
    private bool restartAfterSleep;
    public SessionState State { get; private set; } = SessionState.Idle;
    public int IntervalMinutes { get; private set; } = 20;
    public int BreakSeconds { get; private set; } = 20;
    public int SnoozeMinutes { get; private set; } = 5;
    public event Action? BreakDue;
    public event Action<int>? BreakCompleted;
    public double Remaining => State switch
    {
        SessionState.Paused => pausedRemaining,
        SessionState.Running or SessionState.Snoozed or SessionState.Breaking => Math.Max(0, deadline - monotonicSeconds()),
        SessionState.Idle => IntervalMinutes * 60,
        _ => 0
    };
    public double TotalSeconds => State switch
    {
        SessionState.Breaking => BreakSeconds,
        SessionState.Snoozed => SnoozeMinutes * 60,
        SessionState.Paused when pausedState == SessionState.Breaking => BreakSeconds,
        SessionState.Paused when pausedState == SessionState.Snoozed => SnoozeMinutes * 60,
        _ => IntervalMinutes * 60
    };
    public bool IsPausedBreak => State == SessionState.Paused && pausedState == SessionState.Breaking;
    public void Configure(int interval, int rest, int snooze)
    {
        IntervalMinutes = Math.Clamp(interval, 5, 120);
        BreakSeconds = Math.Clamp(rest, 20, 120);
        SnoozeMinutes = Math.Clamp(snooze, 1, 30);
        // A settings change resets the schedule, including a paused session.
        if (State == SessionState.Paused) { pausedState = SessionState.Running; pausedRemaining = IntervalMinutes * 60; }
        else if (State != SessionState.Idle) Start();
    }
    public void Start() => Set(SessionState.Running, IntervalMinutes * 60);
    public void Stop() { State = SessionState.Idle; restartAfterSleep = false; }
    public void Pause()
    {
        if (State is not (SessionState.Running or SessionState.Snoozed or SessionState.Breaking)) return;
        pausedRemaining = Remaining; pausedState = State; State = SessionState.Paused;
    }
    public void Resume() { if (State == SessionState.Paused) Set(pausedState, pausedRemaining); }
    public void StartBreak() => Set(SessionState.Breaking, BreakSeconds);
    public void Snooze() => Set(SessionState.Snoozed, SnoozeMinutes * 60);
    public void Suspend()
    {
        restartAfterSleep = restartAfterSleep || State is SessionState.Running or SessionState.Snoozed or SessionState.Due or SessionState.Breaking;
        if (restartAfterSleep) State = SessionState.Idle;
    }
    public void ResumeFromSleep()
    {
        if (restartAfterSleep) Start();
        restartAfterSleep = false;
    }
    public void Tick()
    {
        if (Remaining > 0) return;
        if (State is SessionState.Running or SessionState.Snoozed)
        {
            State = SessionState.Due; BreakDue?.Invoke();
        }
        else if (State == SessionState.Breaking)
        {
            Start(); BreakCompleted?.Invoke(BreakSeconds);
        }
    }
    private void Set(SessionState state, double seconds) { State = state; deadline = monotonicSeconds() + seconds; }
}
