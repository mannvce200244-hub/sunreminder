using System.Text;
using System.Text.Json;

namespace SunReminder.Core;

public sealed class Preferences
{
    public int IntervalMinutes { get; set; } = 20;
    public int BreakSeconds { get; set; } = 20;
    public int SnoozeMinutes { get; set; } = 5;
    public bool Popups { get; set; } = true;
    public bool Sound { get; set; }
    public bool MinimizeToTray { get; set; } = true;
    public bool MorningReminder { get; set; }
    public int MorningHour { get; set; } = 7;
    public int MorningMinute { get; set; } = 30;
    public void Normalize()
    {
        IntervalMinutes = Math.Clamp(IntervalMinutes, 5, 120);
        BreakSeconds = Math.Clamp(BreakSeconds, 20, 120);
        SnoozeMinutes = Math.Clamp(SnoozeMinutes, 1, 30);
        MorningHour = Math.Clamp(MorningHour, 0, 23);
        MorningMinute = Math.Clamp(MorningMinute, 0, 59);
    }
}
public sealed record BreakRecord(DateTimeOffset CompletedAt, int DurationSeconds);
public sealed class AppData
{
    public Preferences Settings { get; set; } = new();
    public List<BreakRecord> Breaks { get; set; } = [];
    public HashSet<string> OutdoorDays { get; set; } = [];
    public string? LastMorningNotification { get; set; }
    public void Normalize()
    {
        Settings ??= new(); Settings.Normalize(); Breaks ??= []; OutdoorDays ??= [];
        Breaks = Breaks.Where(b => b is not null && b.DurationSeconds is >= 20 and <= 120).ToList();
    }
}
public sealed class LocalStore(string directory)
{
    private bool recoveryBlocked;
    private readonly string path = Path.Combine(directory, "data.json");
    private static readonly JsonSerializerOptions Options = new() { WriteIndented = true };
    public string? LoadWarning { get; private set; }
    public string DirectoryPath => directory;
    public AppData Load()
    {
        if (!File.Exists(path)) return new();
        try
        {
            var value = JsonSerializer.Deserialize<AppData>(File.ReadAllText(path)) ?? throw new JsonException("Empty data");
            value.Normalize(); return value;
        }
        catch (Exception ex) when (ex is JsonException or IOException or UnauthorizedAccessException)
        {
            // Keep the damaged original for recovery; never silently destroy user history.
            try { File.Copy(path, path + ".backup-" + DateTime.Now.ToString("yyyyMMddHHmmss")); }
            catch (Exception copyEx) when (copyEx is IOException or UnauthorizedAccessException) { recoveryBlocked = true; }
            LoadWarning = "Không đọc được dữ liệu cũ. Ứng dụng dùng cài đặt mặc định; hãy kiểm tra thư mục dữ liệu trước khi lưu.";
            return new();
        }
    }
    public void Save(AppData value)
    {
        if (recoveryBlocked) throw new IOException("Không thể sao lưu dữ liệu cũ. Hãy sao lưu hoặc di chuyển data.json rồi mở lại app trước khi lưu.");
        Directory.CreateDirectory(directory);
        var temporary = path + ".tmp";
        File.WriteAllText(temporary, JsonSerializer.Serialize(value, Options), new UTF8Encoding(false));
        File.Move(temporary, path, true);
    }
    public static void ExportCsv(string path, IEnumerable<BreakRecord> records)
    {
        var lines = new List<string> { "CompletedAt,DurationSeconds" };
        lines.AddRange(records.OrderByDescending(x => x.CompletedAt).Select(x => $"{x.CompletedAt:O},{x.DurationSeconds}"));
        File.WriteAllLines(path, lines, new UTF8Encoding(true));
    }
}
