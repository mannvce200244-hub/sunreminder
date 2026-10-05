# SunReminder 3.0 · Nắng sớm, mắt khỏe

Ứng dụng nhắc nghỉ mắt của **Group 4**, giao diện tiếng Việt nền kem và xanh lá, dùng trên Windows hoặc trình duyệt máy tính/điện thoại.

## Tải app đã đóng gói

Mở **[Releases — SunReminder v3.0.0](https://github.com/mannvce200244-hub/sunreminder/releases/tag/v3.0.0)**, tải file **SunReminder-v3.zip** trong Assets rồi giải nén. File này có sẵn EXE Windows và mã nguồn web. Nút **Code → Download ZIP** chỉ tải mã nguồn, không có EXE đã build. Kho hiện để riêng tư nên cần đăng nhập GitHub bằng tài khoản có quyền truy cập.

## Mở ngay

- **Windows:** mở `App-v3/SunReminder.exe` hoặc `Launch-SunReminder.cmd`. Thoát bản cũ trong khay hệ thống trước. Bản mới tiếp tục dùng dữ liệu hiện có của cùng tài khoản Windows.
- **Web + quản trị:** cài Node.js 24 LTS, bấm `Start-Group4.cmd`. Mở `http://localhost:4173`; Group 4 đăng nhập tại `http://localhost:4173/admin`. Tài khoản được tạo riêng trên máy, xem `web/server-data/ADMIN-LOGIN.txt`.
- **Mac:** chạy `sh Start-Web.command`; dùng bản web/PWA. Không chạy EXE Windows trên Mac.
- **Điện thoại:** mở địa chỉ HTTPS sau khi triển khai, thêm app vào màn hình chính. Gói này chưa được đăng lên mạng hay các cửa hàng ứng dụng.

**[Hướng dẫn sử dụng](docs/HUONG-DAN.md)** · **[Quản trị và đưa lên mạng](docs/QUAN-TRI.md)** · **[Kiểm thử v3](docs/QA-v3.md)**

## Nâng cấp lần này

- Hết thời gian nghỉ → tự ghi **đã check-in nghỉ mắt**, đúng một lần. Hoãn, dừng hoặc gián đoạn không được tính hoàn thành.
- Tùy chọn gửi tổng hợp lịch sử theo ngày cho Group 4 trên cả Windows và web. Mặc định tắt, cần người dùng đồng ý; có ngừng gửi và xóa thống kê đã gửi.
- Trang quản trị có đăng nhập, lọc thời gian, biểu đồ, danh sách mã thiết bị và xuất CSV. Xem tổng lượt nghỉ, thời gian nghỉ, ngày hoạt động và check-in ngoài trời.
- Máy chủ Node.js + SQLite lưu dữ liệu bền vững khi cấu hình đúng ổ lưu trữ. Gửi lại không cộng trùng; mất mạng sẽ thử lại khi app đang mở.

## Dữ liệu và cách hiểu số liệu

Windows lưu lịch sử ở `%LOCALAPPDATA%\SunReminder\data.json`. Web lưu theo địa chỉ trong trình duyệt. Sao lưu JSON giữ cài đặt và lịch sử; thông tin xác thực chia sẻ được lưu riêng, không đi theo bản sao lưu.

Chỉ khi người dùng bật chia sẻ, app mới gửi số lượt nghỉ, tổng giây nghỉ và cờ check-in ngoài trời theo ngày từ toàn bộ lịch sử hiện có. Không gửi tên, email, nội dung màn hình hoặc thời điểm từng lần nghỉ. Đây là mã thiết bị ngẫu nhiên, **không phải số người duy nhất**. Một người dùng nhiều máy có thể được tính nhiều lần. Không có đồng bộ lịch sử ngược từ máy chủ về app.

Nhắc nghỉ, tạm dừng, hoãn, lịch sử, CSV, sao lưu, khay Windows và tùy chọn khởi động cùng máy được giữ. Web cần mở và màn hình hoạt động để bộ đếm chạy; không có thông báo đẩy khi đóng app. Lần nghỉ đang dở khi trang bị ẩn không được tính hoàn thành.

## Nhóm thực hiện — Group 4

- **Nguyễn Văn Mẫn — Leader (Trưởng nhóm)**
- Nguyễn Trần Đức Anh
- Nguyễn Trần Phúc Đăng
- Phan Võ Anh Hào

## Phát triển

Windows cần .NET 10 SDK; chạy `Build.cmd` để kiểm thử và xuất bản vào `App-v3`. Web cần **Node.js 24 LTS**, không cần npm install:

```sh
cd web
node --test tests/*.test.mjs
node setup-admin.mjs
node server.mjs
```

`src/SunReminder.Core` giữ engine và mô hình lịch sử cũ, bổ sung bộ gửi thống kê. `web` chứa PWA, API và quản trị. Không công khai `server-data`, mật khẩu, SQLite, thư mục thử nghiệm hoặc file `.env`. Chỉ chia sẻ gói `SunReminder-v3.zip` đã loại các file riêng tư; những bản EXE cũ vẫn được giữ trong workspace, không nằm trong ZIP v3.

SunReminder hỗ trợ thói quen; số liệu thể hiện bộ đếm hoàn thành và check-in tự đánh dấu, không xác minh hành vi thực tế.

