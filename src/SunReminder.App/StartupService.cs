using Microsoft.Win32;
namespace SunReminder.App;
internal static class StartupService
{
    private const string Key = @"Software\Microsoft\Windows\CurrentVersion\Run";
    internal static bool Enabled()
    {
        using var key = Registry.CurrentUser.OpenSubKey(Key);
        return key?.GetValue("SunReminder") is string;
    }
    internal static void Set(bool enabled)
    {
        using var key = Registry.CurrentUser.CreateSubKey(Key);
        if (enabled) key.SetValue("SunReminder", $"\"{Environment.ProcessPath}\" --startup");
        else key.DeleteValue("SunReminder", false);
    }
}
