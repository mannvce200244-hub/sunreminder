# Group 4 — Quản trị và đưa SunReminder lên mạng

## 1. Chạy trên máy của nhóm

Cài **Node.js 24 LTS** từ [nodejs.org](https://nodejs.org/). Trên Windows bấm `Start-Group4.cmd`. Trên Mac chạy `sh Start-Web.command`. Hoặc mở terminal trong `web`:

```sh
node setup-admin.mjs
node server.mjs
```

Giữ cửa sổ server mở. App: `http://localhost:4173`. Quản trị: `http://localhost:4173/admin`. Tên đăng nhập **group4**; mật khẩu ngẫu nhiên riêng của máy nằm trong `web/server-data/ADMIN-LOGIN.txt`. Chỉ chia sẻ mật khẩu trong nội bộ bốn thành viên. Không gửi thư mục `server-data` cho người dùng hay đẩy lên GitHub.

Tài khoản đã có sẽ được giữ khi chạy lại script. Muốn tạo mật khẩu mới: dừng server, chạy `node setup-admin.mjs --reset`, mở lại server; phiên đăng nhập cũ hết hiệu lực. Nếu đang dùng biến `SUN_ADMIN_PASSWORD`, hãy đổi biến đó trên dịch vụ hosting rồi khởi động lại; biến này ưu tiên hơn file cục bộ. Phiên quản trị chỉ giữ trong bộ nhớ của trang: tải lại, mở lại hoặc rời trang cần đăng nhập lại. Tự khóa sau 10 phút không thao tác; máy chủ giới hạn mỗi phiên tối đa 30 phút. Cookie cũ không còn được dùng để đăng nhập. Có giới hạn lần đăng nhập sai.

`localhost` chỉ dùng trên máy đang chạy server. Điện thoại hoặc máy người khác cần địa chỉ HTTPS công khai. Không cần mua tên miền riêng để bắt đầu.

## 2. Cho phép gửi thống kê

**Web:** mở app cùng địa chỉ máy chủ → Cài đặt → đọc phần chia sẻ → tích đồng ý → Bật chia sẻ. **Windows:** Cài đặt → nhập địa chỉ máy chủ (thử trên cùng máy: `http://localhost:4173`; dùng thật: URL HTTPS) → tích đồng ý → Bật chia sẻ. Dùng URL gốc, không thêm `/admin` hay `/api`.

Khi đồng hồ nghỉ đếm hết, app ghi check-in nghỉ mắt và gửi bản tổng hợp mới nếu đang chia sẻ. Đang mất mạng thì lịch sử vẫn lưu trên thiết bị; mở app khi có mạng để gửi lại. Có nút **Gửi ngay**. Không tự đánh dấu ngoài trời khi chỉ hoàn thành nghỉ mắt.

- Chia sẻ mặc định tắt và không bắt buộc để dùng đồng hồ.
- Gửi toàn bộ lịch sử hiện tại dạng tổng hợp theo ngày: ngày, số lần nghỉ, tổng giây nghỉ, có/không check-in ngoài trời. Kèm mã thiết bị ngẫu nhiên, loại app và phiên bản đồng ý.
- Máy chủ lưu thời điểm đồng ý/cập nhật để quản lý việc nhận dữ liệu. App không gửi email, ảnh hoặc thời điểm từng lần nghỉ. Web/PWA có thể gửi thêm tên hiển thị, tên thiết bị và một vị trí GPS khi người dùng đồng ý riêng và bấm Lưu & gửi thông tin. Vị trí không tự cập nhật, không xác minh check-in; có sai số. Nhà cung cấp hosting có thể có nhật ký truy cập riêng.
- **Ngừng chia sẻ** dừng lần gửi mới, giữ số liệu đã gửi. **Xóa thống kê đã gửi** yêu cầu máy chủ xóa số liệu của mã thiết bị đó, giữ lịch sử trên máy. Khi offline, yêu cầu xóa chờ đến lúc app có mạng. Máy chủ giữ mã thu hồi tối thiểu để chặn gói gửi trễ khôi phục dữ liệu.
- Nhập/xóa lịch sử khi còn chia sẻ sẽ cập nhật lại bản tổng hợp trên server. Xóa dữ liệu trình duyệt trước khi thu hồi có thể làm mất khóa để yêu cầu xóa; nên thu hồi trước.
- Không có thời hạn tự xóa hiện tại: thống kê được giữ tới khi người dùng thu hồi hoặc nhóm xử lý dữ liệu máy chủ. Bản sao lưu của nhóm cần được quản lý/xóa tương ứng.

## 3. Đọc trang quản trị

Chọn khoảng ngày rồi bấm xem, hoặc dùng 7 ngày / 7 tuần. Danh sách tìm theo tên hiển thị, tên thiết bị hoặc mã đối chiếu; CSV xuất cùng khoảng ngày, kèm thông tin tên/vị trí được chia sẻ gần nhất. Tọa độ không đại diện vị trí tại từng check-in. Bấm Mở Google Maps sẽ gửi tọa độ cho Google.

| Chỉ số | Ý nghĩa |
|---|---|
| Lượt nghỉ mắt | Tổng số đồng hồ nghỉ đã hoàn thành |
| Ngày hoạt động | Tổng ngày có nghỉ hoặc check-in ngoài trời của từng thiết bị; hai máy cùng hoạt động một ngày tính hai |
| Check-in ngoài trời | Mỗi thiết bị tối đa một lần mỗi ngày, tự đánh dấu |
| Thiết bị hoạt động | Mã thiết bị có hoạt động trong khoảng chọn |
| Ngày lịch có hoạt động | Số ngày khác nhau có hoạt động trong toàn nhóm |

Ngày được tính theo giờ địa phương tại thiết bị. Không suy ra số người duy nhất, không dùng số liệu như bằng chứng người dùng thực sự nghỉ mắt/ra ngoài. Cùng lịch sử nhập trên hai máy rồi cùng chia sẻ có thể được tính ở cả hai thiết bị. Tài khoản người dùng là tùy chọn để lưu tên hiển thị; hiện chưa hợp nhất lịch sử hay số liệu nhiều máy.

## 4. Đưa lên Render: một máy chủ có ổ lưu trữ

Đây là hướng dẫn triển khai; bản giao chưa được đăng lên mạng. Render cung cấp URL `https://ten-dich-vu.onrender.com`. Với SQLite phải chọn **Web Service có Persistent Disk**; gói miễn phí không hỗ trợ ổ này. Kiểm tra giá hiện tại trước khi chọn dịch vụ. Nguồn: [Persistent Disks](https://render.com/docs/disks), [Free instances](https://render.com/docs/free).

1. Tạo kho Git riêng của nhóm. Đưa thư mục `SunReminder` vào kho; dùng `.gitignore` đi kèm. Kiểm tra không có `server-data`, `ADMIN-LOGIN.txt`, file `.env` hoặc dữ liệu người dùng trong lịch sử Git.
2. Trên Render tạo **New → Web Service**, kết nối kho. Chọn runtime **Node**, Root Directory là `web` nếu README của SunReminder ở gốc kho; nếu kho chứa thư mục SunReminder thì đặt `SunReminder/web`.
3. Build Command: `node --version`. Start Command: `node server.mjs`. Chỉ chạy **một instance**.
4. Gắn Persistent Disk tại `/var/data`. Thiết lập các biến dưới đây trong phần Environment (không viết mật khẩu vào mã nguồn).

| Biến | Giá trị |
|---|---|
| `NODE_VERSION` | `24` |
| `HOST` | `0.0.0.0` |
| `DATA_DIR` | `/var/data/sunreminder` |
| `PUBLIC_ORIGIN` | URL HTTPS thực của dịch vụ, ví dụ `https://ten-dich-vu.onrender.com`, không có đường dẫn |
| `SUN_ADMIN_PASSWORD` | Mật khẩu riêng dài ít nhất 16 ký tự; nên dùng chuỗi ngẫu nhiên dài |

Render cung cấp `PORT`; không cố định 4173 trên hosting. Nếu lúc tạo chưa biết URL, lấy URL được cấp rồi cập nhật `PUBLIC_ORIGIN` và triển khai lại trước khi chia sẻ. Tên đăng nhập vẫn là **group4**. Khi dùng mật khẩu qua Environment, không cần chạy setup-admin trên cloud.

5. Sau triển khai, mở URL app và `/admin`. Đăng nhập, kiểm tra ban đầu không có dữ liệu thử. Trên một thiết bị thử: bật chia sẻ, chạy **Nghỉ ngay** đủ 20 giây trong khi app hiển thị, kiểm tra quản trị có 1 lượt nghỉ; bấm gửi lại phải vẫn là 1. Đánh dấu ngoài trời và kiểm tra chỉ số riêng.
6. Tắt chia sẻ, hoàn thành thêm một lần nghỉ và kiểm tra server chưa tăng. Bật lại để gửi bù. Chỉ sau các bước này mới gửi URL cho người tham gia.

Bản này dùng SQLite cho nhóm nhỏ và một server. Không triển khai vào Static Site, GitHub Pages hoặc dịch vụ chỉ phục vụ file tĩnh nếu cần thu thống kê. Không chạy nhiều bản sao server dùng ổ dữ liệu riêng vì số liệu sẽ bị tách. Nếu đổi domain, cập nhật PUBLIC_ORIGIN; web trên địa chỉ mới có vùng lưu cục bộ mới nên sao lưu JSON trước. Windows cần cập nhật máy chủ sau khi thu hồi ở địa chỉ cũ.

## 5. Sao lưu và vận hành

- Server chỉ phục vụ danh sách file công khai cho phép; API quản trị cần phiên đăng nhập. Không bật directory listing hoặc đưa toàn bộ thư mục dữ liệu lên static hosting.
- Dữ liệu tập trung nằm trong `DATA_DIR/statistics.sqlite`. Khi tự quản lý máy chủ: dừng server sạch, sao chép **toàn bộ DATA_DIR** vào nơi riêng tư, sau đó khởi động lại. Không sao chép riêng file SQLite đang có ghi vì còn journal/WAL. Khôi phục khi server đã dừng và giữ quyền truy cập riêng cho tài khoản chạy server.
- Trên hosting, dùng snapshot/backup Persistent Disk theo hướng dẫn nhà cung cấp và thử khôi phục trước khi dựa vào nó. Xuất CSV chỉ là báo cáo, không thay bản sao lưu database.
- Bản sao lưu thư mục máy chủ có thể chứa cấu hình xác thực và mật khẩu cục bộ. Chỉ Group 4 được truy cập, không đưa vào ZIP gửi người tham gia.
- Có giới hạn đăng nhập/gửi dữ liệu cơ bản. Sau reverse proxy, nhiều thiết bị có thể chung IP trong giới hạn chống lạm dụng; triển khai này phù hợp thử nghiệm nhóm nhỏ, chưa kiểm thử tải lớn hoặc đánh giá bảo mật độc lập.
- Sau mỗi cập nhật web, tăng CACHE trong `sw.js`. Đóng hết cửa sổ app cũ rồi mở lại để nhận bản mới. API và trang quản trị không lưu trong cache ngoại tuyến.

## 6. Khắc phục nhanh

- **Không bật chia sẻ được:** kiểm tra server đang chạy, đã có tài khoản quản trị và URL chính xác; dùng Node.js 24 LTS.
- **Unexpected host / 421:** địa chỉ đang mở khác `PUBLIC_ORIGIN`. Dùng đúng domain, protocol, cổng đã cấu hình.
- **503:** chưa cấu hình tài khoản quản trị. Chạy setup-admin rồi khởi động lại, hoặc cấu hình SUN_ADMIN_PASSWORD trên hosting.
- **429:** đang bị giới hạn số yêu cầu/đăng nhập, chờ rồi thử lại.
- **Mất thống kê sau triển khai:** kiểm tra DATA_DIR nằm trong Persistent Disk, không phải ổ tạm của container.
- **Quản trị trống:** kiểm tra khoảng ngày, người dùng đã bật chia sẻ và app báo gửi thành công. Dữ liệu localhost không tự chuyển lên cloud.

## Đăng nhập chung và thời gian sử dụng (Web/PWA 3.3)

Trang chính chỉ có nút **Đăng nhập**. Tài khoản **group4** được máy chủ xác thực rồi chuyển vào dashboard; tài khoản người dùng vào app. Không chọn vai trò ở giao diện. Chuyển trang dùng cookie HttpOnly giới hạn 60 giây, được đổi đúng một lần lấy phiên trong bộ nhớ. Đây không phải cookie nhớ đăng nhập: tải lại dashboard sau khi đã nhận phiên cần đăng nhập lại. Đường dẫn /admin vẫn có biểu mẫu khi mở trực tiếp.

Thời gian sử dụng là số giây app hiển thị, chỉ ghi sau khi người dùng đồng ý riêng. Xem tổng thời gian, từng thiết bị, theo ngày hoặc CSV trong cùng khoảng ngày. Số ngày có check-in vẫn giữ nghĩa cũ; mở app không tự tạo check-in. Thời gian cộng theo thiết bị, chưa hợp nhất một người dùng nhiều máy.
