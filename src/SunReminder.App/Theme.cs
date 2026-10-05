using System.Drawing.Drawing2D;
namespace SunReminder.App;

internal static class Theme
{
    internal static readonly Color Background = Color.FromArgb(248, 247, 242);
    internal static readonly Color Ink = Color.FromArgb(38, 61, 51);
    internal static readonly Color Muted = Color.FromArgb(100, 112, 103);
    internal static readonly Color Green = Color.FromArgb(48, 105, 78);
    internal static readonly Color Pale = Color.FromArgb(234, 241, 228);
    internal static readonly Color Gold = Color.FromArgb(222, 155, 50);
    internal static readonly Color Line = Color.FromArgb(225, 229, 218);
    internal static Font Font(float size = 10, FontStyle style = FontStyle.Regular) => new("Segoe UI", size, style);
    internal static Label Text(string value, float size = 10, bool bold = false, Color? color = null) => new()
    {
        Text = value, AutoSize = true, Font = Font(size, bold ? FontStyle.Bold : FontStyle.Regular),
        ForeColor = color ?? Ink, BackColor = Color.Transparent, Margin = new Padding(0, 0, 0, 8)
    };
    internal static Button Button(string text, Action action, bool primary = false)
    {
        var b = new SoftButton { Text = text, AutoSize = true, MinimumSize = new Size(110, 46),
            Padding = new Padding(16, 7, 16, 7), Margin = new Padding(0, 0, 10, 10),
            BackColor = primary ? Green : Pale, ForeColor = primary ? Color.White : Green,
            Font = Font(10, FontStyle.Bold), AccessibleName = text };
        b.Click += (_, _) => action(); return b;
    }
    internal static TableLayoutPanel Stack() => new()
    {
        Dock = DockStyle.Top, AutoSize = true, AutoSizeMode = AutoSizeMode.GrowAndShrink,
        ColumnCount = 1, Margin = Padding.Empty, Padding = Padding.Empty
    };
    internal static FlowLayoutPanel Row() => new() { Dock = DockStyle.Top, AutoSize = true, WrapContents = true, Margin = Padding.Empty, Padding = Padding.Empty };
    internal static GraphicsPath Round(RectangleF r, float radius)
    {
        float d = radius * 2; var p = new GraphicsPath();
        p.AddArc(r.X, r.Y, d, d, 180, 90); p.AddArc(r.Right - d, r.Y, d, d, 270, 90);
        p.AddArc(r.Right - d, r.Bottom - d, d, d, 0, 90); p.AddArc(r.X, r.Bottom - d, d, d, 90, 90); p.CloseFigure(); return p;
    }
}
internal sealed class SoftButton : Button
{
    private bool hovered;
    public SoftButton() { FlatStyle = FlatStyle.Flat; FlatAppearance.BorderSize = 0; Cursor = Cursors.Hand; }
    protected override void OnMouseEnter(EventArgs e) { hovered=true;Invalidate();base.OnMouseEnter(e); }
    protected override void OnMouseLeave(EventArgs e) { hovered=false;Invalidate();base.OnMouseLeave(e); }
    protected override void OnPaint(PaintEventArgs e)
    {
        e.Graphics.SmoothingMode = SmoothingMode.AntiAlias;
        using var path = Theme.Round(new RectangleF(1, 1, Width - 3, Height - 3), 10);
        e.Graphics.Clear(Parent?.BackColor ?? Theme.Background);
        var fill = hovered && Enabled ? ControlPaint.Light(BackColor, .12f) : BackColor;
        using var brush = new SolidBrush(Enabled ? fill : Theme.Line); e.Graphics.FillPath(brush, path);
        TextRenderer.DrawText(e.Graphics, Text, Font, ClientRectangle, Enabled ? ForeColor : Theme.Muted,
            TextFormatFlags.HorizontalCenter | TextFormatFlags.VerticalCenter | TextFormatFlags.EndEllipsis);
        if (Focused) { using var pen = new Pen(Theme.Gold, 2); e.Graphics.DrawPath(pen, path); }
    }
}
internal sealed class Card : Panel
{
    internal Card(Color? fill = null)
    {
        BackColor = fill ?? Color.White; Padding = new Padding(24); Margin = new Padding(0, 0, 18, 18);
        DoubleBuffered = true; AutoSize = true; AutoSizeMode = AutoSizeMode.GrowAndShrink;
    }
    protected override void OnPaint(PaintEventArgs e)
    {
        base.OnPaint(e); e.Graphics.SmoothingMode = SmoothingMode.AntiAlias;
        e.Graphics.Clear(Parent?.BackColor ?? Theme.Background);
        using var path = Theme.Round(new RectangleF(.5f, .5f, Width - 2, Height - 2), 22);
        using var fill = new SolidBrush(BackColor);e.Graphics.FillPath(fill,path);
        using var pen = new Pen(Theme.Line); e.Graphics.DrawPath(pen, path);
    }
}
internal sealed class CountdownDial : Control
{
    [System.ComponentModel.DesignerSerializationVisibility(System.ComponentModel.DesignerSerializationVisibility.Hidden)]
    internal string TimeText { get; set; } = "20:00";
    [System.ComponentModel.DesignerSerializationVisibility(System.ComponentModel.DesignerSerializationVisibility.Hidden)]
    internal string Caption { get; set; } = "ĐẾN LẦN NGHỈ TIẾP THEO";
    [System.ComponentModel.DesignerSerializationVisibility(System.ComponentModel.DesignerSerializationVisibility.Hidden)]
    internal double Progress { get; set; }
    [System.ComponentModel.DesignerSerializationVisibility(System.ComponentModel.DesignerSerializationVisibility.Hidden)]
    internal bool Resting { get; set; }
    internal CountdownDial()
    {
        DoubleBuffered = true; Size = new Size(340, 272); BackColor = Color.White;
        AccessibleName = "Thời gian còn lại";
    }
    protected override void OnPaint(PaintEventArgs e)
    {
        base.OnPaint(e); var g = e.Graphics; g.SmoothingMode = SmoothingMode.AntiAlias;
        float scale=DeviceDpi/96f;
        float diameter = Math.Min(Width - 24*scale, Height - 18*scale); var r = new RectangleF((Width - diameter) / 2, 7*scale, diameter, diameter);
        using var track = new Pen(Theme.Pale, 10*scale); g.DrawEllipse(track, r);
        using var arc = new Pen(Resting ? Theme.Gold : Theme.Green, 10*scale) { StartCap = LineCap.Round, EndCap = LineCap.Round };
        if (Progress > 0) g.DrawArc(arc, r, -90, (float)Math.Clamp(Progress * 360, .1, 359.99));
        using var big = Theme.Font(44, FontStyle.Bold); using var small = Theme.Font(8, FontStyle.Bold);
        TextRenderer.DrawText(g, TimeText, big, new Rectangle(0, Height / 2 - (int)(51*scale), Width, (int)(86*scale)), Theme.Ink, TextFormatFlags.HorizontalCenter | TextFormatFlags.VerticalCenter);
        TextRenderer.DrawText(g, Caption, small, new Rectangle(0, Height / 2 + (int)(35*scale), Width, (int)(28*scale)), Theme.Muted, TextFormatFlags.HorizontalCenter | TextFormatFlags.VerticalCenter);
    }
}
internal sealed class SunMark : Control
{
    internal SunMark() { Size = new Size(44,44); DoubleBuffered = true; }
    protected override void OnPaint(PaintEventArgs e)
    {
        var g=e.Graphics;g.SmoothingMode=SmoothingMode.AntiAlias;float scale=DeviceDpi/96f;g.ScaleTransform(scale,scale);float c=Width/scale/2f;
        using var p=new Pen(Theme.Gold,3) {StartCap=LineCap.Round,EndCap=LineCap.Round};
        using var b=new SolidBrush(Theme.Gold);g.FillEllipse(b,c-10,c-10,20,20);
        for(int i=0;i<8;i++){double a=i*Math.PI/4;g.DrawLine(p,c+(float)Math.Cos(a)*13,c+(float)Math.Sin(a)*13,c+(float)Math.Cos(a)*18,c+(float)Math.Sin(a)*18);}
        using var face=new Pen(Theme.Ink,1.4f);g.DrawEllipse(face,c-4,c-3,1,2);g.DrawEllipse(face,c+3,c-3,1,2);g.DrawArc(face,c-4,c,8,5,10,160);
    }
}
