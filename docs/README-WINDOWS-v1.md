# SunReminder

Ứng dụng Windows bằng C# và Windows Forms cho dự án **Nắng sớm – Mắt khỏe** của Group 4. Giao diện tiếng Việt, hoạt động ngoại tuyến, không cần tài khoản.

## Chạy ngay

1. Giải nén **toàn bộ** gói ZIP ra một thư mục.
2. Mở `App` → bấm đúp **SunReminder.exe**.
3. Chọn **Bắt đầu tập trung**.

Bản `App/SunReminder.exe` dành cho **Windows 10/11 x64**, có kèm .NET Runtime. Người sử dụng không cần cài Visual Studio hoặc .NET riêng. Đây là bản x64, không phải bản native ARM64 hay 32-bit.

Muốn có biểu tượng ngoài Desktop và Start menu: bấm **Install.cmd**. Trình cài đặt chỉ chép app vào tài khoản Windows hiện tại, không cần quyền quản trị, không tự bật khởi động cùng Windows. Hộp thoại cài/gỡ dùng tiếng Anh; giao diện app dùng tiếng Việt.

Bản phát hành sinh viên chưa có chữ ký số thương mại; Windows có thể hiển thị cảnh báo về nhà phát hành. Chỉ mở bản bạn tin cậy; không cần tắt Defender. Trên máy trường/công ty bị hạn chế chạy ứng dụng, liên hệ quản trị viên.

## Sử dụng

| Thao tác | Kết quả |
| --- | --- |
| Bắt đầu tập trung | Đếm ngược đến lần nhắc kế tiếp, mặc định 20 phút |
| Tạm dừng / Tiếp tục | Giữ và tiếp tục thời gian còn lại |
| Nghỉ ngay | Bắt đầu đếm ngược nghỉ, mặc định 20 giây |
| Bắt đầu nghỉ trong cửa sổ nhắc | Bắt đầu đếm ngược khi bạn sẵn sàng |
| Hoãn | Nhắc lại sau thời gian đã chọn, mặc định 5 phút |
| Kết thúc | Dừng chu kỳ hiện tại |
| Nút X trên cửa sổ nhắc | Hoãn; không ghi hoàn thành |
| Nút X trên cửa sổ chính | Ẩn xuống khay hệ thống nếu tùy chọn đang bật |
| Bấm đúp biểu tượng mặt trời ở khay hệ thống | Mở lại cửa sổ |
| Thoát ứng dụng | Dừng hoàn toàn lời nhắc |
| Thử thông báo | Gửi thông báo thử và cửa sổ mẫu, không sửa lịch sử hay chu kỳ |

Một lần nghỉ chỉ được ghi khi đồng hồ nghỉ chạy hết. App **không đo hoặc xác nhận hành vi nhìn xa**. Sau một lần hoàn thành, app tự bắt đầu chu kỳ tập trung mới. Các lần nghỉ chưa hoàn thành không tính vào thống kê.

## Tính năng

- Giao diện nền kem, xanh lá, đồng hồ tròn và các nút lớn.
- Bốn mục: Tập trung, Lịch sử nghỉ mắt, Cài đặt, Hướng dẫn.
- Nhắc qua Windows `NotifyIcon.ShowBalloonTip` và cửa sổ nổi tùy chọn.
- Tùy chỉnh khoảng tập trung 5–120 phút, thời gian nghỉ 20–120 giây, hoãn 1–30 phút.
- Âm thanh tùy chọn; không phát âm thanh mặc định.
- Lưu thiết lập; xem số lần và thời gian nghỉ trong ngày.
- Thống kê bảy ngày, lịch sử và xuất CSV. Màn hình hiển thị 500 lần gần nhất; CSV chứa toàn bộ.
- Check-in ngoài trời thủ công, có thể bỏ check-in.
- Lời nhắc ngoài trời hằng ngày, mặc định tắt; có thể chọn giờ.
- Khởi động cùng Windows tự nguyện, mặc định tắt; khi bật, đăng nhập sẽ chạy ẩn và tự bắt đầu chu kỳ.
- Máy ngủ/khóa sẽ ngừng phiên đang chạy. Khi máy thức và mở khóa, bắt đầu chu kỳ đầy đủ mới, không cộng thời gian ngủ thành lần nghỉ. Phiên đã tạm dừng bằng tay vẫn giữ trạng thái tạm dừng.
- Cài/gỡ theo tài khoản người dùng, shortcut Desktop và Start menu.

## Lưu ý về lời nhắc

Windows có thể chặn thông báo khi bật Không làm phiền hoặc tắt thông báo. App không tự thay đổi các cài đặt này. Cửa sổ nhắc là một kênh riêng và xuất hiện khi bạn đã bật tùy chọn đó. Lời nhắc ngoài trời chỉ xuất hiện nếu app đang chạy, máy thức và mở khóa đúng phút đã chọn; không gửi bù lịch bỏ lỡ.

Khi tắt cửa sổ nhắc, app hoãn lời nhắc. Nếu bạn tắt cửa sổ nổi trong Cài đặt, hãy bấm thông báo Windows hoặc mở app rồi bấm Bắt đầu nghỉ. Nếu bạn đổi các giá trị thời gian và lưu, chu kỳ hiện tại được đặt lại.

## Dữ liệu và gỡ cài đặt

Dữ liệu ở `%LOCALAPPDATA%\SunReminder\data.json`. Không có tài khoản, server, telemetry, theo dõi màn hình hoặc lịch sử trình duyệt. Ứng dụng không tự truyền dữ liệu ra mạng. CSV chỉ được tạo khi bạn chọn xuất.

App chép cài đặt mới qua file tạm để giảm nguy cơ dữ liệu ghi dở. Nếu JSON bị hỏng, app thử giữ bản sao `.backup-*`, báo lỗi và dùng mặc định. Có thể sao lưu thư mục này trước khi thay máy. Nút **Xóa lịch sử** cần xác nhận và giữ nguyên cài đặt.

Gỡ bản cài: thoát app → Start menu → **Uninstall SunReminder**. Gỡ sẽ xóa app, shortcut và mục tự khởi động, nhưng giữ dữ liệu. Nếu muốn xóa dữ liệu, tự xóa `%LOCALAPPDATA%\SunReminder` sau khi đã thoát app và sao lưu nếu cần. Bản portable: tắt tự khởi động trong app trước khi xóa thư mục chứa exe.

## Mã nguồn và chạy trong IDE

Yêu cầu cho người phát triển: .NET 10 SDK và Windows để chạy giao diện.

```powershell
dotnet run --project src/SunReminder.App
```

Mở `SunReminder.sln` hoặc `src/SunReminder.App/SunReminder.App.csproj` trong IDE hỗ trợ .NET 10, hoặc mở cả thư mục trong VS Code. Không dùng IntelliJ Java để build dự án C# này.

Chạy kiểm thử logic (Windows/Linux/macOS):

```powershell
dotnet run --project tests/SunReminder.Tests -c Release
```

Build bản exe kèm runtime: bấm **Build.cmd**, hoặc:

```powershell
dotnet publish src/SunReminder.App/SunReminder.App.csproj -c Release -r win-x64 --self-contained true -o App -p:EnableCompressionInSingleFile=true
```

Lần build đầu cần internet để tải gói .NET chính thức. App phát hành chạy offline. WinForms không hỗ trợ trimming trong cấu hình này; không thêm `PublishTrimmed=true`. Khi .NET có bản cập nhật bảo mật, build và phân phối lại bản self-contained.

## Cấu trúc

- `src/SunReminder.Core`: bộ đếm trạng thái, cài đặt, dữ liệu và CSV; không phụ thuộc giao diện.
- `src/SunReminder.App`: giao diện WinForms, tray, thông báo Windows, xử lý khóa/ngủ và tự khởi động.
- `tests/SunReminder.Tests`: kiểm thử hành vi thời gian và lưu trữ, không cần gói test bên ngoài.
- `scripts`: cài đặt và gỡ cài đặt theo người dùng.
- `docs`: tiêu chí nghiệm thu, phạm vi và kết quả kiểm tra.
- `App/SunReminder.exe`: bản Windows x64 đã đóng gói.

## Phạm vi dự án

App hỗ trợ thói quen và ghi nhận tương tác cho dự án 7 tuần. Truyền thông fanpage, TikTok và khảo sát Google Forms là hoạt động bên ngoài app. Không tạo đường dẫn fanpage/khảo sát giả và không tự gửi dữ liệu khảo sát.

Sản phẩm không chẩn đoán, không đo thị lực, không cam kết giảm cận thị hay một tỷ lệ giảm mỏi mắt cụ thể. Nội dung nhắc khuyến khích nhìn xa, nghỉ đều và hoạt động ngoài trời phù hợp; không nhìn trực tiếp vào mặt trời.

Nhóm: Nguyễn Văn Mẫn, Nguyễn Trần Đức Anh, Nguyễn Trần Phúc Đăng, Phan Võ Anh Hào. Phân công và đóng góp dự kiến theo proposal: 25% mỗi người.
