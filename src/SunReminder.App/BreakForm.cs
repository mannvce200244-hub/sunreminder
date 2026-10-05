namespace SunReminder.App;
internal sealed class BreakForm : Form
{
    private readonly CountdownDial dial = new() { Dock = DockStyle.Fill, Height = 240, Resting = true };
    private readonly Button begin;
    private readonly Label hint;
    internal event Action? BeginRest;
    internal event Action? Later;
    [System.ComponentModel.DesignerSerializationVisibility(System.ComponentModel.DesignerSerializationVisibility.Hidden)]
    internal bool SilentClose { get; set; }
    internal BreakForm(Icon appIcon, int seconds, int snooze, bool preview)
    {
        Text = preview ? "SunReminder • Thử thông báo" : "SunReminder • Đến giờ nghỉ mắt";
        Icon=appIcon;ClientSize=new Size(520,490); MinimumSize=Size;MaximizeBox=false;MinimizeBox=false;
        StartPosition=FormStartPosition.CenterScreen;TopMost=true;BackColor=Color.White;Font=Theme.Font();
        AutoScaleDimensions=new SizeF(96,96);AutoScaleMode=AutoScaleMode.Dpi;
        var layout=new TableLayoutPanel {Dock=DockStyle.Fill,Padding=new Padding(24),ColumnCount=1,RowCount=5};
        layout.RowStyles.Add(new RowStyle(SizeType.AutoSize));layout.RowStyles.Add(new RowStyle(SizeType.AutoSize));
        layout.RowStyles.Add(new RowStyle(SizeType.Percent,100));layout.RowStyles.Add(new RowStyle(SizeType.AutoSize));layout.RowStyles.Add(new RowStyle(SizeType.AutoSize));
        layout.Controls.Add(Theme.Text(preview ? "Đây là thông báo thử" : "Cho đôi mắt một chút thảnh thơi",17,true));
        hint=Theme.Text("Nhìn ra xa khoảng 6 mét. Thả lỏng vai và chớp mắt tự nhiên.",10,false,Theme.Muted);hint.MaximumSize=new Size(410,0);layout.Controls.Add(hint);
        dial.TimeText=$"{seconds/60:00}:{seconds%60:00}";dial.Caption="SẴN SÀNG NGHỈ MẮT";layout.Controls.Add(dial);
        var row=Theme.Row();begin=Theme.Button(preview ? "Đóng bản thử" : "Bắt đầu nghỉ",()=>{if(preview){SilentClose=true;Close();}else BeginRest?.Invoke();},true);
        row.Controls.Add(begin);
        if(!preview)row.Controls.Add(Theme.Button($"Hoãn {snooze} phút",()=>{Later?.Invoke();SilentClose=true;Close();}));
        layout.Controls.Add(row);layout.Controls.Add(Theme.Text(preview ? "Bản thử không ghi vào lịch sử." : "Đóng cửa sổ này sẽ tạm hoãn lời nhắc.",9,false,Theme.Muted));
        Controls.Add(layout);
        FormClosing+=(_,_)=>{if(!SilentClose&&!preview)Later?.Invoke();};
    }
    internal void UpdateCountdown(double remaining, int total, bool breaking)
    {
        int s=(int)Math.Ceiling(remaining);dial.TimeText=$"{s/60:00}:{s%60:00}";
        dial.Progress=breaking?1-remaining/total:0;dial.Caption=breaking?"HÃY NHÌN RA XA":"SẴN SÀNG NGHỈ MẮT";dial.Invalidate();
        begin.Enabled=!breaking;begin.Text=breaking?"Đang nghỉ mắt…":"Bắt đầu nghỉ";
    }
}
