# Kiểm thử SunReminder 3.0

Ngày kiểm tra: 04/10/2026. Dữ liệu kiểm thử tách khỏi dữ liệu người dùng và máy chủ localhost:4173.

## Kết quả

- **30/30 web/API tests đạt** trên Node.js 24.11.1: logic đồng hồ, nhập/gộp lịch sử, CSV, ngày địa phương; đồng ý chia sẻ; ngừng gửi; thử lại khi mất mạng; xóa thống kê đang chờ; lỗi lưu tùy chọn; fetch trong trình duyệt; xác thực quản trị; nguồn/Host; chặn đọc file riêng tư; mã thiết bị; snapshot cũ/trùng; thu hồi chống gửi trễ; lọc ngày; CSV và giới hạn đăng nhập.
- **15/15 .NET tests đạt**: logic/data cũ cùng tổng hợp theo ngày, kiểm tra địa chỉ máy chủ, gửi thống kê có đồng ý qua HTTP handler thử nghiệm, ngừng chia sẻ và tách thông tin xác thực khỏi dữ liệu xuất.
- Xuất bản `App-v3/SunReminder.exe` thành công: Windows x64, self-contained, .NET 10, phiên bản 3.0.
- Thử thực tế trên trình duyệt tại localhost:4183: bật chia sẻ, gửi thành công; chạy Nghỉ ngay đủ 20 giây; màn hình ghi 1 check-in nghỉ mắt và 20 giây. Check-in ngoài trời vẫn tắt tới khi được bấm riêng. Quản trị đối chiếu đúng 1 lượt nghỉ, 1 ngày hoạt động, 1 ngoài trời sau khi bấm.
- Đăng nhập/đăng xuất quản trị hoạt động. Giao diện quản trị kiểm tra tại desktop và viewport 390 × 844; không tràn ngang toàn trang. Ảnh trong `Preview/admin-v3-qa.png` và `admin-v3-mobile-qa.png` chứa **dữ liệu thử**, không phải dữ liệu người dùng thật.

## Cách chạy lại

```sh
cd web
node --test tests/*.test.mjs
```

Từ thư mục SunReminder, với .NET 10 SDK:

```sh
dotnet run --project tests/SunReminder.Tests -c Release
```

API tests cần quyền mở và kết nối cổng localhost. Sandbox đã chặn socket ở lần đầu; chạy ngoài sandbox thì đạt. Node 24.11.1 phát cảnh báo experimental cho node:sqlite.

## Giới hạn kiểm chứng

- Chưa triển khai lên dịch vụ hosting thật; cần làm theo QUAN-TRI.md và kiểm tra lại URL, HTTPS, ổ dữ liệu, tài khoản sau khi deploy.
- Chưa thử trên máy Mac, iPhone hay Android thật; mới kiểm tra bố cục di động bằng viewport trình duyệt. Windows v3 đã build và kiểm thử logic, chưa nghiệm thu tương tác GUI v3 bằng công cụ native trong lượt này.
- Chưa kiểm thử tải lớn, phục hồi backup hosting, thông báo nền trên mọi hệ điều hành hoặc đánh giá bảo mật độc lập.
- Số liệu là từng thiết bị, không xác minh danh tính/hành vi và không hợp nhất nhiều thiết bị của một người.
