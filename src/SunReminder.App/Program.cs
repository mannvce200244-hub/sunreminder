namespace SunReminder.App;
internal static class Program
{
    [STAThread]
    static void Main(string[] args)
    {
        ApplicationConfiguration.Initialize();
        // An explicit QA profile can coexist with the user's normal tray instance.
        int profileIndex=Array.IndexOf(args,"--data-dir");
        string? profile=profileIndex>=0 && profileIndex+1<args.Length ? Path.GetFullPath(args[profileIndex+1]) : null;
        string profileKey=profile is null ? "" : "-"+Convert.ToHexString(System.Security.Cryptography.SHA256.HashData(System.Text.Encoding.UTF8.GetBytes(profile.ToUpperInvariant())))[..12];
        using var mutex = new Mutex(true, @"Local\SunReminder-" + Environment.UserName+profileKey, out bool first);
        if (!first)
        {
            MessageBox.Show("SunReminder đang chạy. Bấm biểu tượng mặt trời ở khay hệ thống để mở lại.", "SunReminder", MessageBoxButtons.OK, MessageBoxIcon.Information);
            return;
        }
        // Optional isolated profile for QA; normal launches retain the original data path.
        Application.Run(new MainForm(args.Contains("--startup"),profile));
    }
}
