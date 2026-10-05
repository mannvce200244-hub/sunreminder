using System.Diagnostics;
using System.Globalization;
using System.Media;
using Microsoft.Win32;
using SunReminder.Core;

namespace SunReminder.App;
internal sealed class MainForm : Form
{
    private readonly LocalStore store;
    private readonly AppData data;
    private readonly StatisticsClient statistics;
    private TextBox? collectorInput;
    private CheckBox? sharingConsent;
    private Label? sharingFeedback;
    private Button? shareEnable,shareStop,shareNow,shareDelete;
    private DateTime nextStatisticsAttempt=DateTime.Now;
    private readonly ReminderEngine engine;
    private readonly System.Windows.Forms.Timer timer = new() { Interval = 250 };
    private readonly NotifyIcon tray;
    private readonly Panel host = new() { Dock = DockStyle.Fill, Padding = new Padding(28, 4, 12, 10), BackColor = Theme.Background };
    private readonly Label pageTitle = Theme.Text("Một nhịp nghỉ, thêm dễ chịu.", 23, true);
    private readonly Label subtitle = Theme.Text("Dành một chút thời gian cho đôi mắt của bạn.", 10, false, Theme.Muted);
    private readonly Label footer = Theme.Text("Lưu trên máy • Không cần tài khoản • Hoạt động ngoại tuyến", 9, false, Theme.Muted);
    private readonly Label stateLabel = Theme.Text("SẴN SÀNG BẮT ĐẦU", 9, true, Theme.Green);
    private readonly CountdownDial dial = new() { Dock = DockStyle.Top };
    private readonly Label completedLabel = Theme.Text("0", 30, true);
    private readonly Label minutesLabel = Theme.Text("0 giây", 16, true);
    private readonly Label outdoorLabel = Theme.Text("Một khoảng trời cho hôm nay", 13, true);
    private readonly Button primary;
    private readonly Button snooze;
    private readonly Button outdoor;
    private readonly Dictionary<string, Button> nav = [];
    private readonly Dictionary<string, Control> pages = [];
    private DataGridView? historyGrid;
    private Label? historySummary;
    private NumericUpDown? intervalInput, breakInput, snoozeInput;
    private CheckBox? popupInput, soundInput, trayInput, startupInput, morningInput;
    private DateTimePicker? morningTime;
    private Label? saveFeedback;
    private BreakForm? breakWindow;
    private bool quitting, startupLaunch, initialShow = true, saveFailed, screenLocked, systemSuspended;
    private DateTime lastWallTime = DateTime.Now;
    private string dayKey = DateTime.Now.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture);
    private string activePage = "focus";
    private Icon appIcon;

    internal MainForm(bool launchedAtLogin, string? dataDirectory = null)
    {
        store=new LocalStore(dataDirectory ?? Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "SunReminder"));
        startupLaunch=launchedAtLogin;
        data=store.Load();
        statistics=new StatisticsClient(store.DirectoryPath,()=>data);
        var clock=Stopwatch.StartNew(); engine=new ReminderEngine(()=>clock.Elapsed.TotalSeconds);
        engine.Configure(data.Settings.IntervalMinutes,data.Settings.BreakSeconds,data.Settings.SnoozeMinutes);
        Text="SunReminder — Nắng sớm, mắt khỏe";Font=Theme.Font();BackColor=Theme.Background;
        AutoScaleDimensions=new SizeF(96,96);AutoScaleMode=AutoScaleMode.Dpi;ClientSize=new Size(1240,820);MinimumSize=new Size(1060,700);
        StartPosition=FormStartPosition.CenterScreen;
        appIcon=Icon.ExtractAssociatedIcon(Environment.ProcessPath!) ?? SystemIcons.Information;
        Icon=appIcon;
        primary=Theme.Button("Bắt đầu tập trung",PrimaryAction,true);
        snooze=Theme.Button("Hoãn 5 phút",Snooze);
        outdoor=Theme.Button("Hôm nay tôi đã ra ngoài",ToggleOutdoor);
        tray=new NotifyIcon {Icon=appIcon,Text="SunReminder • Sẵn sàng",Visible=true};
        var menu=new ContextMenuStrip();
        menu.Items.Add("Mở SunReminder",null,(_,_)=>RestoreWindow());
        menu.Items.Add("Bắt đầu / Tạm dừng",null,(_,_)=>PrimaryAction());
        menu.Items.Add("Nghỉ mắt ngay",null,(_,_)=>StartBreak());
        menu.Items.Add("Thử thông báo",null,(_,_)=>TestReminder());
        menu.Items.Add(new ToolStripSeparator());menu.Items.Add("Thoát ứng dụng",null,(_,_)=>ExitApp());
        tray.ContextMenuStrip=menu;tray.DoubleClick+=(_,_)=>RestoreWindow();
        tray.BalloonTipClicked+=(_,_)=>{RestoreWindow();if(engine.State==SessionState.Due)ShowBreakWindow();};
        BuildShell();
        statistics.Changed+=UpdateSharingDisplay;UpdateSharingDisplay();
        engine.BreakDue+=OnDue;
        engine.BreakCompleted+=seconds=>
        {
            CloseBreakWindow();data.Breaks.Add(new BreakRecord(DateTimeOffset.Now,seconds));
            bool saved=SaveData();UpdateStats();RefreshHistory();
            footer.Text=saved?"Đã check-in nghỉ mắt! Chu kỳ tiếp theo đã bắt đầu.":"Đã nghỉ xong nhưng chưa lưu được check-in. Hãy sao lưu dữ liệu.";
        };
        timer.Tick+=(_,_)=>OnTick();timer.Start();
        SystemEvents.PowerModeChanged+=PowerChanged;
        FormClosing+=OnClosing;
        Shown+=(_,_)=>
        {
            if(!initialShow)return;initialShow=false;
            if(store.LoadWarning is not null)MessageBox.Show(this,store.LoadWarning,"Dữ liệu cục bộ",MessageBoxButtons.OK,MessageBoxIcon.Warning);
            if(startupLaunch){engine.Start();Hide();} UpdateDisplay();
        };
        UpdateStats();UpdateDisplay();
    }

    private void BuildShell()
    {
        var root=new TableLayoutPanel{Dock=DockStyle.Fill,ColumnCount=2,RowCount=1,Padding=Padding.Empty,Margin=Padding.Empty};
        root.ColumnStyles.Add(new ColumnStyle(SizeType.Absolute,224));root.ColumnStyles.Add(new ColumnStyle(SizeType.Percent,100));
        var side=new Panel{Dock=DockStyle.Fill,BackColor=Color.White,Padding=new Padding(20,24,16,20),Margin=Padding.Empty};
        var brand=Theme.Stack();var markRow=Theme.Row();markRow.Controls.Add(new SunMark());
        var brandName=Theme.Text("SunReminder",16,true);brandName.Margin=new Padding(2,9,0,0);markRow.Controls.Add(brandName);
        // Keep the logo above the product name on compact sidebars.
        markRow.WrapContents=true;brand.Controls.Add(markRow);brand.Controls.Add(Theme.Text("NẮNG SỚM · MẮT KHỎE",8,true,Theme.Muted));
        var navigation=Theme.Stack();navigation.Padding=new Padding(0,38,0,0);
        AddNavigation(navigation,"focus","Tập trung");AddNavigation(navigation,"history","Lịch sử nghỉ mắt");
        AddNavigation(navigation,"settings","Cài đặt");AddNavigation(navigation,"guide","Hướng dẫn");AddNavigation(navigation,"about","Về Group 4");brand.Controls.Add(navigation);side.Controls.Add(brand);
        var bottom=Theme.Stack();bottom.Dock=DockStyle.Bottom;
        bottom.Controls.Add(Theme.Text("20 phút làm việc",10,true));bottom.Controls.Add(Theme.Text("20 giây nhìn xa\nKhoảng cách khoảng 6 mét",9,false,Theme.Muted));
        bottom.Controls.Add(Theme.Button("Thoát ứng dụng",ExitApp));bottom.Controls.Add(Theme.Text("ĐƯỢC LÀM BỞI GROUP 4\nSunReminder · 3.0",8,false,Theme.Muted));side.Controls.Add(bottom);
        root.Controls.Add(side,0,0);
        var main=new TableLayoutPanel{Dock=DockStyle.Fill,ColumnCount=1,RowCount=3,Margin=Padding.Empty};
        main.RowStyles.Add(new RowStyle(SizeType.Absolute,110));main.RowStyles.Add(new RowStyle(SizeType.Percent,100));main.RowStyles.Add(new RowStyle(SizeType.Absolute,40));
        var header=Theme.Stack();header.Padding=new Padding(28,24,12,0);header.Controls.Add(pageTitle);header.Controls.Add(subtitle);
        main.Controls.Add(header,0,0);main.Controls.Add(host,0,1);
        var bottomPanel=new Panel{Dock=DockStyle.Fill,Padding=new Padding(28,5,10,0)};footer.Dock=DockStyle.Fill;footer.AutoSize=false;bottomPanel.Controls.Add(footer);main.Controls.Add(bottomPanel,0,2);
        root.Controls.Add(main,1,0);Controls.Add(root);
        pages["focus"]=BuildFocus();pages["history"]=BuildHistory();pages["settings"]=BuildSettings();pages["guide"]=BuildGuide();pages["about"]=BuildAbout();
        foreach(var page in pages.Values){page.Dock=DockStyle.Fill;page.Visible=false;host.Controls.Add(page);}SelectPage("focus");
    }
    private void AddNavigation(TableLayoutPanel parent,string key,string text)
    {
        var b=Theme.Button(text,()=>SelectPage(key));b.Dock=DockStyle.Top;b.Width=182;b.Margin=new Padding(0,0,0,9);b.Height=48;parent.Controls.Add(b);nav[key]=b;
    }
    private static Panel ScrollPage(Control content)
    {
        var panel=new Panel{Dock=DockStyle.Fill,AutoScroll=true,BackColor=Theme.Background};
        content.Dock=DockStyle.Top;panel.Controls.Add(content);return panel;
    }
    private static Label Wrapped(string text,int width=700,float size=10,Color? color=null)
    {
        var label=Theme.Text(text,size,false,color??Theme.Muted);label.MaximumSize=new Size(width,0);return label;
    }
    private Control BuildFocus()
    {
        var grid=new TableLayoutPanel{AutoSize=true,ColumnCount=2,Dock=DockStyle.Top};
        grid.ColumnStyles.Add(new ColumnStyle(SizeType.Percent,60));grid.ColumnStyles.Add(new ColumnStyle(SizeType.Percent,40));
        var focusCard=new Card {Dock=DockStyle.Fill,MinimumSize=new Size(340,0)};var stack=Theme.Stack();
        stack.Controls.Add(Theme.Text("Góc tập trung của bạn",18,true));
        stack.Controls.Add(stateLabel);stack.Controls.Add(dial);
        var note=Wrapped("Thư giãn mắt đều đặn, theo nhịp của bạn.",400);note.Anchor=AnchorStyles.None;stack.Controls.Add(note);
        var actions=Theme.Row();actions.Padding=new Padding(0,12,0,0);actions.Controls.Add(primary);actions.Controls.Add(Theme.Button("Nghỉ ngay",StartBreak));stack.Controls.Add(actions);
        var second=Theme.Row();second.Controls.Add(snooze);second.Controls.Add(Theme.Button("Kết thúc",Stop));stack.Controls.Add(second);
        stack.Controls.Add(Wrapped("Đóng cửa sổ vẫn có thể tiếp tục nhắc ở khay hệ thống.",400,9));focusCard.Controls.Add(stack);grid.Controls.Add(focusCard,0,0);
        var aside=Theme.Stack();aside.Dock=DockStyle.Fill;
        var stats=new Card {Dock=DockStyle.Top,Margin=new Padding(0,0,0,16)};var ss=Theme.Stack();ss.Controls.Add(Theme.Text("HÔM NAY",9,true,Theme.Muted));ss.Controls.Add(completedLabel);
        ss.Controls.Add(Theme.Text("lần check-in nghỉ mắt",10,false,Theme.Muted));ss.Controls.Add(minutesLabel);ss.Controls.Add(Wrapped("Tự check-in khi đồng hồ nghỉ chạy hết.",260,9));stats.Controls.Add(ss);aside.Controls.Add(stats);
        var sun=new Card(Color.FromArgb(255,248,228)){Dock=DockStyle.Top,Margin=new Padding(0,0,0,16)};var sunStack=Theme.Stack();sunStack.Controls.Add(new SunMark());
        outdoorLabel.MaximumSize=new Size(255,0);sunStack.Controls.Add(outdoorLabel);sunStack.Controls.Add(Wrapped("Nếu thời tiết phù hợp, dành chút thời gian ở ngoài trời có bóng mát. Không nhìn trực tiếp vào mặt trời.",250,10));
        outdoor.MaximumSize=new Size(270,0);sunStack.Controls.Add(outdoor);sun.Controls.Add(sunStack);aside.Controls.Add(sun);grid.Controls.Add(aside,1,0);
        var tip=new Card(Theme.Pale){Dock=DockStyle.Top,Margin=new Padding(0,0,0,10)};var ts=Theme.Stack();ts.Controls.Add(Theme.Text("Một thói quen nhỏ, mỗi ngày",12,true));
        ts.Controls.Add(Wrapped("Khi có lời nhắc, bấm “Bắt đầu nghỉ”, nhìn ra xa và để đồng hồ đếm ngược. Bạn luôn có thể tạm dừng hoặc hoãn.",760));tip.Controls.Add(ts);grid.Controls.Add(tip,0,1);grid.SetColumnSpan(tip,2);
        return ScrollPage(grid);
    }
    private Control BuildHistory()
    {
        var layout=Theme.Stack();var card=new Card{Dock=DockStyle.Top,Margin=new Padding(0,0,0,16)};var stack=Theme.Stack();
        stack.Controls.Add(Theme.Text("Những khoảng nghỉ của bạn",16,true));historySummary=Wrapped("Chưa có dữ liệu.",750);stack.Controls.Add(historySummary);
        stack.Controls.Add(Wrapped("Lịch sử ghi lại lần đếm ngược hoàn thành, không xác nhận bạn thực sự nhìn xa. Check-in ngoài trời do bạn tự đánh dấu.",750,9));
        var buttons=Theme.Row();buttons.Controls.Add(Theme.Button("Xuất CSV",Export));buttons.Controls.Add(Theme.Button("Sao lưu JSON",ExportBackup));buttons.Controls.Add(Theme.Button("Xóa lịch sử",ClearHistory));stack.Controls.Add(buttons);
        historyGrid=new DataGridView{Height=330,Dock=DockStyle.Top,ReadOnly=true,AllowUserToAddRows=false,AllowUserToDeleteRows=false,AllowUserToResizeRows=false,
            RowHeadersVisible=false,AutoSizeColumnsMode=DataGridViewAutoSizeColumnsMode.Fill,BackgroundColor=Color.White,BorderStyle=BorderStyle.None,SelectionMode=DataGridViewSelectionMode.FullRowSelect,
            MultiSelect=false,EnableHeadersVisualStyles=false,GridColor=Theme.Line,AccessibleName="Lịch sử các lần nghỉ mắt"};
        historyGrid.ColumnHeadersDefaultCellStyle=new DataGridViewCellStyle{BackColor=Theme.Pale,ForeColor=Theme.Ink,Font=Theme.Font(10,FontStyle.Bold),Padding=new Padding(8)};
        historyGrid.DefaultCellStyle=new DataGridViewCellStyle{BackColor=Color.White,ForeColor=Theme.Ink,SelectionBackColor=Theme.Pale,SelectionForeColor=Theme.Ink,Font=Theme.Font(10),Padding=new Padding(8)};
        historyGrid.ColumnHeadersHeight=44;historyGrid.RowTemplate.Height=40;
        historyGrid.Columns.Add("date","Ngày");historyGrid.Columns.Add("time","Thời gian");historyGrid.Columns.Add("duration","Thời lượng");
        historyGrid.Columns.Add("status","Trạng thái");
        stack.Controls.Add(historyGrid);card.Controls.Add(stack);layout.Controls.Add(card);
        layout.Controls.Add(Wrapped("Chỉ hiển thị 500 lần gần nhất. CSV bao gồm toàn bộ lịch sử. Chỉ gửi tổng hợp cho Group 4 khi bạn bật chia sẻ.",760,9));
        RefreshHistory();return ScrollPage(layout);
    }
    private Control BuildSettings()
    {
        var layout=Theme.Stack();var card=new Card{Dock=DockStyle.Top,Margin=new Padding(0,0,0,16)};var stack=Theme.Stack();
        stack.Controls.Add(Theme.Text("Nhịp nghỉ phù hợp với bạn",16,true));
        intervalInput=Number(5,120,data.Settings.IntervalMinutes);breakInput=Number(20,120,data.Settings.BreakSeconds);snoozeInput=Number(1,30,data.Settings.SnoozeMinutes);
        stack.Controls.Add(Field("Nhắc sau mỗi (phút)",intervalInput));stack.Controls.Add(Field("Thời gian nghỉ (giây)",breakInput));stack.Controls.Add(Field("Tạm hoãn (phút)",snoozeInput));
        stack.Controls.Add(Wrapped("Gợi ý mặc định: 20 phút tập trung, 20 giây nhìn xa, hoãn 5 phút.",700,9));
        popupInput=Check("Hiện cửa sổ nhắc nghỉ trên màn hình",data.Settings.Popups);
        soundInput=Check("Phát âm thanh khi đến giờ nghỉ",data.Settings.Sound);
        trayInput=Check("Khi bấm X, ẩn xuống khay hệ thống",data.Settings.MinimizeToTray);
        bool isStartup=false;try{isStartup=StartupService.Enabled();}catch(Exception ex) when(ex is System.Security.SecurityException or UnauthorizedAccessException){ }
        startupInput=Check("Khởi động cùng Windows và tự bắt đầu nhắc",isStartup);
        stack.Controls.Add(popupInput);stack.Controls.Add(soundInput);stack.Controls.Add(trayInput);stack.Controls.Add(startupInput);
        stack.Controls.Add(Wrapped("Tính năng khởi động cùng Windows chỉ được bật khi bạn chọn và lưu. Nếu dùng bản portable, giữ nguyên vị trí file .exe.",700,9));
        morningInput=Check("Nhắc dành thời gian ngoài trời mỗi ngày",data.Settings.MorningReminder);stack.Controls.Add(morningInput);
        morningTime=new DateTimePicker{Format=DateTimePickerFormat.Custom,CustomFormat="HH:mm",ShowUpDown=true,Width=110,Value=DateTime.Today.AddHours(data.Settings.MorningHour).AddMinutes(data.Settings.MorningMinute),AccessibleName="Giờ nhắc ngoài trời"};
        stack.Controls.Add(Field("Giờ nhắc",morningTime));stack.Controls.Add(Wrapped("Lời nhắc ngoài trời cần app đang chạy và máy đang thức; lịch bỏ lỡ sẽ không được gửi bù.",700,9));
        var actions=Theme.Row();actions.Padding=new Padding(0,12,0,0);actions.Controls.Add(Theme.Button("Lưu cài đặt",SaveSettings,true));actions.Controls.Add(Theme.Button("Thử thông báo",TestReminder));stack.Controls.Add(actions);
        saveFeedback=Wrapped("Thay đổi thời gian sẽ đặt lại chu kỳ hiện tại sau khi lưu.",700,9);stack.Controls.Add(saveFeedback);card.Controls.Add(stack);layout.Controls.Add(card);
        var info=new Card(Theme.Pale){Dock=DockStyle.Top,Margin=Padding.Empty};var ins=Theme.Stack();ins.Controls.Add(Theme.Text("Bạn kiểm soát dữ liệu",12,true));
        ins.Controls.Add(Wrapped("Cài đặt và lịch sử lưu trong tài khoản Windows của bạn. App không đọc nội dung màn hình hoặc lịch sử trình duyệt. Thống kê theo ngày chỉ được gửi khi bạn đồng ý bên dưới.",720));
        ins.Controls.Add(Theme.Button("Mở thư mục dữ liệu",()=>SafeAction(()=>{Directory.CreateDirectory(store.DirectoryPath);Process.Start(new ProcessStartInfo("explorer.exe",store.DirectoryPath){UseShellExecute=true});})));info.Controls.Add(ins);layout.Controls.Add(info);
        var shareCard=new Card{Dock=DockStyle.Top};var sharing=Theme.Stack();
        sharing.Controls.Add(Theme.Text("Chia sẻ thống kê với Group 4",16,true));
        sharing.Controls.Add(Wrapped("Tự nguyện gửi tổng số check-in nghỉ mắt, tổng giây nghỉ và check-in ngoài trời theo ngày từ toàn bộ lịch sử hiện tại để nhóm tổng hợp dự án. Không gửi tên, email hay thời điểm từng lần nghỉ. Mỗi bản cài có một mã thiết bị riêng.",720));
        collectorInput=new TextBox{Width=430,Text=statistics.State.Endpoint,PlaceholderText="Địa chỉ HTTPS do Group 4 cung cấp",AccessibleName="Địa chỉ máy chủ Group 4"};
        sharing.Controls.Add(Field("Máy chủ nhận thống kê",collectorInput));
        sharingConsent=Check("Tôi đồng ý chia sẻ thống kê với Group 4",statistics.State.Enabled);sharingConsent.CheckedChanged+=(_,_)=>UpdateSharingDisplay();sharing.Controls.Add(sharingConsent);
        var shareActions=Theme.Row();
        shareEnable=Theme.Button("Bật chia sẻ",()=>{if(sharingConsent.Checked)_ = statistics.EnableAsync(collectorInput.Text);},true);
        shareNow=Theme.Button("Gửi ngay",()=>_ = statistics.SyncAsync(true));
        shareStop=Theme.Button("Ngừng chia sẻ",()=>{statistics.Stop();sharingConsent.Checked=false;});
        shareDelete=Theme.Button("Xóa thống kê đã gửi",()=>
        {
            if(MessageBox.Show(this,"Ngừng chia sẻ và xóa thống kê của mã thiết bị này trên máy chủ? Lịch sử trên máy vẫn được giữ. Khi mất mạng, yêu cầu xóa sẽ chờ gửi lại.","Xóa thống kê máy chủ",MessageBoxButtons.YesNo,MessageBoxIcon.Question,MessageBoxDefaultButton.Button2)==DialogResult.Yes){statistics.Withdraw();sharingConsent.Checked=false;}
        });
        shareActions.Controls.AddRange([shareEnable,shareNow,shareStop,shareDelete]);sharing.Controls.Add(shareActions);
        sharingFeedback=Wrapped(statistics.Status,720,9);sharing.Controls.Add(sharingFeedback);
        sharing.Controls.Add(Wrapped("Ngừng chia sẻ chỉ dừng gửi mới. Dùng Xóa thống kê đã gửi để xóa ở máy chủ. Nếu đang chia sẻ, xóa hoặc nhập lịch sử sẽ cập nhật lại số liệu máy chủ ở lần gửi tiếp theo. Khi ngoại tuyến, app giữ dữ liệu và thử lại sau.",720,9));
        shareCard.Controls.Add(sharing);layout.Controls.Add(shareCard);
        return ScrollPage(layout);
    }
    private static NumericUpDown Number(int min,int max,int value)=>new(){Minimum=min,Maximum=max,Value=value,Width=110,Font=Theme.Font(11),Margin=new Padding(0,0,0,12)};
    private void UpdateSharingDisplay()
    {
        if(IsDisposed||sharingFeedback is null)return;
        var s=statistics.State;
        sharingFeedback.Text=statistics.Status+(s.LastSync is null?"":$" Gửi thành công: {s.LastSync.Value.LocalDateTime:g}.")+(s.ParticipantId is null?"":$"\nMã thiết bị: {s.ParticipantId}");
        shareEnable!.Enabled=!statistics.Busy&&!s.Enabled&&!s.PendingDelete&&sharingConsent!.Checked;
        shareStop!.Enabled=s.Enabled;shareNow!.Enabled=s.Enabled&&!statistics.Busy;shareDelete!.Enabled=s.ParticipantId is not null&&!s.PendingDelete;
        sharingConsent!.Enabled=!s.Enabled&&!s.PendingDelete&&!statistics.Busy;
        collectorInput!.Enabled=!s.Enabled&&!s.PendingDelete&&!statistics.Busy;
    }
    private static CheckBox Check(string title,bool value)=>new(){Text=title,Checked=value,AutoSize=true,Font=Theme.Font(),Margin=new Padding(0,6,0,10),AccessibleName=title};
    private static Control Field(string title,Control input)
    {
        var row=Theme.Row();var label=Theme.Text(title);label.Width=255;label.AutoSize=false;label.Height=30;label.Margin=new Padding(0,3,12,6);input.AccessibleName=title;row.Controls.Add(label);row.Controls.Add(input);return row;
    }
    private Control BuildGuide()
    {
        var layout=Theme.Stack();
        void Section(string title,string body)
        {
            var card=new Card{Dock=DockStyle.Top,Margin=new Padding(0,0,0,14)};var s=Theme.Stack();s.Controls.Add(Theme.Text(title,14,true));s.Controls.Add(Wrapped(body,750));card.Controls.Add(s);layout.Controls.Add(card);
        }
        Section("Bắt đầu trong ba bước","1. Bấm “Bắt đầu tập trung”.\n2. Khi đến giờ, chọn “Bắt đầu nghỉ” và nhìn ra xa khoảng 6 mét.\n3. Sau khi đếm ngược kết thúc, app ghi một lần hoàn thành và tự bắt đầu chu kỳ mới.");
        Section("Check-in nghỉ mắt và thống kê Group 4","Đồng hồ nghỉ chạy hết sẽ tự ghi “Đã check-in nghỉ mắt”. Không cần bấm thêm. Hoãn, đóng cửa sổ nhắc hoặc nghỉ dở không được tính. Check-in ngoài trời vẫn tự đánh dấu riêng.\n\nTrong Cài đặt, nhập địa chỉ máy chủ do nhóm cung cấp, đọc nội dung chia sẻ rồi chọn đồng ý và Bật chia sẻ. Mặc định tắt; không chia sẻ vẫn dùng đồng hồ bình thường. Ngày hoạt động là ngày có một lần nghỉ hoàn thành hoặc check-in ngoài trời.");
        Section("Dễ dùng trong lúc học và làm việc","Tạm dừng giữ nguyên thời gian còn lại. Hoãn lùi lời nhắc theo số phút bạn đã chọn. “Kết thúc” dừng chu kỳ. Bấm X sẽ ẩn xuống khay hệ thống nếu tùy chọn này đang bật; bấm đúp biểu tượng mặt trời để mở lại. Chọn “Thoát ứng dụng” để dừng hoàn toàn.");
        Section("Khi máy ngủ hoặc khóa","App tạm ngừng phiên đang chạy khi máy ngủ và bắt đầu lại một chu kỳ đầy đủ sau khi máy thức. Không tính khoảng ngủ là nghỉ mắt hoàn thành. Khóa màn hình cũng tạm ngừng phiên, mở khóa sẽ bắt đầu chu kỳ mới.");
        Section("Không thấy thông báo?","Thử nút “Thử thông báo” và kiểm tra cài đặt thông báo của Windows, chế độ Không làm phiền và âm lượng. Cửa sổ nhắc là một kênh riêng, có thể bật trong Cài đặt. App không tự tắt chế độ Không làm phiền của Windows. Lời nhắc không hoạt động khi app đã thoát hoặc máy đã tắt.");
        Section("Về dự án","SunReminder là sản phẩm hỗ trợ thói quen cho chiến dịch 7 tuần của Group 4. Bài đăng fanpage, video TikTok và khảo sát được nhóm tổ chức riêng. App không chẩn đoán bệnh, không đo thị lực và không cam kết giảm độ cận. Thống kê ứng dụng phản ánh thao tác và đồng hồ đếm ngược.");
        Section("Mang thói quen sang thiết bị khác","Windows: dùng bản EXE để có khay hệ thống, lời nhắc nền và khởi động cùng máy. macOS, Android và iPhone: dùng bản web SunReminder qua trình duyệt và thêm vào màn hình chính khi trình duyệt hỗ trợ. Bản web cần được phục vụ qua HTTPS để cài đặt và lưu ngoại tuyến.\n\nChọn Lịch sử → Sao lưu JSON, rồi nhập file trong Cài đặt của bản web. Dữ liệu được sao chép thủ công, không tự đồng bộ giữa các thiết bị. Bản web không đảm bảo nhắc khi đóng app hoặc khóa màn hình; lần nghỉ bị gián đoạn không được ghi hoàn thành.");
        return ScrollPage(layout);
    }
    private Control BuildAbout()
    {
        var layout=Theme.Stack();
        var intro=new Card(Theme.Pale){Dock=DockStyle.Top};var content=Theme.Stack();content.Controls.Add(new SunMark());
        content.Controls.Add(Theme.Text("Một chút nắng. Một nhịp nghỉ.",22,true));
        content.Controls.Add(Wrapped("SunReminder — Nắng sớm, mắt khỏe. Người bạn nhỏ bên bàn học, giúp bạn nhớ dành thời gian cho đôi mắt và xây dựng thói quen nghỉ đều đặn.",730,11));intro.Controls.Add(content);layout.Controls.Add(intro);
        var team=new Card{Dock=DockStyle.Top};var members=Theme.Stack();members.Controls.Add(Theme.Text("Được thực hiện bởi Group 4",17,true));
        members.Controls.Add(Wrapped("Bốn thành viên, cùng chăm chút cho một thói quen nhỏ.",730));
        members.Controls.Add(Theme.Text("01   Nguyễn Văn Mẫn",13,true));members.Controls.Add(Theme.Text("        Leader · Trưởng nhóm",10,false,Theme.Green));
        members.Controls.Add(Theme.Text("02   Nguyễn Trần Đức Anh",13,true));
        members.Controls.Add(Theme.Text("03   Nguyễn Trần Phúc Đăng",13,true));
        members.Controls.Add(Theme.Text("04   Phan Võ Anh Hào",13,true));team.Controls.Add(members);layout.Controls.Add(team);
        var features=new Card{Dock=DockStyle.Top};var items=Theme.Stack();items.Controls.Add(Theme.Text("Nhỏ gọn, đủ điều bạn cần",15,true));
        items.Controls.Add(Wrapped("• Đếm ngược tập trung, tạm dừng, nghỉ ngay và hoãn lời nhắc.\n• Thông báo Windows, cửa sổ nghỉ và khay hệ thống.\n• Lịch sử, thống kê 7 ngày, CSV và sao lưu JSON.\n• Check-in ngoài trời và tùy chỉnh lịch nhắc.\n• Dữ liệu lưu tại thiết bị, không cần tài khoản.",730,11));
        items.Controls.Add(Wrapped("Dự án hỗ trợ thói quen; không đo thị lực hoặc chẩn đoán bệnh. Thống kê phản ánh lần đếm ngược hoàn thành và check-in tự đánh dấu.",730,9));features.Controls.Add(items);layout.Controls.Add(features);
        return ScrollPage(layout);
    }
    private void SelectPage(string key)
    {
        activePage=key;foreach(var p in pages)p.Value.Visible=p.Key==key;
        if(pages[key] is ScrollableControl scroll)scroll.AutoScrollPosition=Point.Empty;
        foreach(var b in nav){b.Value.BackColor=b.Key==key?Theme.Pale:Color.White;b.Value.ForeColor=b.Key==key?Theme.Green:Theme.Muted;b.Value.Invalidate();}
        (pageTitle.Text,subtitle.Text)=key switch
        {
            "history"=>("Từng khoảng nghỉ đều có ý nghĩa.","Nhìn lại thói quen của bạn, theo từng ngày."),
            "settings"=>("Theo nhịp của riêng bạn.","Một vài tùy chỉnh nhỏ để lời nhắc phù hợp hơn."),
            "guide"=>("Bắt đầu thật nhẹ nhàng.","Mọi điều bạn cần để sử dụng SunReminder."),
            "about"=>("Xin chào, chúng mình là Group 4.","Nhóm thực hiện SunReminder · Nắng sớm, mắt khỏe."),
            _=>("Một nhịp nghỉ, thêm dễ chịu.","Dành một chút thời gian cho đôi mắt của bạn.")
        };
        if(key=="history")RefreshHistory();
    }
    private void PrimaryAction()
    {
        switch(engine.State)
        {
            case SessionState.Idle:engine.Start();break;
            case SessionState.Paused:engine.Resume();if(engine.State==SessionState.Breaking&&data.Settings.Popups)ShowBreakWindow();break;
            case SessionState.Due:StartBreak();break;
            default:engine.Pause();CloseBreakWindow();break;
        }
        UpdateDisplay();
    }
    private void StartBreak(){engine.StartBreak();if(data.Settings.Popups)ShowBreakWindow();UpdateDisplay();}
    private void Snooze(){engine.Snooze();CloseBreakWindow();UpdateDisplay();}
    private void Stop(){engine.Stop();CloseBreakWindow();UpdateDisplay();footer.Text="Đã kết thúc phiên. Bấm Bắt đầu khi bạn sẵn sàng.";}
    private void OnDue()
    {
        Notify("Đến giờ nghỉ mắt",$"Nhìn ra xa khoảng 6 mét trong {data.Settings.BreakSeconds} giây. Bấm để mở SunReminder.");
        if(data.Settings.Sound)SystemSounds.Asterisk.Play();
        if(data.Settings.Popups)ShowBreakWindow();UpdateDisplay();
    }
    private void ShowBreakWindow()
    {
        if(breakWindow is not null&&!breakWindow.IsDisposed){breakWindow.BringToFront();return;}
        breakWindow=new BreakForm(appIcon,data.Settings.BreakSeconds,data.Settings.SnoozeMinutes,false);
        breakWindow.BeginRest+=()=>{engine.StartBreak();UpdateDisplay();};breakWindow.Later+=()=>{engine.Snooze();UpdateDisplay();};
        breakWindow.FormClosed+=(_,_)=>breakWindow=null;breakWindow.Show();
    }
    private void CloseBreakWindow()
    {
        if(breakWindow is null)return;var current=breakWindow;breakWindow=null;current.SilentClose=true;current.Close();
    }
    private void TestReminder()
    {
        Notify("Thông báo thử SunReminder","Đây là bản thử. Chu kỳ hiện tại và lịch sử không thay đổi.");
        var test=new BreakForm(appIcon,data.Settings.BreakSeconds,data.Settings.SnoozeMinutes,true);test.Show();
        if(data.Settings.Sound)SystemSounds.Asterisk.Play();
    }
    private void Notify(string title,string message)
    {
        tray.BalloonTipTitle=title;tray.BalloonTipText=message;tray.BalloonTipIcon=ToolTipIcon.Info;tray.ShowBalloonTip(7000);
    }
    private void OnTick()
    {
        var now=DateTime.Now;
        // If UI updates were blocked or sleep events were missed, never count that gap as a completed break.
        if(!screenLocked&&!systemSuspended&&(now-lastWallTime).TotalSeconds>8){engine.Suspend();engine.ResumeFromSleep();CloseBreakWindow();}
        lastWallTime=now;if(!screenLocked&&!systemSuspended)engine.Tick();UpdateDisplay();
        if(now>=nextStatisticsAttempt){nextStatisticsAttempt=now.AddSeconds(30);_ = statistics.SyncAsync();}
        var today=now.ToString("yyyy-MM-dd",CultureInfo.InvariantCulture);
        if(today!=dayKey){dayKey=today;UpdateStats();RefreshHistory();}
        var p=data.Settings;
        if(!screenLocked&&!systemSuspended&&p.MorningReminder&&now.Hour==p.MorningHour&&now.Minute==p.MorningMinute&&data.LastMorningNotification!=today)
        {
            data.LastMorningNotification=today;SaveData();Notify("Một khoảng trời cho hôm nay","Nếu thời tiết phù hợp, ra ngoài nơi có bóng mát. Không nhìn trực tiếp vào mặt trời.");
        }
    }
    private void UpdateDisplay()
    {
        double remaining=engine.Remaining;int seconds=(int)Math.Ceiling(remaining);
        dial.TimeText=$"{seconds/60:00}:{seconds%60:00}";
        dial.Progress=engine.State==SessionState.Idle?0:Math.Clamp(1-remaining/engine.TotalSeconds,0,1);
        dial.Resting=engine.State==SessionState.Breaking||engine.IsPausedBreak;
        (stateLabel.Text,dial.Caption,primary.Text)=engine.State switch
        {
            SessionState.Running=>("ĐANG TẬP TRUNG","ĐẾN LẦN NGHỈ TIẾP THEO","Tạm dừng"),
            SessionState.Snoozed=>("ĐÃ TẠM HOÃN","SẼ NHẮC LẠI SAU","Tạm dừng"),
            SessionState.Due=>("ĐẾN GIỜ NGHỈ MẮT","SẴN SÀNG NHÌN RA XA","Bắt đầu nghỉ"),
            SessionState.Breaking=>("ĐANG NGHỈ MẮT","HÃY NHÌN RA XA","Tạm dừng"),
            SessionState.Paused=>("ĐÃ TẠM DỪNG","TIẾP TỤC KHI SẴN SÀNG","Tiếp tục"),
            _=>("SẴN SÀNG BẮT ĐẦU","ĐẾN LẦN NGHỈ TIẾP THEO","Bắt đầu tập trung")
        };
        dial.AccessibleDescription=$"{stateLabel.Text}, còn {seconds/60} phút {seconds%60} giây";dial.Invalidate();
        snooze.Text=$"Hoãn {data.Settings.SnoozeMinutes} phút";snooze.Enabled=engine.State!=SessionState.Idle;
        tray.Text=$"SunReminder • {dial.TimeText}";
        if(breakWindow is not null)breakWindow.UpdateCountdown(engine.State==SessionState.Due?data.Settings.BreakSeconds:remaining,data.Settings.BreakSeconds,engine.State==SessionState.Breaking);
    }
    private void UpdateStats()
    {
        var today=DateTime.Today;var records=data.Breaks.Where(b=>b.CompletedAt.LocalDateTime.Date==today).ToList();
        completedLabel.Text=records.Count.ToString();int seconds=records.Sum(b=>b.DurationSeconds);
        minutesLabel.Text=seconds<60?$"{seconds} giây":$"{seconds/60} phút {seconds%60:00} giây";
        bool done=data.OutdoorDays.Contains(DateTime.Now.ToString("yyyy-MM-dd",CultureInfo.InvariantCulture));
        outdoorLabel.Text=done?"Bạn đã check-in hôm nay":"Một khoảng trời cho hôm nay";
        outdoor.Text=done?"Bỏ check-in hôm nay":"Hôm nay tôi đã ra ngoài";
    }
    private void ToggleOutdoor()
    {
        var today=DateTime.Now.ToString("yyyy-MM-dd",CultureInfo.InvariantCulture);
        if(!data.OutdoorDays.Add(today))data.OutdoorDays.Remove(today);SaveData();UpdateStats();RefreshHistory();
    }
    private void RefreshHistory()
    {
        if(historyGrid is null||historySummary is null)return;
        historyGrid.Rows.Clear();foreach(var r in data.Breaks.OrderByDescending(b=>b.CompletedAt).Take(500))
            historyGrid.Rows.Add(r.CompletedAt.LocalDateTime.ToString("dd/MM/yyyy"),r.CompletedAt.LocalDateTime.ToString("HH:mm:ss"),$"{r.DurationSeconds} giây","Đã check-in nghỉ mắt");
        int week=data.Breaks.Count(b=>b.CompletedAt.LocalDateTime.Date>=DateTime.Today.AddDays(-6)&&b.CompletedAt.LocalDateTime.Date<=DateTime.Today);
        int outside=Enumerable.Range(0,7).Count(n=>data.OutdoorDays.Contains(DateTime.Today.AddDays(-n).ToString("yyyy-MM-dd",CultureInfo.InvariantCulture)));
        historySummary.Text=data.Breaks.Count==0?"Chưa có lần nghỉ nào. Hoàn thành một lần đếm ngược để bắt đầu lịch sử.":$"7 ngày gần nhất: {week} lần nghỉ mắt · {outside}/7 ngày check-in ngoài trời. Tổng cộng: {data.Breaks.Count} lần nghỉ.";
    }
    private void SaveSettings()
    {
        SafeAction(()=>
        {
            StartupService.Set(startupInput!.Checked);
            var p=new Preferences{IntervalMinutes=(int)intervalInput!.Value,BreakSeconds=(int)breakInput!.Value,SnoozeMinutes=(int)snoozeInput!.Value,
                Popups=popupInput!.Checked,Sound=soundInput!.Checked,MinimizeToTray=trayInput!.Checked,MorningReminder=morningInput!.Checked,
                MorningHour=morningTime!.Value.Hour,MorningMinute=morningTime.Value.Minute};
            bool timingChanged=p.IntervalMinutes!=data.Settings.IntervalMinutes||p.BreakSeconds!=data.Settings.BreakSeconds||p.SnoozeMinutes!=data.Settings.SnoozeMinutes;
            data.Settings=p;
            if(timingChanged){CloseBreakWindow();engine.Configure(p.IntervalMinutes,p.BreakSeconds,p.SnoozeMinutes);}
            if(!p.Popups)CloseBreakWindow();
            bool saved=SaveData();saveFeedback!.Text=saved?(timingChanged?"Đã lưu. Chu kỳ hiện tại đã được đặt lại.":"Đã lưu cài đặt."):"Đang áp dụng tạm thời. Không lưu được xuống máy.";
            saveFeedback.ForeColor=saved?Theme.Green:Color.Firebrick;UpdateDisplay();
        });
    }
    private bool SaveData()
    {
        try{store.Save(data);saveFailed=false;statistics.MarkChanged();return true;}
        catch(Exception ex) when(ex is IOException or UnauthorizedAccessException)
        {
            footer.Text="Không lưu được dữ liệu. Kiểm tra dung lượng hoặc quyền thư mục.";
            if(!saveFailed){saveFailed=true;MessageBox.Show(this,$"Không thể lưu dữ liệu: {ex.Message}","SunReminder",MessageBoxButtons.OK,MessageBoxIcon.Warning);}return false;
        }
    }
    private void Export()
    {
        using var dialog=new SaveFileDialog{Filter="CSV (*.csv)|*.csv",FileName=$"SunReminder-{DateTime.Now:yyyyMMdd}.csv"};
        if(dialog.ShowDialog(this)==DialogResult.OK)SafeAction(()=>{LocalStore.ExportCsv(dialog.FileName,data.Breaks);footer.Text="Đã xuất lịch sử nghỉ mắt ra CSV.";});
    }
    private void ExportBackup()
    {
        using var dialog=new SaveFileDialog{Filter="JSON (*.json)|*.json",FileName=$"SunReminder-backup-{DateTime.Now:yyyyMMdd}.json"};
        if(dialog.ShowDialog(this)==DialogResult.OK)SafeAction(()=>
        {
            File.WriteAllText(dialog.FileName,System.Text.Json.JsonSerializer.Serialize(data,new System.Text.Json.JsonSerializerOptions{WriteIndented=true}),new System.Text.UTF8Encoding(false));
            footer.Text="Đã sao lưu cài đặt, lịch sử và check-in. Có thể nhập file này vào bản web.";
        });
    }
    private void ClearHistory()
    {
        if(MessageBox.Show(this,"Xóa toàn bộ lịch sử nghỉ mắt và ngoài trời? Cài đặt vẫn giữ. Nếu đang chia sẻ, máy chủ sẽ cập nhật theo lịch sử trống khi gửi thành công. Nếu đã ngừng chia sẻ, dùng Xóa thống kê đã gửi để xóa ở máy chủ. Bạn có thể sao lưu trước.","Xóa lịch sử",MessageBoxButtons.YesNo,MessageBoxIcon.Warning,MessageBoxDefaultButton.Button2)!=DialogResult.Yes)return;
        var oldBreaks=data.Breaks.ToList();var oldOutdoor=new HashSet<string>(data.OutdoorDays);data.Breaks.Clear();data.OutdoorDays.Clear();
        if(!SaveData()){data.Breaks=oldBreaks;data.OutdoorDays=oldOutdoor;}UpdateStats();RefreshHistory();
    }
    private void SafeAction(Action action)
    {
        try{action();}catch(Exception ex) when(ex is IOException or UnauthorizedAccessException or System.Security.SecurityException or System.ComponentModel.Win32Exception)
        {MessageBox.Show(this,ex.Message,"Không thực hiện được thao tác",MessageBoxButtons.OK,MessageBoxIcon.Warning);}
    }
    private void PowerChanged(object sender,PowerModeChangedEventArgs e)
    {
        if(IsDisposed||!IsHandleCreated)return;
        BeginInvoke(()=>{if(e.Mode==PowerModes.Suspend)SetUnavailable(true,screenLocked);else if(e.Mode==PowerModes.Resume)SetUnavailable(false,screenLocked);});
    }
    private void SetUnavailable(bool sleeping, bool locked)
    {
        bool wasUnavailable=systemSuspended||screenLocked;
        systemSuspended=sleeping;screenLocked=locked;
        if(!wasUnavailable&&(sleeping||locked)){engine.Suspend();CloseBreakWindow();}
        else if(wasUnavailable&&!sleeping&&!locked){engine.ResumeFromSleep();lastWallTime=DateTime.Now;}
        UpdateDisplay();
    }
    private void RestoreWindow(){Show();WindowState=FormWindowState.Normal;Activate();}
    private void ExitApp(){quitting=true;Close();}
    private void OnClosing(object? sender,FormClosingEventArgs e)
    {
        if(!quitting&&e.CloseReason==CloseReason.UserClosing&&data.Settings.MinimizeToTray)
        {
            e.Cancel=true;Hide();Notify("SunReminder vẫn đang chạy","Bấm đúp biểu tượng mặt trời ở khay hệ thống để mở lại. Chọn Thoát ứng dụng để dừng.");return;
        }
        timer.Stop();CloseBreakWindow();SystemEvents.PowerModeChanged-=PowerChanged;SaveData();statistics.Changed-=UpdateSharingDisplay;statistics.Dispose();tray.Visible=false;tray.Dispose();timer.Dispose();
    }
    protected override void WndProc(ref Message m)
    {
        const int WM_WTSSESSION_CHANGE=0x02B1;
        if(m.Msg==WM_WTSSESSION_CHANGE)
        {
            if(m.WParam.ToInt32()==7)SetUnavailable(systemSuspended,true);
            if(m.WParam.ToInt32()==8)SetUnavailable(systemSuspended,false);
        }
        base.WndProc(ref m);
    }
    protected override void OnHandleCreated(EventArgs e){base.OnHandleCreated(e);NativeMethods.WTSRegisterSessionNotification(Handle,0);}
    protected override void OnHandleDestroyed(EventArgs e){NativeMethods.WTSUnRegisterSessionNotification(Handle);base.OnHandleDestroyed(e);}
    private static class NativeMethods
    {
        [System.Runtime.InteropServices.DllImport("Wtsapi32.dll")]internal static extern bool WTSRegisterSessionNotification(IntPtr window,int flags);
        [System.Runtime.InteropServices.DllImport("Wtsapi32.dll")]internal static extern bool WTSUnRegisterSessionNotification(IntPtr window);
    }
}
