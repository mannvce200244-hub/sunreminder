using System.Globalization;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Security.Cryptography;
using System.Text.Json;

namespace SunReminder.Core;

public sealed record DailyStatistic(string Day, int BreakCount, int RestSeconds, bool Outdoor);
public static class StatisticsSummary
{
    public static List<DailyStatistic> From(AppData data)
    {
        var rows=data.Breaks.GroupBy(r=>r.CompletedAt.LocalDateTime.ToString("yyyy-MM-dd",CultureInfo.InvariantCulture))
            .ToDictionary(g=>g.Key,g=>new DailyStatistic(g.Key,g.Count(),g.Sum(r=>r.DurationSeconds),false));
        foreach(var day in data.OutdoorDays)
        {
            if(!DateOnly.TryParseExact(day,"yyyy-MM-dd",CultureInfo.InvariantCulture,DateTimeStyles.None,out _))continue;
            rows[day]=rows.TryGetValue(day,out var row)?row with{Outdoor=true}:new(day,0,0,true);
        }
        return rows.Values.OrderBy(r=>r.Day).ToList();
    }
}
public sealed class SharingPreferences
{
    public bool Enabled {get;set;}
    public bool PendingDelete {get;set;}
    public string Endpoint {get;set;}="";
    public string? ParticipantId {get;set;}
    public string? Token {get;set;}
    public long Revision {get;set;}
    public DateTimeOffset? LastSync {get;set;}
}
/// <summary>Opt-in daily snapshots. Credentials never enter AppData or its JSON exports.</summary>
public sealed class StatisticsClient : IDisposable
{
    public const string ConsentVersion="group4-stats-v1";
    private readonly string file;
    private readonly HttpClient http;
    private readonly Func<AppData> getData;
    private bool blocked,dirty=true;
    private CancellationTokenSource? requestCancellation;
    public bool Busy {get;private set;}
    public SharingPreferences State {get;private set;}=new();
    public string Status {get;private set;}="Chưa chia sẻ thống kê.";
    public event Action? Changed;
    public StatisticsClient(string directory,Func<AppData> getData,HttpMessageHandler? handler=null)
    {
        file=Path.Combine(directory,"sharing.json");this.getData=getData;
        http=new HttpClient(handler??new HttpClientHandler{AllowAutoRedirect=false}){Timeout=TimeSpan.FromSeconds(10)};
        try
        {
            if(File.Exists(file))
            {
                var s=JsonSerializer.Deserialize<SharingPreferences>(File.ReadAllText(file))??throw new JsonException();
                if(s.Revision<0||s.Revision>9007199254740000L||((s.Enabled||s.PendingDelete)&&(s.ParticipantId is null||s.Token is null)))throw new JsonException();
                if(s.ParticipantId is not null&&(!System.Text.RegularExpressions.Regex.IsMatch(s.ParticipantId,"^p_[a-f0-9]{32}$")||s.Token is null||!System.Text.RegularExpressions.Regex.IsMatch(s.Token,"^[a-f0-9]{64}$")))throw new JsonException();
                if(s.Endpoint!="")_ = ValidateEndpoint(s.Endpoint);
                State=s;Status=s.PendingDelete?"Đang chờ xóa thống kê đã gửi.":s.Enabled?"Đang chờ gửi thống kê.":"Đã ngừng chia sẻ.";
            }
        }
        catch(Exception ex) when(ex is IOException or UnauthorizedAccessException or JsonException or ArgumentException)
        {blocked=true;Status="Không đọc được sharing.json; chưa gửi dữ liệu. Hãy sao lưu và kiểm tra file này.";}
    }
    public static string ValidateEndpoint(string endpoint)
    {
        if(!Uri.TryCreate(endpoint.Trim(),UriKind.Absolute,out var uri)||uri.UserInfo!=""||uri.AbsolutePath!="/"||uri.Query!=""||uri.Fragment!=""||
            (uri.Scheme!="https"&&!(uri.Scheme=="http"&&uri.Host is "localhost" or "127.0.0.1" or "[::1]")))
            throw new ArgumentException("Nhập địa chỉ gốc HTTPS của Group 4, ví dụ https://ten-mien-cua-nhom. Chỉ localhost được dùng HTTP để thử.");
        return uri.GetLeftPart(UriPartial.Authority);
    }
    private bool Save()
    {
        try{Directory.CreateDirectory(Path.GetDirectoryName(file)!);File.WriteAllText(file+".tmp",JsonSerializer.Serialize(State));File.Move(file+".tmp",file,true);return true;}
        catch(Exception ex) when(ex is IOException or UnauthorizedAccessException){Status="Không lưu được lựa chọn chia sẻ. Chưa bật gửi tự động.";Changed?.Invoke();return false;}
    }
    public async Task EnableAsync(string endpoint)
    {
        if(blocked||Busy||State.PendingDelete)return;
        try
        {
            endpoint=ValidateEndpoint(endpoint);
            if(State.ParticipantId is not null&&State.Endpoint!=endpoint)throw new ArgumentException("Hãy xóa thống kê tại máy chủ cũ trước khi đổi địa chỉ.");
            Busy=true;Status="Đang kiểm tra máy chủ…";Changed?.Invoke();
            var config=await http.GetFromJsonAsync<JsonElement>(endpoint+"/api/config");
            if(!config.GetProperty("enabled").GetBoolean()||config.GetProperty("consentVersion").GetString()!=ConsentVersion)throw new ArgumentException("Máy chủ chưa cấu hình nhận thống kê Group 4.");
            State.Endpoint=endpoint;State.Enabled=true;
            State.ParticipantId??="p_"+Convert.ToHexString(RandomNumberGenerator.GetBytes(16)).ToLowerInvariant();
            State.Token??=Convert.ToHexString(RandomNumberGenerator.GetBytes(32)).ToLowerInvariant();
            if(!Save()){State.Enabled=false;return;}dirty=true;Status="Đã đồng ý chia sẻ.";
        }
        catch(Exception ex) when(ex is HttpRequestException or TaskCanceledException or JsonException or ArgumentException or KeyNotFoundException or InvalidOperationException)
        {Status="Chưa bật chia sẻ: "+ex.Message;}
        finally{Busy=false;Changed?.Invoke();}
        await SyncAsync();
    }
    public void Stop()
    {
        State.Enabled=false;requestCancellation?.Cancel();
        Status=Save()?"Đã ngừng gửi mới. Có thể xóa thống kê đã gửi bên dưới.":"Đã ngừng trong phiên này nhưng chưa lưu được lựa chọn. Thử lại trước khi thoát.";
        Changed?.Invoke();
    }
    public void Withdraw()
    {
        if(State.ParticipantId is null||blocked)return;
        State.Enabled=false;State.PendingDelete=true;requestCancellation?.Cancel();
        if(Save())Status="Đã ngừng gửi. Đang chờ máy chủ xác nhận xóa…";
        Changed?.Invoke();_ = SyncAsync();
    }
    public void MarkChanged(){dirty=true;_ = SyncAsync();}
    public async Task SyncAsync(bool force=false)
    {
        if(blocked||Busy||(!State.PendingDelete&&(!State.Enabled||(!dirty&&!force))))return;
        Busy=true;bool deleting=State.PendingDelete,success=false;
        using var cts=new CancellationTokenSource();requestCancellation=cts;
        try
        {
            object body;
            if(deleting)body=new{participantId=State.ParticipantId};
            else
            {
                State.Revision++;if(!Save())return;
                body=new{participantId=State.ParticipantId,revision=State.Revision,source="windows",consentVersion=ConsentVersion,days=StatisticsSummary.From(getData())};dirty=false;
            }
            Status=deleting?"Đang xóa thống kê đã gửi…":"Đang gửi thống kê…";Changed?.Invoke();
            using var request=new HttpRequestMessage(HttpMethod.Post,State.Endpoint+(deleting?"/api/withdraw":"/api/sync"));
            request.Headers.Authorization=new AuthenticationHeaderValue("Bearer",State.Token);
            request.Content=JsonContent.Create(body);
            using var response=await http.SendAsync(request,cts.Token);
            if(!response.IsSuccessStatusCode)throw new HttpRequestException($"Máy chủ trả mã {(int)response.StatusCode}. Kiểm tra địa chỉ hoặc thử lại.");
            var result=await response.Content.ReadFromJsonAsync<JsonElement>(cancellationToken:cts.Token);
            if(!result.GetProperty("ok").GetBoolean())throw new JsonException();
            if(deleting){State=new SharingPreferences{Endpoint=State.Endpoint};if(!Save())return;Status="Đã xóa thống kê máy chủ và ngừng chia sẻ. Lịch sử trên máy được giữ.";}
            else{State.LastSync=DateTimeOffset.Now;State.Revision=Math.Max(State.Revision,result.GetProperty("revision").GetInt64());if(!Save())return;Status=State.Enabled?"Đã gửi thống kê cho Group 4.":"Đã ngừng gửi mới.";}
            success=true;
        }
        catch(Exception ex) when(ex is HttpRequestException or OperationCanceledException or JsonException or KeyNotFoundException or InvalidOperationException or ArgumentException)
        {dirty=true;Status=State.PendingDelete?"Chưa xóa được trên máy chủ. Đã ngừng chia sẻ; sẽ thử xóa lại khi có mạng.":State.Enabled?"Chưa gửi được. Dữ liệu vẫn trên máy; sẽ thử lại khi có mạng.":"Đã ngừng gửi mới.";}
        finally{Busy=false;requestCancellation=null;Changed?.Invoke();}
        if(success&&(State.PendingDelete||(State.Enabled&&dirty)))await SyncAsync();
    }
    public void Dispose(){requestCancellation?.Cancel();http.Dispose();}
}
