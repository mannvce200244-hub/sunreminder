# Phạm vi và nghiệm thu SunReminder 1.0

## Đối chiếu proposal

| Tiêu chí | Cách triển khai |
| --- | --- |
| C# Windows Forms | App .NET 10, không dùng thư viện giao diện ngoài |
| Dễ sử dụng | Giao diện tiếng Việt, nút bắt đầu/tạm dừng/hoãn, đồng hồ lớn |
| Tích hợp thông báo hệ thống | NotifyIcon và ShowBalloonTip; menu khay hệ thống |
| Cửa sổ nhắc tùy chọn | Bắt đầu nghỉ, hoãn, đóng để hoãn; có bản thử |
| Hoạt động offline | Không có API mạng, không cần tài khoản/server |
| Cài đặt trên Windows | EXE tự chứa runtime, installer theo người dùng và shortcut |
| Lưu tùy chọn | JSON trong LocalApplicationData, ghi qua file tạm |
| Tự khởi động tự nguyện | Checkbox, mặc định tắt; Registry CurrentUser Run |
| Máy ngủ/khóa | Ngừng phiên đang chạy; bắt đầu chu kỳ đầy đủ khi dùng lại |
| Đánh giá trong 7 tuần | Có lịch sử và CSV; khảo sát và truyền thông thực hiện bên ngoài app |
| Quyền riêng tư | Không ghi màn hình, không đọc trình duyệt, không upload tự động |

## Đã kiểm tra trong môi trường tạo bản phát hành

- Restore và compile mã C# cho Windows thành công; build Release không có cảnh báo/lỗi.
- Publish thành EXE Windows x64 tự chứa .NET Runtime thành công.
- Kiểm tra định dạng EXE: PE32+ GUI x86-64.
- 12 kiểm thử hành vi core đã chạy và đạt. Xem test-results.txt.
- Kiểm tra gói ZIP không chứa bin/obj của project, bộ SDK, dữ liệu người dùng hay dữ liệu test.

**Chưa được kiểm tra trực tiếp trên Windows:** bố cục WinForms thực tế, thông báo Windows, DPI, quyền tự khởi động và script cài/gỡ. Môi trường tạo bản phát hành là Linux. Thành công khi compile không đồng nghĩa các hành vi tích hợp Windows đã được nghiệm thu.

## Kiểm tra trên máy Windows trước khi trình diễn

Các mục dưới đây là danh sách cần chạy, chưa được đánh dấu đã đạt:

1. Giải nén, chạy App/SunReminder.exe trên Windows 10/11 x64 không cài .NET.
2. Kiểm tra tiếng Việt, điều hướng Tab, các trang và thanh cuộn tại DPI 100%, 125%, 150%, 200%; cửa sổ nhỏ nhất và khi phóng to.
3. Bắt đầu → Tạm dừng → chờ → Tiếp tục: thời gian tạm dừng không bị trừ.
4. Bấm Nghỉ ngay, chờ hết 20 giây: tăng đúng một lần và tự bắt đầu chu kỳ mới.
5. Trong lần nghỉ khác, bấm Hoãn hoặc X: không tăng lịch sử.
6. Thử thông báo không làm tăng lịch sử hay đặt lại đồng hồ đang chạy.
7. Bật/tắt cửa sổ nhắc; kiểm tra khi Windows bật Không làm phiền. Không giả định mọi máy sẽ hiện balloon.
8. Bấm X cửa sổ chính, app tiếp tục trong khay; mở lại bằng biểu tượng. Chọn Thoát thì hết chạy.
9. Đang nghỉ → khóa máy/ngủ → chờ quá 20 giây → mở lại: không ghi hoàn thành; bắt đầu chu kỳ đầy đủ mới.
10. Đang tạm dừng bằng tay → ngủ/mở lại: vẫn tạm dừng.
11. Đổi và lưu thời gian, khởi động lại app: cài đặt giữ nguyên.
12. Chọn tự khởi động, đăng xuất/đăng nhập: app chạy ẩn và bắt đầu. Tắt tùy chọn rồi kiểm tra không tự chạy.
13. Bật nhắc ngoài trời ở một phút sắp tới: gửi một lần trong ngày; không gửi khi máy khóa/ngủ. Hoạt động ngoại tuyến.
14. Xuất CSV, mở bằng Excel; đối chiếu giờ, ngày và số lần. Xóa lịch sử có hộp xác nhận, không xóa cài đặt.
15. Install.cmd tạo shortcut. Gỡ cài đặt xóa app/shortcut/mục startup nhưng giữ dữ liệu. Nếu app đang chạy, installer yêu cầu thoát trước, không ép tắt.

Đối với phần đánh giá dự án, các bộ đếm là số lần đếm ngược và check-in tự khai. Không dùng chúng như bằng chứng đo lường thị lực, mức độ cận hoặc hiệu quả điều trị.
