# SunReminder · Web/PWA 3.5 và Windows v3

Ứng dụng nhắc nghỉ mắt của **Group 4**, giao diện tiếng Việt nền kem và xanh lá, dùng trên Windows hoặc trình duyệt máy tính/điện thoại.

## Tải app đã đóng gói

Mở **[Releases — SunReminder v3.0.0](https://github.com/mannvce200244-hub/sunreminder/releases/tag/v3.0.0)**, tải file **SunReminder-v3.zip** trong Assets rồi giải nén. File này có sẵn EXE Windows và mã nguồn web. Nút **Code → Download ZIP** chỉ tải mã nguồn, không có EXE đã build. Kho hiện để riêng tư nên cần đăng nhập GitHub bằng tài khoản có quyền truy cập.

## Đưa app lên Cloudflare miễn phí

Đã bổ sung cấu hình Worker + D1 ở gốc kho. Xem **[hướng dẫn Cloudflare từng bước](docs/CLOUDFLARE.md)**. Trên màn hình tạo Worker: Build command **npm run build**, Deploy command **npx wrangler deploy**, root là gốc kho. Sau deploy, đặt Secret **SUN_ADMIN_PASSWORD** để bật quản trị và nhận thống kê. Bản ZIP v3.0.0 đã phát hành vẫn là bản Windows/web cục bộ cũ; dùng mã nguồn nhánh main cho Cloudflare.

## Mở ngay

- **Windows:** mở `App-v3/SunReminder.exe` hoặc `Launch-SunReminder.cmd`. Thoát bản cũ trong khay hệ thống trước. Bản mới tiếp tục dùng dữ liệu hiện có của cùng tài khoản Windows.
- **Web + quản trị:** cài Node.js 24 LTS, bấm `Start-Group4.cmd`. Mở `http://localhost:4173`; Group 4 đăng nhập tại `http://localhost:4173/admin`. Tài khoản được tạo riêng trên máy, xem `web/server-data/ADMIN-LOGIN.txt`.
- **Mac:** chạy `sh Start-Web.command`; dùng bản web/PWA. Không chạy EXE Windows trên Mac.
- **Điện thoại:** mở địa chỉ HTTPS sau khi triển khai, thêm app vào màn hình chính. Bản online tại https://sunreminder.group4-ssg105.workers.dev/; chưa phát hành trên các cửa hàng ứng dụng.

**[Hướng dẫn sử dụng](docs/HUONG-DAN.md)** · **[Quản trị và đưa lên mạng](docs/QUAN-TRI.md)** · **[Kiểm thử v3](docs/QA-v3.md)**

## Nâng cấp lần này

- Hết thời gian nghỉ → tự ghi **đã check-in nghỉ mắt**, đúng một lần. Hoãn, dừng hoặc gián đoạn không được tính hoàn thành.
- Tùy chọn gửi tổng hợp lịch sử theo ngày cho Group 4 trên cả Windows và web. Mặc định tắt, cần người dùng đồng ý; có ngừng gửi và xóa thống kê đã gửi.
- Trang quản trị có đăng nhập, lọc thời gian, biểu đồ, danh sách mã thiết bị và xuất CSV. Xem tổng lượt nghỉ, thời gian nghỉ, ngày hoạt động và check-in ngoài trời.
- Máy chủ Node.js + SQLite lưu dữ liệu bền vững khi cấu hình đúng ổ lưu trữ. Gửi lại không cộng trùng; mất mạng sẽ thử lại khi app đang mở.

## Dữ liệu và cách hiểu số liệu

Windows lưu lịch sử ở `%LOCALAPPDATA%\SunReminder\data.json`. Web lưu theo địa chỉ trong trình duyệt. Sao lưu JSON giữ cài đặt và lịch sử; thông tin xác thực chia sẻ được lưu riêng, không đi theo bản sao lưu.

Chỉ khi người dùng bật chia sẻ, app mới gửi số lượt nghỉ, tổng giây nghỉ và cờ check-in ngoài trời theo ngày từ toàn bộ lịch sử hiện có. Không gửi tên, email, nội dung màn hình hoặc thời điểm từng lần nghỉ. Đây là mã thiết bị ngẫu nhiên, **không phải số người duy nhất**. Một người dùng nhiều máy có thể được tính nhiều lần. Không có đồng bộ lịch sử ngược từ máy chủ về app.

Nhắc nghỉ, tạm dừng, hoãn, lịch sử, CSV, sao lưu, khay Windows và tùy chọn khởi động cùng máy được giữ. Web/PWA 3.4 giữ thời điểm hết giờ khi chuyển ứng dụng và khôi phục đồng hồ khi mở lại. Người dùng có thể bật Web Push để máy chủ nhắc phiên hiện tại khi app đóng; cần mạng và quyền thông báo. Lần nghỉ hết giờ khi app đóng được ghi check-in lúc mở lại, với thời điểm kết thúc ban đầu.

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

### Web/PWA 3.3

Thêm đăng nhập người dùng tùy chọn, tên hiển thị, tên thiết bị và GPS chỉ gửi sau khi đồng ý. Chế độ khách giữ đầy đủ đồng hồ và lịch sử. Quản trị yêu cầu đăng nhập mỗi lần mở/tải lại, tự khóa sau 10 phút không hoạt động. Xem [hướng dẫn sử dụng](docs/HUONG-DAN.md) và [triển khai Cloudflare](docs/CLOUDFLARE.md). Windows EXE v3 hiện có vẫn tương thích máy chủ; các bổ sung này nằm ở Web/PWA.

Bản 3.3 dùng một nút đăng nhập chung: group4 chuyển thẳng dashboard, người dùng ở lại app. Thêm thống kê thời gian app hiển thị theo thiết bị/ngày, có đồng ý riêng.

### Web/PWA 3.4 — nhắc khi chạy nền

Trong Cài đặt, chọn **Bật nhắc khi chạy nền**, cấp quyền, rồi bắt đầu phiên. Cloudflare Durable Object lưu đăng ký thông báo và lịch hiện tại, gửi Web Push mã hóa khi hết giờ; tạm dừng/kết thúc gửi hủy lịch. Không tự bật chia sẻ thống kê/GPS. iPhone/iPad cần cài vào Màn hình chính (iOS/iPadOS 16.4 trở lên). Thông báo có thể trễ do hệ điều hành, mạng hoặc Không làm phiền. Xem [hướng dẫn](docs/HUONG-DAN.md) và [kiểm chứng 3.4](docs/QA-v3.4.md).

### Web/PWA 3.5 — chia sẻ gọn hơn

Một biểu mẫu chung cho thống kê, thời gian app hiển thị, tên và GPS tùy chọn; một nút lưu. Không tự mở rộng lựa chọn của người dùng cũ. Giao diện người dùng tập trung vào Lịch sử với nút Xem thêm; JSON/CSV chuyển sang quản trị có kiểm tra phiên. Báo cáo JSON tổng hợp khác với sao lưu JSON lịch sử tại thiết bị, không phải bản sao database. Xem [kiểm chứng 3.5](docs/QA-v3.5.md).
