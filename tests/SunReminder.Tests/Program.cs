using SunReminder.Core;
int passed=0;
void Test(string name,Action test){test();passed++;Console.WriteLine("PASS "+name);}
void Check(bool condition,string message="Assertion failed"){if(!condition)throw new Exception(message);}
Test("Due event fires once and waits for user",()=>{double t=0;var e=new ReminderEngine(()=>t);int due=0;e.BreakDue+=()=>due++;e.Start();t=1199;e.Tick();Check(due==0);t=1200;e.Tick();e.Tick();Check(due==1&&e.State==SessionState.Due);});
Test("Pause preserves remaining time",()=>{double t=0;var e=new ReminderEngine(()=>t);e.Start();t=300;e.Pause();t=10000;e.Tick();Check(e.Remaining==900);e.Resume();t+=899;e.Tick();Check(e.State==SessionState.Running);t++;e.Tick();Check(e.State==SessionState.Due);});
Test("Snooze uses configured delay",()=>{double t=0;var e=new ReminderEngine(()=>t);e.Configure(20,20,3);e.Snooze();t=179;e.Tick();Check(e.State==SessionState.Snoozed);t++;e.Tick();Check(e.State==SessionState.Due);});
Test("Completion recorded once and next cycle starts",()=>{double t=0;var e=new ReminderEngine(()=>t);int count=0;e.BreakCompleted+=s=>{Check(s==20);count++;};e.StartBreak();t=19;e.Tick();Check(count==0);t=20;e.Tick();e.Tick();Check(count==1&&e.State==SessionState.Running&&e.Remaining==1200);});
Test("Snoozing a break does not record completion",()=>{double t=0;var e=new ReminderEngine(()=>t);int count=0;e.BreakCompleted+=_=>count++;e.StartBreak();t=10;e.Snooze();t=20;e.Tick();Check(count==0&&e.State==SessionState.Snoozed);});
Test("Sleep discards unfinished break and restarts focus",()=>{double t=0;var e=new ReminderEngine(()=>t);int count=0;e.BreakCompleted+=_=>count++;e.StartBreak();t=5;e.Suspend();t=10000;e.Tick();e.ResumeFromSleep();Check(count==0&&e.State==SessionState.Running&&e.Remaining==1200);});
Test("Nested lock and suspend preserve restart intent",()=>{double t=0;var e=new ReminderEngine(()=>t);e.Start();e.Suspend();e.Suspend();e.ResumeFromSleep();Check(e.State==SessionState.Running);});
Test("Paused session stays paused after sleep",()=>{double t=0;var e=new ReminderEngine(()=>t);e.Start();t=20;e.Pause();e.Suspend();t=5000;e.ResumeFromSleep();Check(e.State==SessionState.Paused&&e.Remaining==1180);});
Test("Stop cancels wake restart",()=>{double t=0;var e=new ReminderEngine(()=>t);e.Start();e.Suspend();e.Stop();e.ResumeFromSleep();Check(e.State==SessionState.Idle);});
Test("Configuration validation and paused reset",()=>{var e=new ReminderEngine(()=>0);e.StartBreak();e.Pause();e.Configure(0,0,999);Check(e.IntervalMinutes==5&&e.BreakSeconds==20&&e.SnoozeMinutes==30&&e.Remaining==300);e.Resume();Check(e.State==SessionState.Running);});
Test("Data roundtrip, CSV, corrupt recovery",()=>{var dir=Path.Combine(Path.GetTempPath(),"sun-test-"+Guid.NewGuid());try{var s=new LocalStore(dir);var d=new AppData();d.Settings.IntervalMinutes=25;d.Breaks.Add(new(DateTimeOffset.Parse("2026-10-03T07:30:00+07:00"),20));s.Save(d);var restored=s.Load();Check(restored.Settings.IntervalMinutes==25&&restored.Breaks.Count==1);var csv=Path.Combine(dir,"out.csv");LocalStore.ExportCsv(csv,restored.Breaks);Check(File.ReadAllText(csv).Contains("+07:00,20"));File.WriteAllText(Path.Combine(dir,"data.json"),"invalid");Check(s.Load().Breaks.Count==0&&s.LoadWarning!=null);Check(Directory.GetFiles(dir,"*.backup-*").Length>0);}finally{if(Directory.Exists(dir))Directory.Delete(dir,true);}});
Test("Null JSON collections recover safely",()=>{var dir=Path.Combine(Path.GetTempPath(),"sun-test-"+Guid.NewGuid());Directory.CreateDirectory(dir);try{File.WriteAllText(Path.Combine(dir,"data.json"),"{\"Settings\":null,\"Breaks\":null,\"OutdoorDays\":null}");var d=new LocalStore(dir).Load();Check(d.Settings.IntervalMinutes==20&&d.Breaks.Count==0);}finally{Directory.Delete(dir,true);}});
Test("Completed breaks aggregate as check-ins separately from outdoor",()=>{var data=new AppData();data.Breaks.Add(new(new DateTimeOffset(2026,1,2,10,0,0,TimeSpan.Zero),20));data.Breaks.Add(new(new DateTimeOffset(2026,1,2,11,0,0,TimeSpan.Zero),30));data.OutdoorDays.Add("2026-01-03");var rows=StatisticsSummary.From(data);Check(rows.Count==2&&rows[0].BreakCount==2&&rows[0].RestSeconds==50&&!rows[0].Outdoor&&rows[1].Outdoor);});
Test("Sharing endpoint requires HTTPS except exact loopback",()=>{Check(StatisticsClient.ValidateEndpoint("https://group.example/")=="https://group.example");Check(StatisticsClient.ValidateEndpoint("http://localhost:4173")=="http://localhost:4173");foreach(var url in new[]{"http://example.org","https://name:password@example.org","https://example.org/path","https://example.org?key=value","file:///tmp"}){bool rejected=false;try{StatisticsClient.ValidateEndpoint(url);}catch(ArgumentException){rejected=true;}Check(rejected);}});
Test("Windows sharing opt-in, snapshot wire format, stop and withdrawal",()=>{
    var dir=Path.Combine(Path.GetTempPath(),"sun-sharing-"+Guid.NewGuid());Directory.CreateDirectory(dir);
    try{var data=new AppData();data.Breaks.Add(new(DateTimeOffset.Now,20));var handler=new StatisticsHandler();using var c=new StatisticsClient(dir,()=>data,handler);
        c.SyncAsync(true).GetAwaiter().GetResult();Check(handler.Uploads==0);
        c.EnableAsync("https://group.example").GetAwaiter().GetResult();Check(c.State.Enabled&&handler.Uploads==1&&c.State.LastSync!=null);
        c.SyncAsync(true).GetAwaiter().GetResult();Check(handler.Uploads==2&&c.State.Revision==2);
        c.Stop();c.SyncAsync(true).GetAwaiter().GetResult();Check(handler.Uploads==2);
        Check(!System.Text.Json.JsonSerializer.Serialize(data).Contains(c.State.Token!));
        c.Withdraw();for(int i=0;i<100&&c.Busy;i++)Thread.Sleep(10);Check(handler.Deletes==1&&!c.State.PendingDelete&&c.State.ParticipantId==null);
    }finally{Directory.Delete(dir,true);}
});
Console.WriteLine($"All {passed} tests passed.");

sealed class StatisticsHandler : HttpMessageHandler
{
    public int Uploads,Deletes;
    protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request,CancellationToken cancellationToken)
    {
        string json;
        if(request.RequestUri!.AbsolutePath=="/api/config")json="{\"enabled\":true,\"consentVersion\":\"group4-stats-v1\"}";
        else if(request.RequestUri.AbsolutePath=="/api/withdraw"){Deletes++;json="{\"ok\":true}";}
        else{Uploads++;using var doc=System.Text.Json.JsonDocument.Parse(await request.Content!.ReadAsStringAsync(cancellationToken));var root=doc.RootElement;if(root.GetProperty("days")[0].GetProperty("breakCount").GetInt32()!=1||root.GetProperty("source").GetString()!="windows"||request.Headers.Authorization?.Scheme!="Bearer")throw new Exception("Unexpected sharing payload");json=$"{{\"ok\":true,\"revision\":{root.GetProperty("revision").GetInt64()}}}";}
        return new HttpResponseMessage(System.Net.HttpStatusCode.OK){Content=new StringContent(json,System.Text.Encoding.UTF8,"application/json")};
    }
}
